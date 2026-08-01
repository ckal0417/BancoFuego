export interface TransferCommandDto {
    amount: number;
    description: string;
    from_account_id: string;
    to_account_id: string;
    correlation_id?: string;
    source_bank: string;
}