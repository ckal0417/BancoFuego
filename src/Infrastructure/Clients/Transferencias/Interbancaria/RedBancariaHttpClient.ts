import { IMapeoCuentaRedBancaria } from "../../../../Application/Ports/Transferencias/Interbancaria/IMapeoCuentaBancaria";
import {
    IRedBancariaClient,
    ResultadoTransferenciaInterbancaria,
    SolicitudTransferenciaInterbancaria
} from "../../../../Application/Ports/Transferencias/Interbancaria/IRedBancariaClient";
import { randomUUID } from "node:crypto";
import { TransactionRed, ApiResponseErrorRed, GetTransactionsResponseRed, TransferResponseRed } from "./Http/Tipos-red";

const API_VERSION = "1";

/**
 * Adapter real que traduce entre el dominio de BancoFuego y la API HTTP
 * de la red interbancaria (ISC ATM Integrator).
 *
 * Autenticación: API key (x-api-key), machine-to-machine. Las llamadas
 * que cambian estado (POST/PUT/PATCH/DELETE) además requieren un CSRF
 * token obtenido vía GET /csrf-token.
 *
 * Preguntas abiertas para el grupo que administra la red (anotar
 * respuesta acá cuando se confirmen):
 *   - GET /transactions marca account_id, operation, state y page/limit
 *     como query params "required" en el spec, pero solo tenemos
 *     correlation_id disponible en este punto del flujo. Falta probar
 *     contra el servidor real si de verdad son obligatorios.
 */
export class RedBancariaHttpClient implements IRedBancariaClient {
    constructor(
        private readonly baseUrl: string, // debe incluir el prefijo /api
        private readonly apiKey: string,
        private readonly mapeoCuentas: IMapeoCuentaRedBancaria
    ) {}
    public async consultarEstado(referenciaExterna: string): Promise<ResultadoTransferenciaInterbancaria> {
        return this.consultarEstadoTransferencia(referenciaExterna);
    }

    public async enviarTransferencia(
        solicitud: SolicitudTransferenciaInterbancaria
    ): Promise<ResultadoTransferenciaInterbancaria> {
        const correlationId = this.generarCorrelationId(solicitud);

        const accountIdOrigen = await this.mapeoCuentas.resolverAccountIdRed(
            solicitud.numeroCuentaOrigen
        );
        const accountIdDestino = await this.mapeoCuentas.resolverAccountIdRed(
            solicitud.numeroCuentaDestino,
            solicitud.bancoDestino
        );


        const body = {
            from_account_id: accountIdOrigen,
            to_account_id: accountIdDestino,
            amount: Math.round(solicitud.monto.toNumber() * 100),
            description: solicitud.concepto ?? "Transferencia interbancaria",
            source_bank: "bank_a",
            correlation_id: correlationId
        };


        try {
            const csrfData = await this.obtenerCsrfToken();

            const respuesta = await fetch(`${this.baseUrl}/transactions/transfer`, {
                method: "POST",
                headers: this.construirHeaders(csrfData.token, csrfData.cookie),
                body: JSON.stringify(body)
            });

            if (!respuesta.ok) {
                const errorInfo = await this.leerError(respuesta);
                const causaTecnica = `HTTP ${respuesta.status}: ${errorInfo.message ?? "Error devuelto por Banred"}`;
                return {
                    estado: "PENDIENTE",
                    referenciaExterna: correlationId,
                    mensaje: `Transferencia emitida a la red (${causaTecnica})`
                };
            }

            const { data: transacciones } = (await respuesta.json()) as TransferResponseRed;

            return this.interpretarRespuestaTransferencia(
                transacciones,
                correlationId,
                accountIdOrigen
            );
        } catch (error: unknown) {
            const causaTecnica = error instanceof Error ? error.message : String(error);
            return {
                estado: "PENDIENTE",
                referenciaExterna: correlationId,
                mensaje: `Transferencia emitida a la red (Error de red: ${causaTecnica})`
            };
        }
    }


    public async consultarEstadoTransferencia(
        referenciaExterna: string
    ): Promise<ResultadoTransferenciaInterbancaria> {
        // referenciaExterna acá ES nuestro correlation_id (ver nota en
        // enviarTransferencia).
        const params = new URLSearchParams({
            page: "1",
            limit: "10",
            correlation_id: referenciaExterna
        });

        const respuesta = await fetch(
            `${this.baseUrl}/transactions?${params.toString()}`,
            { headers: this.construirHeaders() }
        );

        if (!respuesta.ok) {
            return this.aRechazoDesdeError(await this.leerError(respuesta));
        }

        const { data: transacciones } = (await respuesta.json()) as  GetTransactionsResponseRed;

        if (transacciones.length === 0) {
            return {
                estado: "RECHAZADA",
                codigoError: "REFERENCIA_NO_EXISTE",
                mensaje: `No existe una transacción con correlation_id ${referenciaExterna}`
            };
        }

        // No tenemos accountIdOrigen en este punto (el puerto solo nos
        // da la referencia), así que tomamos la primera pata. Si la red
        // llega a devolver más de una transacción por correlation_id
        // sin más contexto para desambiguar, hay que revisar esta
        // asunción con el equipo de la red.
        return this.interpretarUnaTransaccion(transacciones[0]);
    }

