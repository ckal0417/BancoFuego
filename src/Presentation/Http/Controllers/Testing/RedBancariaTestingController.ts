import { Request, Response } from "express";
import { RedBancariaSimuladaClient } from "../../../../Infrastructure/Clients/RedBancaria/Http/RedBancariaSimuladaClient";
import { redBancariaClient } from "../../../../Bootstrap/CompositionRoot";


export class RedBancariaTestingController {


    public agregarTransferenciaEntrante =
        async (
            req: Request,
            res: Response
        ): Promise<void> => {


            const client =
                redBancariaClient as RedBancariaSimuladaClient;


            client.agregarTransferenciaEntrante({
                id: crypto.randomUUID(),

                correlationId:
                    req.body.correlationId,

                codigoBancoOrigen:
                    req.body.codigoBancoOrigen,

                numeroCuentaOrigen:
                    req.body.numeroCuentaOrigen,

                numeroCuentaDestino:
                    req.body.numeroCuentaDestino,

                operation:
                    "TRANSFERENCIA_ENTRANTE",

                type:
                    "credit",

                amount:
                    req.body.monto,

                state:
                    "PENDING",

                description:
                    req.body.concepto,

                createdAt:
                    new Date()
            });


            res.status(201)
                .json({
                    mensaje:
                        "Transferencia agregada a la cola de la red bancaria simulada."
                });

        };

}