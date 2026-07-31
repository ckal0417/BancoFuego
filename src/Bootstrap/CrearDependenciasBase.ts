import { IdempotenciaService } from "../Application/Services/IdempotenciaService";
import { RedBancariaSimuladaClient } from "../Infrastructure/Clients/Transferencias/Interbancaria/RedBancariaSimuladaClient";
import { PostgresUnidadDeTrabajo } from "../Infrastructure/Database/PostgresUnidadDeTrabajo";
import { AutenticacionRepositoryPostgres } from "../Infrastructure/Database/Repositories/AutenticacionRepositoryPostgres";
import { ClienteRepositoryPostgres } from "../Infrastructure/Database/Repositories/ClienteRepositoryPostgres";
import { CuentaRepositoryPostgres } from "../Infrastructure/Database/Repositories/CuentaRepositoryPostgres";
import { MovimientoRepositoryPostgres } from "../Infrastructure/Database/Repositories/MovimientoRepositoryPostgres";
import { TarjetaRepositoryPostgres } from "../Infrastructure/Database/Repositories/TarjetaRepositoryPostgres";
import { TransaccionRepositoryPostgres } from "../Infrastructure/Database/Repositories/TransaccionRepositoryPostgres";
import { JwtTokenService } from "../Infrastructure/Security/JwtTokenService";
import { EventBus } from "../Shared/Events/EventBus";
import { configurarSubscribers } from "./ConfigurarSubscribers";

export function crearDependenciasBase() {
    const eventBus = new EventBus();
    const cuentaRepository = new CuentaRepositoryPostgres();
    const tarjetaRepository = new TarjetaRepositoryPostgres();
    const autenticacionRepository = new AutenticacionRepositoryPostgres();
    const transaccionRepository = new TransaccionRepositoryPostgres();
    const movimientoRepository = new MovimientoRepositoryPostgres();
    const clienteRepository = new ClienteRepositoryPostgres();
    const unidadDeTrabajo = new PostgresUnidadDeTrabajo();
    const redBancariaClient = new RedBancariaSimuladaClient();
    const tokenService = new JwtTokenService();
    const idempotenciaService = new IdempotenciaService();

    configurarSubscribers(
        eventBus,
        cuentaRepository,
        clienteRepository
    );

    return {
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
    };
}

export type DependenciasBase = ReturnType<typeof crearDependenciasBase>;