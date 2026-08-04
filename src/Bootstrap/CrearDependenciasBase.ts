import { IdempotenciaService } from "../Application/Services/IdempotenciaService";
import { ConsultarTitularCuentaService } from "../Application/Services/ConsultarTitularCuentaService";
import { RedBancariaSimuladaClient } from "../Infrastructure/Clients/RedBancaria/Http/RedBancariaSimuladaClient";
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
    const webhookSecret = process.env.INTERBANK_WEBHOOK_SECRET;
    if (
        !webhookSecret ||
        webhookSecret.trim().length === 0
    ) {
        throw new Error(
            "La variable INTERBANK_WEBHOOK_SECRET es obligatoria"
        );
    }
    const retrasoWebhookMs =
    Number(
        process.env.INTERBANK_SIMULATED_WEBHOOK_DELAY_MS ??
        3000
    );
    const redBancariaClient = new RedBancariaSimuladaClient(
        webhookSecret.trim(),
        Number.isInteger(retrasoWebhookMs) &&
        retrasoWebhookMs > 0 ? retrasoWebhookMs: 3000
    );
    const tokenService = new JwtTokenService();
    const idempotenciaService = new IdempotenciaService();
    const consultarTitularCuentaService = new ConsultarTitularCuentaService(
        cuentaRepository,
        clienteRepository
    );

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
        idempotenciaService,
        consultarTitularCuentaService
    };
}

export type DependenciasBase = ReturnType<typeof crearDependenciasBase>;