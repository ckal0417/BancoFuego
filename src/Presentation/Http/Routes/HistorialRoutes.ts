import { Router } from "express";
import { historialController } from "../../../Bootstrap/CompositionRoot";

const historialRoutes = Router();

historialRoutes.get(
    "/cuentas/:cuentaId",
    historialController.obtenerPorCuenta
);

export { historialRoutes };