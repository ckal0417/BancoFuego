import { IMapeoCuentaRedBancaria } from "../../../../Application/Ports/Transferencias/Interbancaria/IMapeoCuentaBancaria";
import {
    IRedBancariaClient,
    ResultadoTransferenciaInterbancaria,
    SolicitudTransferenciaInterbancaria
} from "../../../../Application/Ports/Transferencias/Interbancaria/IRedBancariaClient";


/**
 * Adapter real que traduce entre el dominio de BancoFuego y la API HTTP
 * de la red interbancaria (ISC ATM Integrator).
 *
 * ESTADO ACTUAL: la traducción de contratos está completa, pero la
 * llamada HTTP real y la autenticación (Fase 0/1) siguen pendientes.
 * Los puntos marcados con TODO-FASE1 son los que faltan resolver una vez
 * tengamos URL confirmada, csrf-token, y credenciales/API key.
 *
 * Preguntas abiertas para el grupo que administra la red (anotar
 * respuesta acá cuando se confirmen):
 *   - ¿"source_bank" es realmente un enum fijo (bank_a/bank_b) o un
 *     string libre por banco participante?
 *   - Cuando una Transaction queda en state "cancelled", ¿cómo se
 *     obtiene el motivo/código de rechazo? El schema Transaction no
 *     trae ese campo.
 */
export class RedBancariaHttpClient implements IRedBancariaClient {
    constructor(
        private readonly baseUrl: string,
        private readonly mapeoCuentas: IMapeoCuentaRedBancaria
        // TODO-FASE1: agregar acá un IProveedorAutenticacionRed que
        // resuelva api-key + csrf-token, inyectado por constructor.
    ) {}

    public async enviarTransferencia(
        solicitud: SolicitudTransferenciaInterbancaria
    ): Promise<ResultadoTransferenciaInterbancaria> {
        // El correlation_id lo elegimos nosotros: así no dependemos de
        // que la red nos devuelva algo consultable después.
        const correlationId = this.generarCorrelationId(solicitud);

        const accountIdOrigen = await this.mapeoCuentas.resolverAccountIdRed(
            solicitud.numeroCuentaOrigen
        );
        const accountIdDestino = await this.mapeoCuentas.resolverAccountIdRed(
            solicitud.numeroCuentaDestino
        );

        const body = {
            from_account_id: accountIdOrigen,
            to_account_id: accountIdDestino,
            // Asumimos que Dinero expone el monto en centavos como
            // entero. Ajustar el nombre del método al real de tu VO.
            amount: solicitud.monto.toNumber(),
            description: solicitud.concepto ?? "Transferencia interbancaria",
            source_bank: solicitud.bancoOrigen,
            correlation_id: correlationId
        };

        // TODO-FASE1: reemplazar esto por el fetch real, con headers
        // x-api-version, x-csrf-token y Authorization/x-api-key.
        //
        // const respuesta = await fetch(`${this.baseUrl}/transactions/transfer`, {
        //     method: "POST",
        //     headers: {
        //         "Content-Type": "application/json",
        //         "x-api-version": "1",
        //         "x-csrf-token": await this.proveedorAuth.obtenerCsrfToken(),
        //         "x-api-key": await this.proveedorAuth.obtenerApiKey(),
        //     },
        //     body: JSON.stringify(body),
        // });
        //
        // if (!respuesta.ok) {
        //     const error = await respuesta.json(); // ApiResponseError
        //     return {
        //         estado: "RECHAZADA",
        //         codigoError: error.code,
        //         mensaje: error.message,
        //     };
        // }
        //
        // const { data: transacciones } = await respuesta.json(); // Transaction[]
        // return this.interpretarRespuestaTransferencia(transacciones, correlationId);

        throw new Error(
            "RedBancariaHttpClient.enviarTransferencia: pendiente de " +
            "Fase 1 (autenticación). Traducción de contrato lista, " +
            "falta conectar la llamada HTTP real."
        );
    }

    public async consultarEstado(
        referenciaExterna: string
    ): Promise<ResultadoTransferenciaInterbancaria> {
        // referenciaExterna acá ES nuestro correlation_id (ver nota en
        // enviarTransferencia), así que consultamos por ese campo.

        // TODO-FASE1: reemplazar por el fetch real.
        //
        // const respuesta = await fetch(
        //     `${this.baseUrl}/transactions?correlation_id=${referenciaExterna}&page=1&limit=10`,
        //     { headers: { "x-api-version": "1", "x-api-key": ... } }
        // );
        // const { data: transacciones } = await respuesta.json();
        // return this.interpretarRespuestaTransferencia(transacciones, referenciaExterna);

        throw new Error(
            "RedBancariaHttpClient.consultarEstado: pendiente de Fase 1 " +
            "(autenticación). Traducción de contrato lista, falta " +
            "conectar la llamada HTTP real."
        );
    }

    /**
     * Traduce el array de Transaction que devuelve la red hacia nuestro
     * ResultadoTransferenciaInterbancaria. Separado en método propio
     * porque lo usan tanto enviarTransferencia como consultarEstado.
     */
    private interpretarRespuestaTransferencia(
        transacciones: Array<{ state: string }>,
        correlationId: string
    ): ResultadoTransferenciaInterbancaria {
        if (transacciones.length === 0) {
            throw new Error(
                `La red no devolvió transacciones para correlation_id ` +
                `${correlationId}. Respuesta inesperada.`
            );
        }

        const estados = new Set(transacciones.map((t) => t.state));
        if (estados.size > 1) {
            // No debería pasar (débito y crédito de la misma operación
            // deberían compartir estado), pero lo dejamos explícito por
            // si la red se comporta distinto a lo esperado.
            throw new Error(
                `Transacciones con estados inconsistentes para ` +
                `correlation_id ${correlationId}: ${[...estados].join(", ")}`
            );
        }

        const estado = transacciones[0].state;

        switch (estado) {
            case "success":
                return {
                    estado: "ACEPTADA",
                    referenciaExterna: correlationId
                };
            case "pending":
                return {
                    estado: "PENDIENTE",
                    referenciaExterna: correlationId
                };
            case "cancelled":
                return {
                    estado: "RECHAZADA",
                    // TODO-FASE1: la red no expone un código de motivo
                    // en la Transaction. Confirmar con el grupo
                    // administrador cómo se obtiene el detalle real.
                    codigoError: "RECHAZADA_POR_RED",
                    mensaje: "La red interbancaria canceló la transacción."
                };
            default:
                throw new Error(
                    `Estado de transacción no reconocido: "${estado}"`
                );
        }
    }

    private generarCorrelationId(
        solicitud: SolicitudTransferenciaInterbancaria
    ): string {
        // Placeholder simple. Ajustar para usar el id real de la
        // TransferenciaInterbancaria del dominio si está disponible en
        // el punto donde se invoca este cliente.
        return `${solicitud.bancoOrigen}-${solicitud.numeroCuentaOrigen}-${Date.now()}`;
    }
}