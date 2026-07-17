import { ICuentaRepository } from "./ICuentaRepository";
import { IMovimientoRepository } from "./IMovimientoRepository";
import { ITransaccionRepository } from "./ITransaccionRepository";

export interface RepositoriosTransaccionales {
    cuentas: ICuentaRepository;
    movimientos: IMovimientoRepository;
    transacciones: ITransaccionRepository;
}

export interface IUnidadDeTrabajo {
    ejecutar<T>(
        operacion: ( repositorios: RepositoriosTransaccionales ) => Promise<T>
    ): Promise<T>;
}