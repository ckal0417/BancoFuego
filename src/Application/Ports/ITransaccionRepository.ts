import { Transaccion } from "../../Domain/Entities/Transaccion";

export interface ITransaccionRepository {
    crear(
      transaccion: Transaccion
    ): Promise<number>;

    buscarPorId(
      id: number
    ): Promise<Transaccion | null>;

    buscarTodosPorIds(
      ids: number[]
    ): Promise<Transaccion[]>;
}