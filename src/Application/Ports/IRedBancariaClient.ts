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

export interface ResolucionCuentaRed {
    codigoBanco: string;
}

export interface IRedBancariaClient {
    resolverCuentaDestino(
        numeroCuenta: string
    ): Promise<ResolucionCuentaRed | null>;
    transferir(
        solicitud: SolicitudTransferenciaInterbancaria
    ): Promise<ResultadoTransferenciaInterbancaria>;
}