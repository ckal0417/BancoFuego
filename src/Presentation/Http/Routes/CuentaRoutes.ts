import { Router } from "express";
import { cuentaController } from "../../../Bootstrap/CompositionRoot";

const cuentaRoutes = Router();

cuentaRoutes.get(
    "/:id",
    cuentaController.obtenerPorId
);

export { cuentaRoutes };