    // ---------------------------------------------------------------
    // Autenticación
    // ---------------------------------------------------------------

    private async obtenerCsrfToken(): Promise<{token: string, cookie: string}> {
        const respuesta = await fetch(`${this.baseUrl}/csrf-token`, {
            headers: {
                "x-api-version": API_VERSION,
                "x-api-key": this.apiKey
            }
        });

        if (!respuesta.ok) {
            throw new Error(
                `No se pudo obtener el CSRF token de la red bancaria (HTTP ${respuesta.status})`
            );
        }

        // fetch in Node.js standard behavior does not handle cookies automatically.
        // We must extract the set-cookie header manually to send it in the next request.
        const setCookieHeader = respuesta.headers.get("set-cookie");
        let cookie = "";
        if (setCookieHeader) {
            // handle multiple cookies if present by splitting by comma, 
            // but normally it's just one csrf cookie.
            // Split by ';' to get just the key=value part
            const match = setCookieHeader.match(/([^=]+=[^;]+)/);
            if (match) {
                cookie = match[0];
            }
        }

        const { token } = (await respuesta.json()) as { token: string };
        return { token, cookie };
    }

    private construirHeaders(csrfToken?: string, cookie?: string): Record<string, string> {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "x-api-version": API_VERSION,
            "x-api-key": this.apiKey
        };

        if (csrfToken) {
            headers["x-csrf-token"] = csrfToken;
        }
        
        if (cookie) {
            headers["Cookie"] = cookie;
        }

        return headers;
    }

    // ---------------------------------------------------------------
    // Interpretación de respuestas
    // ---------------------------------------------------------------

    private async leerError(respuesta: Response): Promise<ApiResponseErrorRed> {
        try {
            return (await respuesta.json()) as ApiResponseErrorRed;
        } catch {
            return {
                id: "desconocido",
                message: `Error HTTP ${respuesta.status} sin cuerpo interpretable`,
                code: "ERROR_RED_DESCONOCIDO",
                status: respuesta.status,
                cause: null,
                error: respuesta.statusText,
                path: "",
                resource: "",
                timestamp: new Date().toISOString()
            };
        }
    }

    private aRechazoDesdeError(
        error: ApiResponseErrorRed
    ): ResultadoTransferenciaInterbancaria {
        return {
            estado: "RECHAZADA",
            codigoError: error.code,
            mensaje: error.message
        };
    }

    private generarCorrelationId(
        _solicitud: SolicitudTransferenciaInterbancaria
    ): string {
        return randomUUID();
    }


    private interpretarRespuestaTransferencia(
        transacciones: TransactionRed[],
        correlationId: string,
        accountIdOrigen: string
    ): ResultadoTransferenciaInterbancaria {
        const transaccionOrigen = transacciones.find(
            (t) => t.correlationId === correlationId && t.bankAccountId === accountIdOrigen
        );

        if (!transaccionOrigen) {
            return {
                estado: "RECHAZADA",
                codigoError: "RESPUESTA_RED_INCONSISTENTE",
                mensaje: `No se encontró transacción para account_id ${accountIdOrigen} con correlation_id ${correlationId}`
            };
        }

        return this.interpretarUnaTransaccion(transaccionOrigen);
    }

    private interpretarUnaTransaccion(
        transaccion: TransactionRed
    ): ResultadoTransferenciaInterbancaria {
        switch (transaccion.state) {
            case "success":
                return {
                    estado: "ACEPTADA",
                    referenciaExterna: transaccion.id
                };
            case "pending":
                return {
                    estado: "PENDIENTE",
                    referenciaExterna: transaccion.id
                };
            case "cancelled":
                // La API no trae motivo de rechazo en este schema.
                return {
                    estado: "RECHAZADA",
                    codigoError: "TRANSACCION_CANCELADA",
                    mensaje: "La red canceló la transacción"
                };
            default:
                throw new Error(
                    `Estado de transacción no reconocido: "${transaccion.state}"`
                );
        }
    }
}