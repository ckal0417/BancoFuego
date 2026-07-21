import { NextFunction, Request, Response } from "express";

export class ValidacionMiddleware {
    public static validarMonto = (
        req: Request,
        res: Response,
        next: NextFunction
    ): void => {
        const monto = req.body?.monto;

        if (
            typeof monto !== "number" ||
            !Number.isFinite(monto) ||
            monto <= 0
        ) {
            res.status(400).json({
                mensaje:
                    "El monto debe ser un número mayor que cero"
            });

            return;
        }
        next();
    };

    public static validarLogin = (
        req: Request,
        res: Response,
        next: NextFunction
    ): void => {
        const numeroTarjeta =  req.body?.numeroTarjeta;
        const pin = req.body?.pin;

        if (
            typeof numeroTarjeta !== "string" ||
            numeroTarjeta.trim().length === 0
        ) {
            res.status(400).json({
                mensaje: "El número de tarjeta es obligatorio"
            });

            return;
        }

        if (
            typeof pin !== "string" ||
            pin.trim().length === 0
        ) {
            res.status(400).json({
                mensaje: "El PIN es obligatorio"
            });
            return;
        }
        next();
    };

    public static validarTransferencia = (
        req: Request,
        res: Response,
        next: NextFunction
    ): void => {
        const {
            tipoTransferencia,
            cuentaDestinoId,
            numeroCuentaDestino,
            codigoBancoDestino
        } = req.body ?? {};

        if (
            tipoTransferencia !== "LOCAL" &&
            tipoTransferencia !== "INTERBANCARIA"
        ) {
            res.status(400).json({
                mensaje:
                    "El tipo de transferencia debe ser LOCAL o INTERBANCARIA"
            });

            return;
        }

        if (tipoTransferencia === "LOCAL") {
            if (
                typeof cuentaDestinoId !== "number" ||
                !Number.isInteger(cuentaDestinoId) ||
                cuentaDestinoId <= 0
            ) {
                res.status(400).json({
                    mensaje:
                        "La cuenta destino local no es válida"
                });

                return;
            }

            if (
                numeroCuentaDestino !== undefined ||
                codigoBancoDestino !== undefined
            ) {
                res.status(400).json({
                    mensaje:
                        "Una transferencia local no debe contener datos interbancarios"
                });

                return;
            }

            next();
            return;
        }

        const numeroDestinoValido =
            typeof numeroCuentaDestino === "string" &&
            numeroCuentaDestino.trim().length > 0;

        const bancoDestinoValido =
            typeof codigoBancoDestino === "string" &&
            codigoBancoDestino.trim().length > 0;

        if (
            !numeroDestinoValido ||
            !bancoDestinoValido
        ) {
            res.status(400).json({
                mensaje:
                    "La cuenta y el banco destino son obligatorios para una transferencia interbancaria"
            });

            return;
        }

        if (cuentaDestinoId !== undefined) {
            res.status(400).json({
                mensaje:
                    "Una transferencia interbancaria no debe contener cuentaDestinoId"
            });

            return;
        }
        next();
    };

    public static validarIdempotencyKey = (
        req: Request,
        res: Response,
        next: NextFunction
    ): void => {

        const clave = req.header( "Idempotency-Key");
        /*
         * Por ahora la cabecera sigue siendo opcional,
         * para no romper clientes anteriores.
         */
        if (clave === undefined) {
            next();
            return;
        }

        const claveLimpia =  clave.trim();

        if (
            claveLimpia.length === 0 ||
            claveLimpia.length > 100
        ) {
            res.status(400).json({
                mensaje: "Idempotency-Key debe tener entre 1 y 100 caracteres"
            });
            return;
        }
        next();
    };
}