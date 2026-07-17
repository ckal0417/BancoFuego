import { Movimiento } from "../../Domain/Entities/Movimiento";

export interface IMovimientoRepository {
    crear(
        movimiento: Movimiento
    ): Promise<number>;

    buscarPorCuentaId(
        idCuenta: number
    ): Promise<Movimiento[]>;
}