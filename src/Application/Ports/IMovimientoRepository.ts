// Application/Ports/IMovimientoRepository.ts
import { Movimiento } from "../../Domain/Entities/Movimiento";

export interface IMovimientoRepository {
    guardar(movimiento: Movimiento): Promise<void>;
}