export interface TransferenciaInterbancariaEntranteWebhookRequest {
    correlationId?: string;
    referenciaExterna?: string;
    codigoBancoOrigen?: string;
    bancoOrigen?: string;
    numeroCuentaOrigen?: string;
    numeroCuentaDestino?: string;
    monto?: number;
    concepto?: string;
    description?: string;
}
