export interface TransferenciaRequestDto {
    cuentaOrigenId: number;
    cuentaDestinoId: number;
    monto: number;
}

export interface CuentaTransferenciaDto {
    cuentaId: number;
    saldoAnterior: number;
    saldoNuevo: number;
}

export interface TransferenciaResponseDto {
    origen: CuentaTransferenciaDto;
    destino: CuentaTransferenciaDto;
    transaccionId?: number;
}