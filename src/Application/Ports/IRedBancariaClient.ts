import { Dinero } from "../../Domain/ValueObjects/Dinero";

export interface SolicitudTransferenciaInterbancaria {
    numeroCuentaDestino: string;
    codigoBancoDestino: string;
    monto: Dinero;
}

export interface ResultadoTransferenciaInterbancaria {
    aprobada: boolean;
    referencia?: string;
    mensaje?: string;
}

export interface IRedBancariaClient {
    transferir(
        solicitud: SolicitudTransferenciaInterbancaria
    ): Promise<ResultadoTransferenciaInterbancaria>;
}