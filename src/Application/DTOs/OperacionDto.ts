export interface OperacionRequestDto {
    cuentaId: number;
    monto: number;
    idempotencyKey?: string;
}

export interface OperacionResponseDto {
    saldoAnterior: number;
    saldoNuevo: number;
    transaccionId: number;
    movimientoId: number;
}