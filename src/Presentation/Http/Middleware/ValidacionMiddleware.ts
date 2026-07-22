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
        const numeroTarjeta = req.body?.numeroTarjeta;
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
        const { numeroCuentaDestino } = req.body ?? {};

        if (
            typeof numeroCuentaDestino !== "string" ||
            numeroCuentaDestino.trim().length === 0
        ) {
            res.status(400).json({
                mensaje: "Debes indicar el número de cuenta destino"
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

        const clave = req.header("Idempotency-Key");
        /*
         * Por ahora la cabecera sigue siendo opcional,
         * para no romper clientes anteriores.
         */
        if (clave === undefined) {
            next();
            return;
        }

        const claveLimpia = clave.trim();

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