import { Router } from "express";
import { operacionController } from "../../../Bootstrap/CompositionRoot";

const operacionRoutes = Router();

operacionRoutes.post(
    "/depositos",
    operacionController.depositar
);

operacionRoutes.post(
    "/retiros",
    operacionController.retirar
);

export { operacionRoutes };