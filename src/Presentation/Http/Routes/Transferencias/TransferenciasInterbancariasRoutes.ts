import { Router } from "express";
import {
    transferenciaInterbancariaCallbackController,
    transferenciaInterbancariaEntranteController,
    webhookSignatureMiddleware
} from "../../../../Bootstrap/CompositionRoot";
import { ValidacionMiddleware } from "../../Middleware/ValidacionMiddleware";

const transferenciasInterbancariasRoutes = Router();

transferenciasInterbancariasRoutes.post(
    "/callback",
    webhookSignatureMiddleware.verificar,
    ValidacionMiddleware.validarCallbackInterbancario,
    transferenciaInterbancariaCallbackController.procesar
);

transferenciasInterbancariasRoutes.post(
    "/recibir",
    transferenciaInterbancariaEntranteController.recibir
);

export {
    transferenciasInterbancariasRoutes
};