import { AutenticacionService } from "../Application/Services/AutenticacionService";
import { CuentaService } from "../Application/Services/CuentaService";
import { DepositoService } from "../Application/Services/DepositoService";
import { HistorialService } from "../Application/Services/HistorialService";
import { RetiroService } from "../Application/Services/RetiroService";
import { AplicarResultadoInterbancarioService } from "../Application/Services/Transferencias/Interbancaria/AplicarResultadoInterbancarioService";
import { ProcesarTransferenciaEntranteService } from "../Application/Services/Transferencias/Interbancaria/Entrante/ProcesarTransferenciaEntranteService";
import { ProcesarTransferenciasEntrantesService } from "../Application/Services/Transferencias/Interbancaria/Entrante/ProcesarTransferenciasEntrantesService";
import { ProcesarRespuestaInterbancariaService } from "../Application/Services/Transferencias/Interbancaria/ProcesarRespuestaInterbancariaService";
import { RecibirTransferenciaInterbancariaService } from "../Application/Services/Transferencias/Interbancaria/RecibirTransferenciaInterbancariaService";
import { TransferenciaInterbancariaEstadoService } from "../Application/Services/Transferencias/Interbancaria/TransferenciaInterbancariaEstadoService";
import { TransferenciaInterbancariaService } from "../Application/Services/Transferencias/Interbancaria/TransferenciaInterbancariaService";
import { ConsultarTitularCuentaService } from "../Application/Services/ConsultarTitularCuentaService";
import { PrepararTransferenciaLocalService } from "../Application/Services/Transferencias/Local/PrepararTransferenciaLocalService";
import { TransferenciaLocalService } from "../Application/Services/Transferencias/Local/TransferenciaLocalService";
import { TransferenciaService } from "../Application/Services/Transferencias/TransferenciaService";
import { TransferenciaInterbancariaPollingWorker } from "../Infrastructure/Workers/Transferencias/Interbancaria/TransferenciaInterbancariaPollingWorker";
import { TransferenciasEntrantesPollingWorker } from "../Infrastructure/Workers/Transferencias/Interbancaria/TransferenciasEntrantePollingWorker";
import { AuthController } from "../Presentation/Http/Controllers/AuthController";
import { CuentaController } from "../Presentation/Http/Controllers/CuentaController";
import { HistorialController } from "../Presentation/Http/Controllers/HistorialController";
import { OperacionController } from "../Presentation/Http/Controllers/OperacionController";
import { TransferenciaInterbancariaCallbackController } from "../Presentation/Http/Controllers/Transferencias/Interbancaria/TransferenciaInterbancariaCallbackController";
import { TransferenciaInterbancariaEntranteController } from "../Presentation/Http/Controllers/Transferencias/Interbancaria/TransferenciaInterbancariaEntranteController";
import { TransferenciaInterbancariaEstadoController } from "../Presentation/Http/Controllers/Transferencias/Interbancaria/TransferenciaInterbancariaEstadoController";
import { TransferenciaController } from "../Presentation/Http/Controllers/Transferencias/TransferenciaController";
import { AuthMiddleware } from "../Presentation/Http/Middleware/AuthMiddleware";
import { crearDependenciasBase } from "./CrearDependenciasBase";
import { WebhookSignatureMiddleware } from "../Presentation/Http/Middleware/WebhookSignatureMiddleware";

export const {
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


const cuentaService = new CuentaService(cuentaRepository);
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
const aplicarResultadoInterbancarioService = new AplicarResultadoInterbancarioService();
const transferenciaInterbancariaEstadoService = new TransferenciaInterbancariaEstadoService(
    unidadDeTrabajo,
    redBancariaClient,
    eventBus,
    aplicarResultadoInterbancarioService
);
const procesarRespuestaInterbancariaService = new ProcesarRespuestaInterbancariaService(
    unidadDeTrabajo,
    eventBus,
    aplicarResultadoInterbancarioService
);
const recibirTransferenciaInterbancariaService = new RecibirTransferenciaInterbancariaService(
    unidadDeTrabajo,
    eventBus
);

const procesarTransferenciaEntranteService =
    new ProcesarTransferenciaEntranteService(
        unidadDeTrabajo,
        idempotenciaService
    );

const procesarTransferenciasEntrantesService =
    new ProcesarTransferenciasEntrantesService(
        redBancariaClient,
        procesarTransferenciaEntranteService
    );

const consultarTitularCuentaService = new ConsultarTitularCuentaService(
    cuentaRepository,
    clienteRepository
);

export const cuentaController = new CuentaController(
    cuentaService,
    consultarTitularCuentaService
);
export const authController = new AuthController(autenticacionService);
export const operacionController = new OperacionController(depositoService, retiroService);
export const transferenciaController = new TransferenciaController(transferenciaService);
export const historialController = new HistorialController(historialService);
export const transferenciaInterbancariaEstadoController =
    new TransferenciaInterbancariaEstadoController(
        transferenciaInterbancariaEstadoService
    );
export const transferenciaInterbancariaCallbackController =
    new TransferenciaInterbancariaCallbackController(
        procesarRespuestaInterbancariaService
    );
export const transferenciaInterbancariaEntranteController =
    new TransferenciaInterbancariaEntranteController(
        recibirTransferenciaInterbancariaService
    );
export const authMiddleware = new AuthMiddleware(tokenService);
const webhookSecret = process.env.INTERBANK_WEBHOOK_SECRET;
if (
    !webhookSecret || webhookSecret.trim().length === 0
) {
    throw new Error(
        "La variable INTERBANK_WEBHOOK_SECRET es obligatoria"
    );
}
const tiempoMaximoWebhook = obtenerEnteroPositivo(
    process.env.INTERBANK_WEBHOOK_MAX_AGE_SECONDS,
    300
);
export const webhookSignatureMiddleware = new WebhookSignatureMiddleware(
    webhookSecret,
    tiempoMaximoWebhook
);

function obtenerEnteroPositivo(
    valor: string | undefined,
    predeterminado: number
): number {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0 ? numero : predeterminado;
}
const intervaloPolling = obtenerEnteroPositivo(
    process.env.INTERBANK_POLLING_INTERVAL_MS,
    30_000
);
const lotePolling = obtenerEnteroPositivo(
    process.env.INTERBANK_POLLING_BATCH_SIZE,
    50
);

export const transferenciaInterbancariaPollingWorker = new TransferenciaInterbancariaPollingWorker(
    transferenciaInterbancariaEstadoService,
    intervaloPolling,
    lotePolling
);

export const transferenciasEntrantesPollingWorker =
    new TransferenciasEntrantesPollingWorker(
        procesarTransferenciasEntrantesService,
        intervaloPolling
    );