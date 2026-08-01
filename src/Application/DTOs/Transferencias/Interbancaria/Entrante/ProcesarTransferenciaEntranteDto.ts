export interface ProcesarTransferenciaEntranteRequestDto {

    correlationId: string;
    codigoBancoOrigen: string;
    numeroCuentaOrigen: string;
    numeroCuentaDestino: string;
    monto: number;
    concepto: string | undefined;
    idempotencyKey?: string;
}

export interface ProcesarTransferenciaEntranteResponseDto {

    tipo: "TRANSFERENCIA_EXTERNA_ENTRANTE";
    cuentaDestino: {
        cuentaId: number;
        saldoAnterior: number;
        saldoNuevo: number;
    };
    transaccionId: number;
    correlationId: string;
    mensaje: string;
}