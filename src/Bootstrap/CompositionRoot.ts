import { SubscriberFactory } from "../Application/Events/SubscriberFactory";
import { AutenticacionService } from "../Application/Services/AutenticacionService";
import { CuentaService } from "../Application/Services/CuentaService";
import { DepositoService } from "../Application/Services/DepositoService";
import { HistorialService } from "../Application/Services/HistorialService";
import { IdempotenciaService } from "../Application/Services/IdempotenciaService";
import { RetiroService } from "../Application/Services/RetiroService";
import { TransferenciaService } from "../Application/Services/Transferencias/TransferenciaService";
import { TransferenciaLocalService } from "../Application/Services/Transferencias/Local/TransferenciaLocalService";
import { TransferenciaInterbancariaService } from "../Application/Services/Transferencias/Interbancaria/TransferenciaInterbancariaService";
import { TransferenciaInterbancariaEstadoService } from "../Application/Services/Transferencias/Interbancaria/TransferenciaInterbancariaEstadoService";
import { RedBancariaSimuladaClient } from "../Infrastructure/Clients/Transferencias/Interbancaria/RedBancariaSimuladaClient";
import { PostgresUnidadDeTrabajo } from "../Infrastructure/Database/PostgresUnidadDeTrabajo";
import { AutenticacionRepositoryPostgres } from "../Infrastructure/Database/Repositories/AutenticacionRepositoryPostgres";
import { CuentaRepositoryPostgres } from "../Infrastructure/Database/Repositories/CuentaRepositoryPostgres";
import { MovimientoRepositoryPostgres } from "../Infrastructure/Database/Repositories/MovimientoRepositoryPostgres";
import { TarjetaRepositoryPostgres } from "../Infrastructure/Database/Repositories/TarjetaRepositoryPostgres";
import { TransaccionRepositoryPostgres } from "../Infrastructure/Database/Repositories/TransaccionRepositoryPostgres";
import { JwtTokenService } from "../Infrastructure/Security/JwtTokenService";
import { TransferenciaInterbancariaPollingWorker } from "../Infrastructure/Workers/Transferencias/Interbancaria/TransferenciaInterbancariaPollingWorker";
import { AuthController } from "../Presentation/Http/Controllers/AuthController";
import { CuentaController } from "../Presentation/Http/Controllers/CuentaController";
import { HistorialController } from "../Presentation/Http/Controllers/HistorialController";
import { OperacionController } from "../Presentation/Http/Controllers/OperacionController";
import { TransferenciaController } from "../Presentation/Http/Controllers/Transferencias/TransferenciaController";
import { TransferenciaInterbancariaEstadoController } from "../Presentation/Http/Controllers/Transferencias/Interbancaria/TransferenciaInterbancariaEstadoController";
import { AuthMiddleware } from "../Presentation/Http/Middleware/AuthMiddleware";
import { EventBus } from "../Shared/Events/EventBus";

/*
 * Eventos
 */
const eventBus = new EventBus();

SubscriberFactory.crear(eventBus);

/*
 * Repositorios utilizados fuera de una transacción SQL.
 */
const cuentaRepository =
    new CuentaRepositoryPostgres();

const tarjetaRepository =
    new TarjetaRepositoryPostgres();

const autenticacionRepository =
    new AutenticacionRepositoryPostgres();

const transaccionRepository =
    new TransaccionRepositoryPostgres();

const movimientoRepository =
    new MovimientoRepositoryPostgres();

/*
 * Unidad de trabajo para operaciones bancarias atómicas.
 */
const unidadDeTrabajo =
    new PostgresUnidadDeTrabajo();

/*
 * Cliente de la red bancaria.
 *
 * Por ahora se utiliza el cliente simulado.
 * Después podrá reemplazarse por RedBancariaHttpClient
 * sin modificar los servicios de aplicación.
 */
const redBancariaClient =
    new RedBancariaSimuladaClient();

/*
 * Seguridad.
 */
const tokenService =
    new JwtTokenService();

/*
 * Idempotencia.
 */
const idempotenciaService =
    new IdempotenciaService();

/*
 * Servicios generales.
 */
const cuentaService =
    new CuentaService(
        cuentaRepository
    );

const autenticacionService =
    new AutenticacionService(
        tarjetaRepository,
        autenticacionRepository,
        cuentaRepository,
        eventBus,
        tokenService
    );

const depositoService =
    new DepositoService(
        unidadDeTrabajo,
        eventBus,
        idempotenciaService
    );

const retiroService =
    new RetiroService(
        unidadDeTrabajo,
        eventBus,
        idempotenciaService
    );

const historialService =
    new HistorialService(
        movimientoRepository,
        transaccionRepository
    );

/*
 * Servicios de transferencias.
 */
const transferenciaLocalService =
    new TransferenciaLocalService(
        unidadDeTrabajo,
        idempotenciaService
    );

const transferenciaInterbancariaService =
    new TransferenciaInterbancariaService(
        unidadDeTrabajo,
        redBancariaClient,
        idempotenciaService
    );

const transferenciaService =
    new TransferenciaService(
        transferenciaLocalService,
        transferenciaInterbancariaService,
        eventBus
    );

const transferenciaInterbancariaEstadoService =
    new TransferenciaInterbancariaEstadoService(
        unidadDeTrabajo,
        redBancariaClient,
        eventBus
    );

/*
 * Controllers.
 */
export const cuentaController =
    new CuentaController(
        cuentaService
    );

export const authController =
    new AuthController(
        autenticacionService
    );

export const operacionController =
    new OperacionController(
        depositoService,
        retiroService
    );

export const transferenciaController =
    new TransferenciaController(
        transferenciaService
    );

export const transferenciaInterbancariaEstadoController =
    new TransferenciaInterbancariaEstadoController(
        transferenciaInterbancariaEstadoService
    );

export const historialController =
    new HistorialController(
        historialService
    );

/*
 * Middleware.
 */
export const authMiddleware =
    new AuthMiddleware(
        tokenService
    );

/*
 * Worker.
 */
const intervaloPolling =
    Number(
        process.env.INTERBANK_POLLING_INTERVAL_MS ??
        30_000
    );

const lotePolling =
    Number(
        process.env.INTERBANK_POLLING_BATCH_SIZE ??
        50
    );

export const transferenciaInterbancariaPollingWorker =
    new TransferenciaInterbancariaPollingWorker(
        transferenciaInterbancariaEstadoService,
        intervaloPolling,
        lotePolling
    );