import { ICuentaRepository } from "./ICuentaRepository";
import { IIdempotenciaRepository } from "./IIdempotenciaRepository";
import { IMovimientoRepository } from "./IMovimientoRepository";
import { ITransaccionRepository } from "./ITransaccionRepository";
import { IRegistroTransferenciaEntranteRepository } from "./Transferencias/Interbancaria/IRegistroTransferenciaEntranteRepository";

export interface RepositoriosTransaccionales {
    cuentas:
    ICuentaRepository;

    movimientos:
    IMovimientoRepository;

    transacciones:
    ITransaccionRepository;

    idempotencias:
    IIdempotenciaRepository;

    registroTransferenciasEntrantes:
    IRegistroTransferenciaEntranteRepository;
}

export interface IUnidadDeTrabajo {
    ejecutar<T>(
        operacion: (
            repositorios:
                RepositoriosTransaccionales
        ) => Promise<T>
    ): Promise<T>;
}