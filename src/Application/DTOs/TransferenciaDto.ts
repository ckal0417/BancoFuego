export interface TransferenciaRequestDto {
    cuentaOrigenId: number;
    numeroCuentaDestino: string;
    monto: number;
    idempotencyKey?: string;
}

export interface CuentaTransferenciaDto {
    cuentaId: number;
    saldoAnterior: number;
    saldoNuevo: number;
}

export interface TransferenciaResponseDto {
    tipo:
    | "TRANSFERENCIAINTERNA"
    | "TRANSFERENCIAINTERBANCARIA";

    origen: CuentaTransferenciaDto;

    destino?: CuentaTransferenciaDto;

    transaccionId?: number;

    referenciaExterna?: string;
}