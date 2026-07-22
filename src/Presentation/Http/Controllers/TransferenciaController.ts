import {
    NextFunction,
    Request,
    Response
} from "express";

import { TransferenciaService } from "../../../Application/Services/TransferenciaService";

interface TransferenciaBody {
    cuentaDestinoId?: number;
    numeroCuentaDestino: string;
    codigoBancoDestino?: string;
    monto: number;
}

interface DatosAutenticacion {
    cuentaId: number;
    numeroCuenta: string;
}

export class TransferenciaController {
    constructor(
        private readonly transferenciaService:
            TransferenciaService
    ) { }

    public transferir = async (
        req: Request<
            Record<string, never>,
            unknown,
            TransferenciaBody
        >,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const autenticacion =
                res.locals.autenticacion as
                DatosAutenticacion;

            const idempotencyKey =
                req.header(
                    "Idempotency-Key"
                ) ?? undefined;

            const resultado =
                await this.transferenciaService.ejecutar({
                    cuentaOrigenId: autenticacion.cuentaId,
                    numeroCuentaDestino: req.body.numeroCuentaDestino,
                    monto: req.body.monto,
                    idempotencyKey

                });

            res.status(201).json(resultado);
        } catch (error) {
            next(error);
        }
    };
}