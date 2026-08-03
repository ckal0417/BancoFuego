import { Dinero } from "../../../../Domain/ValueObjects/Dinero";
import { CorrelationId } from "../../../../Domain/ValueObjects/CorrelationId";
import { TransaccionRedBancariaDto } from "../../../DTOs/Transferencias/Interbancaria/TransaccionRedBancariaDto";

export interface SolicitudTransferenciaInterbancaria {
    
    bancoOrigen: string;
    bancoDestino: string;
    numeroCuentaOrigen: string;
    numeroCuentaDestino: string;
    monto: Dinero;
    concepto?: string;
    fecha: Date;
    callbackUrl: string;
}

export type ResultadoTransferenciaInterbancaria =
    | {
        estado: "ACEPTADA";
        referenciaExterna: string;
        mensaje?: string;
    }
    | {
        estado: "RECHAZADA";
        codigoError: string;
        mensaje?: string;
    }
    | {
        estado: "PENDIENTE";
        referenciaExterna: string;
        mensaje?: string;
    };

export interface IRedBancariaClient {
    enviarTransferencia(
        solicitud: SolicitudTransferenciaInterbancaria
    ): Promise<ResultadoTransferenciaInterbancaria>;

    consultarEstado(
        referenciaExterna: string
    ): Promise<ResultadoTransferenciaInterbancaria>;

    obtenerTransferenciasEntrantesPendientes():
        Promise<readonly TransaccionRedBancariaDto[]>;

    // Avisa a la red que la transferencia entrante ya fue procesada
    // para evitar que vuelva a enviarla.
    confirmarTransferenciaEntrantesProcesada(
        correlationId: CorrelationId
    ): Promise<void>;
}