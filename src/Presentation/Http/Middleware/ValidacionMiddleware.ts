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
                mensaje: "El monto debe ser un número mayor que cero"
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
                mensaje: "El tipo de transferencia debe ser LOCAL o INTERBANCARIA"
            });
            return;
        }

        if (cuentaDestinoId !== undefined) {
            res.status(400).json({
                mensaje: "No debes enviar cuentaDestinoId; utiliza numeroCuentaDestino"
            });
            return;
        }
        const numeroCuentaDestinoValido = typeof numeroCuentaDestino === "string" && numeroCuentaDestino.trim().length > 0;
        if (!numeroCuentaDestinoValido) {
            res.status(400).json({
                mensaje:
                    "Debes indicar el número de cuenta destino"
            });

            return;
        }
        if (tipoTransferencia === "LOCAL") {
            if (codigoBancoDestino !== undefined) {
                res.status(400).json({
                    mensaje: "Una transferencia local no debe contener código de banco destino"
                });
                return;
            }
            next();
            return;
        }
        const bancoDestinoValido = typeof codigoBancoDestino === "string" && codigoBancoDestino.trim().length > 0;
        if (!bancoDestinoValido) {
            res.status(400).json({
                mensaje: "Debes indicar el código del banco destino"
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
        const clave =  req.header( "Idempotency-Key" );
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

    public static validarCallbackInterbancario = (
        req: Request,
        res: Response,
        next: NextFunction
    ): void => {
        const {
            referenciaExterna,
            estado,
            codigoError,
            mensaje
        } = req.body ?? {};

        if (
            typeof referenciaExterna !== "string" ||
            referenciaExterna.trim().length === 0
        ) {
            res.status(400).json({
                mensaje: "La referencia externa es obligatoria",
                codigo: "REFERENCIA_EXTERNA_INVALIDA"
            });
            return;
        }
        if (
            referenciaExterna.trim().length > 150
        ) {
            res.status(400).json({
                mensaje: "La referencia externa no puede superar los 150 caracteres",
                codigo: "REFERENCIA_EXTERNA_MUY_LARGA"
            });
            return;
        }

        if (
            estado !== "ACEPTADA" &&
            estado !== "RECHAZADA"
        ) {
            res.status(400).json({
                mensaje: "El estado debe ser ACEPTADA o RECHAZADA",
                codigo: "ESTADO_INTERBANCARIO_INVALIDO"
            });
            return;
        }

        if (
            estado === "RECHAZADA" &&
            (
                typeof codigoError !== "string" ||
                codigoError.trim().length === 0
            )
        ) {
            res.status(400).json({
                mensaje: "El código de error es obligatorio cuando la transferencia es rechazada",
                codigo: "CODIGO_ERROR_OBLIGATORIO"
            });
            return;
        }

        if (
            codigoError !== undefined &&
            (
                typeof codigoError !== "string" ||
                codigoError.trim().length > 100
            )
        ) {
            res.status(400).json({
                mensaje: "El código de error debe ser texto y no superar los 100 caracteres",
                codigo: "CODIGO_ERROR_INVALIDO"
            });

            return;
        }
        if (
            mensaje !== undefined &&
            (
                typeof mensaje !== "string" ||
                mensaje.trim().length > 500
            )
        ) {
            res.status(400).json({
                mensaje:
                    "El mensaje debe ser texto y no superar los 500 caracteres",
                codigo:
                    "MENSAJE_CALLBACK_INVALIDO"
            });

            return;
        }
        req.body.referenciaExterna = referenciaExterna.trim();
        if (
            typeof codigoError === "string"
        ) {
            req.body.codigoError = codigoError.trim();
        }
        if (
            typeof mensaje === "string"
        ) {
            req.body.mensaje = mensaje.trim();
        }
        next();
    };


}