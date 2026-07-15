export interface OperacionRequestDto {
    cuentaId: number;
    monto: number;
}

export interface OperacionResponseDto {
    saldoAnterior: number;
    saldoNuevo: number;
    transaccionId?: number;
    movimientoId?: number;
}