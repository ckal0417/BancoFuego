export interface AgregarTransferenciaEntranteTestDto {

    correlationId?: string;
    codigoBancoOrigen: string;
    numeroCuentaOrigen: string;
    numeroCuentaDestino: string;
    monto: number;
    concepto?: string;

}