import { Router } from "express";
import { transferenciaController } from "../../../Bootstrap/CompositionRoot";

const transferenciaRoutes = Router();

transferenciaRoutes.post(
    "/",
    transferenciaController.transferir
);

export { transferenciaRoutes };