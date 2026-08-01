export interface TransaccionRedBancariaDto {

    id: string;
    correlationId: string;
    codigoBancoOrigen: string;
    numeroCuentaOrigen: string;
    numeroCuentaDestino: string;
    operation: string;
    type: "credit" | "debit";
    amount: number;
    state: string;
    description?: string;
    createdAt: Date;

}