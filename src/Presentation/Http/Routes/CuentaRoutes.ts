import { Router } from "express";
import { authMiddleware, cuentaController } from "../../../Bootstrap/CompositionRoot";

const cuentaRoutes = Router();

cuentaRoutes.get(
    "/me",
    authMiddleware.verificar,
    cuentaController.obtenerPropia
);

cuentaRoutes.get(
    "/titular/:numeroCuenta",
    authMiddleware.verificar,
    cuentaController.obtenerTitularPorNumeroCuenta
);

cuentaRoutes.get(
    "/:id",
    cuentaController.obtenerPorId
);

export { cuentaRoutes };