// Application/Ports/ITransaccionRepository.ts
import { Transaccion } from "../../Domain/Entities/Transaccion";

export interface ITransaccionRepository {
  /** Devuelve la Transaccion reconstruida CON id, porque Movimiento lo necesita para su FK */
    guardar(transaccion: Transaccion): Promise<Transaccion>;
}