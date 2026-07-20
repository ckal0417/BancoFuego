import { AutenticacionService } from "../Application/Services/AutenticacionService";
import { CuentaService } from "../Application/Services/CuentaService";
import { DepositoService } from "../Application/Services/DepositoService";
import { HistorialService } from "../Application/Services/HistorialService";
import { RetiroService } from "../Application/Services/RetiroService";
import { TransferenciaService } from "../Application/Services/TransferenciaService";
import { RedBancariaSimuladaClient } from "../Infrastructure/Clients/RedBancariaSimuladaClient";
import { PostgresUnidadDeTrabajo } from "../Infrastructure/Database/PostgresUnidadDeTrabajo";
import { AutenticacionRepositoryPostgres } from "../Infrastructure/Database/Repositories/AutenticacionRepositoryPostgres";
import { CuentaRepositoryPostgres } from "../Infrastructure/Database/Repositories/CuentaRepositoryPostgres";
import { MovimientoRepositoryPostgres } from "../Infrastructure/Database/Repositories/MovimientoRepositoryPostgres";
import { TarjetaRepositoryPostgres } from "../Infrastructure/Database/Repositories/TarjetaRepositoryPostgres";
import { TransaccionRepositoryPostgres } from "../Infrastructure/Database/Repositories/TransaccionRepositoryPostgres";
import { PinHasherBcrypt } from "../Infrastructure/Security/PinHasherBcrypt";
import { AuthController } from "../Presentation/Http/Controllers/AuthController";
import { CuentaController } from "../Presentation/Http/Controllers/CuentaController";
import { HistorialController } from "../Presentation/Http/Controllers/HistorialController";
import { OperacionController } from "../Presentation/Http/Controllers/OperacionController";
import { TransferenciaController } from "../Presentation/Http/Controllers/TransferenciaController";
import { SubscriberFactory } from "../Application/Events/SubscriberFactory";
import { EventBus } from "../Shared/Events/EventBus";
import { JwtTokenService } from "../Infrastructure/Security/JwtTokenService";
import { AuthMiddleware } from "../Presentation/Http/Middleware/AuthMiddleware";
import { IdempotenciaService } from "../Application/Services/IdempotenciaService";


// Repositories usados fuera de una transacción SQL
const eventBus =
    new EventBus();

SubscriberFactory.crear(eventBus);
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

// Unidad de trabajo para operaciones bancarias atómicas
const unidadDeTrabajo =
    new PostgresUnidadDeTrabajo();

// Clientes externos
const redBancariaClient =
    new RedBancariaSimuladaClient();

// Servicios de infraestructura
const pinHasher =
    new PinHasherBcrypt();

// Servcios de autenticación
const tokenService =
    new JwtTokenService();

//
const idempotenciaService =
    new IdempotenciaService();

// Servicios de aplicación
const cuentaService =
    new CuentaService(
        cuentaRepository
    );

const autenticacionService =
    new AutenticacionService(
        tarjetaRepository,
        autenticacionRepository,
        cuentaRepository,
        pinHasher,
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

const transferenciaService =
    new TransferenciaService(
        unidadDeTrabajo,
        redBancariaClient,
        eventBus,
        idempotenciaService
    );

    
const historialService =
    new HistorialService(
        movimientoRepository,
        transaccionRepository
    );

// Controllers
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

export const historialController =
    new HistorialController(
        historialService
    );

export const authMiddleware =
    new AuthMiddleware(
        tokenService
    );

 