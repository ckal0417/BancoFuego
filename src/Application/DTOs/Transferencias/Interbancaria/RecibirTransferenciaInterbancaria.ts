
export interface RecibirTransferenciaInterbancariaRequestDto {
    bancoOrigen: string;
    numeroCuentaDestino: string;
    monto: number;
    concepto?: string;
    referenciaExterna: string; // ID único que asigna el banco emisor a la operación
}

export type EstadoRecepcionInterbancaria = "ACEPTADA" | "RECHAZADA";

export interface RecibirTransferenciaInterbancariaResponseDto {
    estado: EstadoRecepcionInterbancaria;
    referenciaExterna: string;
    transaccionId?: number;
    codigoError?: string;
    mensaje?: string;
}