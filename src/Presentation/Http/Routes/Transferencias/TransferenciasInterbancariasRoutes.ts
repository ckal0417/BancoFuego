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

/*
// Al montar la ruta del webhook, ANTES de cualquier parseo JSON estándar
app.post(
    '/webhooks/interbank',
    express.json({
        verify: (req: any, res, buf) => {
            req.rawBody = buf.toString('utf8');
        }
    }),
    webhookSignatureMiddleware.verificar,
    procesarTransferenciaEntranteController
);*/

export {
    transferenciasInterbancariasRoutes
};