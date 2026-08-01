import { CorrelationId } from "../../../../../Domain/ValueObjects/CorrelationId";
import { SourceBank } from "../../Enums/SourceBank";
import { TransactionOperation } from "../../Enums/TransactionOperation";
import { TransactionState } from "../../Enums/TransactionState";
import { TransactionType } from "../../Enums/TransactioType";

export interface TransactionDto {

    id: string;
    bankAccountId: string;
    description: string;
    operation: TransactionOperation;
    sourceBank: SourceBank;
    state: TransactionState;
    amount?: number;
    correlationId?: CorrelationId;
    type?: TransactionType;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;

}