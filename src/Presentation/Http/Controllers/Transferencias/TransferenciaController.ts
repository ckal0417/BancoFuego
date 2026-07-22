import { NextFunction, Request, Response } from "express";
import { TransferenciaService } from "../../../../Application/Services/Transferencias/TransferenciaService";

interface TransferenciaBody {
    tipoTransferencia: "LOCAL" | "INTERBANCARIA";
    cuentaDestinoId?: number;
    numeroCuentaDestino?: string;
    codigoBancoDestino?: string;
    monto: number;
    concepto?: string;
}

interface DatosAutenticacion {
    cuentaId: number;
    numeroCuenta: string;
}

export class TransferenciaController {
    constructor(
        private readonly transferenciaService:
            TransferenciaService
    ) {}

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

            const cuerpo =
                req.body;

            const resultado =
                cuerpo.tipoTransferencia === "LOCAL"
                    ? await this.transferenciaService.ejecutar({
                          tipoTransferencia: "LOCAL",

                          cuentaOrigenId:
                              autenticacion.cuentaId,

                          cuentaDestinoId:
                              cuerpo.cuentaDestinoId!,

                          monto:
                              cuerpo.monto,

                          idempotencyKey
                      })
                    : await this.transferenciaService.ejecutar({
                          tipoTransferencia:
                              "INTERBANCARIA",

                          cuentaOrigenId:
                              autenticacion.cuentaId,

                          numeroCuentaDestino:
                              cuerpo.numeroCuentaDestino!,

                          codigoBancoDestino:
                              cuerpo.codigoBancoDestino!,

                          monto:
                              cuerpo.monto,

                          concepto:
                              cuerpo.concepto,

                          idempotencyKey
                      });

            res.status(201).json(
                resultado
            );
        } catch (error) {
            next(error);
        }
    };
}