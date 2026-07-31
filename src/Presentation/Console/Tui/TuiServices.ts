import { AutenticacionService } from "../../../Application/Services/AutenticacionService";
import { DepositoService } from "../../../Application/Services/DepositoService";
import { HistorialService } from "../../../Application/Services/HistorialService";
import { RetiroService } from "../../../Application/Services/RetiroService";
import { TransferenciaInterbancariaService } from "../../../Application/Services/Transferencias/Interbancaria/TransferenciaInterbancariaService";
import { PrepararTransferenciaLocalService } from "../../../Application/Services/Transferencias/Local/PrepararTransferenciaLocalService";
import { TransferenciaLocalService } from "../../../Application/Services/Transferencias/Local/TransferenciaLocalService";
import { TransferenciaService } from "../../../Application/Services/Transferencias/TransferenciaService";
import { crearDependenciasBase } from "../../../Bootstrap/CrearDependenciasBase";

export function crearServiciosTui() {
    const {
        eventBus,
        cuentaRepository,
        tarjetaRepository,
        autenticacionRepository,
        transaccionRepository,
        movimientoRepository,
        clienteRepository,
        unidadDeTrabajo,
        redBancariaClient,
        tokenService,
        idempotenciaService
    } = crearDependenciasBase();

    const autenticacionService = new AutenticacionService(
        tarjetaRepository,
        autenticacionRepository,
        cuentaRepository,
        eventBus,
        tokenService,
        clienteRepository
    );

    const depositoService = new DepositoService(
        unidadDeTrabajo,
        eventBus,
        idempotenciaService
    );

    const retiroService = new RetiroService(
        unidadDeTrabajo,
        eventBus,
        idempotenciaService
    );

    const historialService = new HistorialService(
        movimientoRepository,
        transaccionRepository
    );

    const transferenciaLocalService = new TransferenciaLocalService(
        unidadDeTrabajo,
        idempotenciaService
    );

    const prepararTransferenciaLocalService = new PrepararTransferenciaLocalService(
        cuentaRepository,
        transferenciaLocalService
    );

    const transferenciaInterbancariaService = new TransferenciaInterbancariaService(
        unidadDeTrabajo,
        redBancariaClient,
        idempotenciaService
    );

    const transferenciaService = new TransferenciaService(
        prepararTransferenciaLocalService,
        transferenciaInterbancariaService,
        eventBus
    );

    return {
        cuentaRepository,
        autenticacionService,
        depositoService,
        retiroService,
        historialService,
        transferenciaService
    };
}

export type ServiciosTui = ReturnType<typeof crearServiciosTui>;