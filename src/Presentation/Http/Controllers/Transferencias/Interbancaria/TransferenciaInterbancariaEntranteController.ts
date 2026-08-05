import { Request, Response, NextFunction } from "express";
import { ProcesarTransferenciasEntrantesService } from "../../../../../Application/Services/Transferencias/Interbancaria/Entrante/ProcesarTransferenciasEntrantesService";
import { TransferenciaInterbancariaEntranteWebhookRequest } from "../../../../Contracts/Api/Transferencias/TransferenciaInterbancariaEntranteWebhookContract";
import { TransferenciaInterbancariaEntranteWebhookAdapter } from "./TransferenciaInterbancariaEntranteWebhookAdapter";

export class TransferenciaInterbancariaEntranteController {
    constructor(
        private readonly procesarTransferenciasEntrantesService: ProcesarTransferenciasEntrantesService
    ) { }

    public recibir = async (
        req: Request<
            unknown,
            unknown,
            TransferenciaInterbancariaEntranteWebhookRequest
        >,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {

            const solicitud =
                TransferenciaInterbancariaEntranteWebhookAdapter
                    .aProcesarTransferenciaEntranteDto(
                        req.body,
                        req.header("Idempotency-Key") ?? undefined
                    );

            const resultado =
                await this.procesarTransferenciasEntrantesService
                    .procesarTransferenciaEntrante(
                        solicitud
                    );

            const codigoHttp =
                resultado.operacionNueva ? 201 : 200;

            res.status(codigoHttp).json({
                ...resultado.respuesta,
                operacionNueva:
                    resultado.operacionNueva
            });
        } catch (error) {
            next(error);
        }
    };
}