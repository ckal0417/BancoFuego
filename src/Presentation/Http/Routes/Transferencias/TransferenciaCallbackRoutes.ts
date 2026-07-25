import { Router } from "express";
import {
    transferenciaInterbancariaCallbackController
} from "../../../../Bootstrap/CompositionRoot";

const transferenciaCallbackRoutes = Router();

transferenciaCallbackRoutes.post(
    "/callback",
    transferenciaInterbancariaCallbackController.procesar
);

export {
    transferenciaCallbackRoutes
};