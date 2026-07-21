export interface TransferenciaLocalRequestDto {
    cuentaOrigenId: number;
    cuentaDestinoId: number;
    monto: number;
    idempotencyKey?: string;
}

export interface CuentaTransferenciaLocalDto {
    cuentaId: number;
    saldoAnterior: number;
    saldoNuevo: number;
}

export interface TransferenciaLocalResponseDto {
    tipo: "TRANSFERENCIAINTERNA";

    origen: CuentaTransferenciaLocalDto;

    destino: CuentaTransferenciaLocalDto;

    transaccionId: number;
}