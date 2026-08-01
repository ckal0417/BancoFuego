
import { RegistroTransferenciaEntrante } from "../../../../Domain/Entities/RegistroTransferenciaEntrante";
import { CorrelationId } from "../../../../Domain/ValueObjects/CorrelationId";

export interface IRegistroTransferenciaEntranteRepository {

    guardar(
        registro: RegistroTransferenciaEntrante
    ): Promise<number>;

    buscarPorCorrelationId(
        correlationId: CorrelationId
    ): Promise<RegistroTransferenciaEntrante | null>;
}