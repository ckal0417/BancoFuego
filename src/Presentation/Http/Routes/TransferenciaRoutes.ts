import { Router } from "express";
import { authMiddleware, transferenciaController } from "../../../Bootstrap/CompositionRoot";
import { ValidacionMiddleware } from "../Middleware/ValidacionMiddleware";

const transferenciaRoutes = Router();

transferenciaRoutes.use(
    authMiddleware.verificar
);

transferenciaRoutes.post(
    "/",
    ValidacionMiddleware.validarIdempotencyKey,
    ValidacionMiddleware.validarMonto,
    ValidacionMiddleware.validarTransferencia,
    transferenciaController.transferir
);

export { transferenciaRoutes };