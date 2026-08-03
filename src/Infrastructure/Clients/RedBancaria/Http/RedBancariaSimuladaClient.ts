import { createHmac } from "node:crypto";
import { TransaccionRedBancariaDto } from "../../../../Application/DTOs/Transferencias/Interbancaria/TransaccionRedBancariaDto";
import {
    IRedBancariaClient,
    ResultadoTransferenciaInterbancaria,
    SolicitudTransferenciaInterbancaria
} from "../../../../Application/Ports/Transferencias/Interbancaria/IRedBancariaClient";
import { CorrelationId } from "../../../../Domain/ValueObjects/CorrelationId";

// Códigos especiales utilizados solamente para pruebas.
const BANCO_TEST_RECHAZO_INMEDIATO = "BANCO_TEST_RECHAZO";
const BANCO_TEST_PENDIENTE_LUEGO_ACEPTA = "BANCO_TEST_PENDIENTE_ACEPTA";
const BANCO_TEST_PENDIENTE_LUEGO_RECHAZA = "BANCO_TEST_PENDIENTE_RECHAZA";
const BANCO_TEST_PENDIENTE_INDEFINIDO = "BANCO_TEST_TIMEOUT";
type EscenarioPendiente =
    | "LUEGO_ACEPTA"
    | "LUEGO_RECHAZA"
    | "INDEFINIDO";
