import { EstadoRespuestaInterbancaria } from "./EstadoRespuestaInterbancaria";

export interface RecibirTransferenciaInterbancariaRequestDto {
    bancoOrigen: string;

    numeroCuentaOrigen: string;
    nombreTitularOrigen?: string;

    numeroCuentaDestino: string;

    monto: number;
    concepto?: string;
    referenciaExterna: string;
}

export interface RecibirTransferenciaInterbancariaResponseDto {
    estado: "ACEPTADA" | "RECHAZADA";
    referenciaExterna: string;
    transaccionId?: number;
    codigoError?: string;
    mensaje?: string;
}