import { Dinero } from "../../../../Domain/ValueObjects/Dinero";
import { TransaccionRedBancariaDto } from "../../../DTOs/Transferencias/Interbancaria/TransaccionRedBancariaDto";
import { CorrelationId } from "../../../../Domain/ValueObjects/CorrelationId";


export interface SolicitudTransferenciaInterbancaria {
    bancoOrigen: string;
    bancoDestino: string;

    numeroCuentaOrigen: string;
    numeroCuentaDestino: string;

    monto: Dinero;
    concepto?: string;

    fecha: Date;
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

    //este metodo es para avisarle a la red qua ya procesamos la 
    //la transacion para que no la siga enviando
    confirmarTransferenciaEntrantesProcesada(
        correlationId: CorrelationId
    ): Promise<void>;
}