interface CallbackInterbancario {
    referenciaExterna: string;
    estado: "ACEPTADA" | "RECHAZADA";
    codigoError?: string;
    mensaje?: string;
}
export class RedBancariaSimuladaClient
implements IRedBancariaClient {

    private readonly transferenciasEntrantesPendientes: TransaccionRedBancariaDto[] = [];
    private readonly pendientesEnCurso = new Map<string, EscenarioPendiente>();

    constructor(
        private readonly webhookSecret: string,
        private readonly retrasoWebhookMs: number = 3000
    ) {
        if (
            !webhookSecret ||
            webhookSecret.trim().length === 0
        ) {
            throw new Error(
                "El secreto del webhook es obligatorio para la red simulada"
            );
        }
    }
    public async obtenerTransferenciasEntrantesPendientes(): Promise<readonly TransaccionRedBancariaDto[]> {
        return [
            ...this.transferenciasEntrantesPendientes
        ];
    }
    public async confirmarTransferenciaEntrantesProcesada(
        correlationId: CorrelationId
    ): Promise<void> {
        const indice =
            this.transferenciasEntrantesPendientes.findIndex(
                transferencia => transferencia.correlationId === correlationId.toString()
            );

        if (indice >= 0) {
            this.transferenciasEntrantesPendientes.splice(
                indice,
                1
            );
        }
    }
    public agregarTransferenciaEntrante(
        transferencia: TransaccionRedBancariaDto
    ): void {
        this.transferenciasEntrantesPendientes.push(
            transferencia
        );
    }

    public async enviarTransferencia(
        solicitud: SolicitudTransferenciaInterbancaria
    ): Promise<ResultadoTransferenciaInterbancaria> {
        const referenciaExterna = this.generarReferenciaExterna();
        switch (solicitud.bancoDestino) {
            case BANCO_TEST_RECHAZO_INMEDIATO:
                return {
                    estado: "RECHAZADA",
                    codigoError: "CUENTA_DESTINO_NO_EXISTE",
                    mensaje: "Rechazo simulado: la cuenta destino no existe en el banco receptor."
                };

            case BANCO_TEST_PENDIENTE_LUEGO_ACEPTA:
                this.pendientesEnCurso.set(
                    referenciaExterna,
                    "LUEGO_ACEPTA"
                );

            this.programarWebhook(
                solicitud.callbackUrl,
                {
                    referenciaExterna,
                    estado: "ACEPTADA",
                    mensaje: "Transferencia confirmada mediante webhook por la red simulada."
                }
            );

                return {
                    estado: "PENDIENTE",
                    referenciaExterna,
                    mensaje: "Transferencia en proceso en la red simulada."
                };

            case BANCO_TEST_PENDIENTE_LUEGO_RECHAZA:
                this.pendientesEnCurso.set(
                    referenciaExterna,
                    "LUEGO_RECHAZA"
                );

                this.programarWebhook(
                    solicitud.callbackUrl,
                    {
                        referenciaExterna,
                        estado: "RECHAZADA",
                        codigoError:"RECHAZO_DIFERIDO_SIMULADO",
                        mensaje: "La red simulada rechazó la transferencia después de revisarla."
                    }
                );

                return {
                    estado: "PENDIENTE",
                    referenciaExterna,
                    mensaje: "Transferencia en proceso en la red simulada."
                };

            case BANCO_TEST_PENDIENTE_INDEFINIDO:
                this.pendientesEnCurso.set(
                    referenciaExterna,
                    "INDEFINIDO"
                );

                return {
                    estado: "PENDIENTE",
                    referenciaExterna,
                    mensaje: "Transferencia pendiente indefinidamente para probar el polling."
                };

            default:
                return {
                    estado: "ACEPTADA",
                    referenciaExterna,
                    mensaje: `Transferencia aprobada hacia el banco ${solicitud.bancoDestino}.`
                };
        }
    }

    public async consultarEstado(
        referenciaExterna: string
    ): Promise<ResultadoTransferenciaInterbancaria> {
        const escenario =
            this.pendientesEnCurso.get(
                referenciaExterna
            );

        if (
            !escenario || escenario === "INDEFINIDO"
        ) {
            return {
                estado: "PENDIENTE",
                referenciaExterna,
                mensaje: "Transferencia aún en proceso en la red simulada."
            };
        }

        this.pendientesEnCurso.delete(
            referenciaExterna
        );

        if (escenario === "LUEGO_ACEPTA") {
            return {
                estado: "ACEPTADA",
                referenciaExterna,
                mensaje: "Transferencia confirmada por la red simulada."
            };
        }

        return {
            estado: "RECHAZADA",
            codigoError: "RECHAZO_DIFERIDO_SIMULADO",
            mensaje: "La red simulada rechazó la transferencia después de revisarla."
        };
    }

    private programarWebhook(
        callbackUrl: string,
        body: CallbackInterbancario
    ): void {
        setTimeout(() => {
            void this.enviarWebhook(
                callbackUrl,
                body
            );
        }, this.retrasoWebhookMs);
    }

    private async enviarWebhook(
        callbackUrl: string,
        body: CallbackInterbancario
    ): Promise<void> {
        try {
            const timestamp = new Date().toISOString();
            const contenidoFirmado = `${timestamp}.${JSON.stringify(body)}`;
            const firma =
                createHmac(
                    "sha256",
                    this.webhookSecret
                )
                .update(
                    contenidoFirmado,
                    "utf8"
                )
                .digest("hex");

            const respuesta = await fetch(callbackUrl, {

                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Webhook-Signature": firma,
                    "X-Webhook-Timestamp": timestamp
                },
                body: JSON.stringify(body)
            });

            if (!respuesta.ok) {

                const contenidoRespuesta = await respuesta.text();
                console.error(
                    `[RED SIMULADA] El webhook fue rechazado. ` +
                    `HTTP ${respuesta.status}. ` +
                    contenidoRespuesta
                );
                return;
            }

            console.log(
                `[RED SIMULADA] Webhook enviado correctamente ` +
                `para ${body.referenciaExterna}.`
            );

            this.pendientesEnCurso.delete(
                body.referenciaExterna
            );
        } catch (error) {
            console.error(
                "[RED SIMULADA] No se pudo enviar el webhook:",
                error
            );
        }
    }

    private generarReferenciaExterna(): string {
        return (
            `EXT-${Date.now()}-` +
            `${Math.random()
            .toString(36)
            .slice(2, 10)
            .toUpperCase()}`
        );
    }
}