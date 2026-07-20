import {
    NextFunction,
    Request,
    Response
} from "express";

import {
    AutenticacionNoEncontradaError,
    BusinessRuleError,
    CuentaInactivaError,
    CuentaNoEncontradaError,
    DomainError,
    FondosInsuficientesError,
    MontoInvalidoError,
    OperacionNoSoportadaError,
    PinIncorrectoError,
    TarjetaBloqueadaError,
    TarjetaNoEncontradaError,
    TarjetaNoUsableError,
    TarjetaVencidaError,
    ValidationError
} from "../../../Domain/Errors/DomainErrors";

import logger from "../../../Shared/Logging/Logger";

export function errorHandler(
    error: unknown,
    req: Request,
    res: Response,
    _next: NextFunction
): void {
    const fecha =
        new Date().toISOString();

    const ruta =
        `${req.method} ${req.originalUrl}`;

    if (error instanceof PinIncorrectoError) {
        responder(
            res,
            401,
            error.message,
            "PIN_INCORRECTO",
            fecha
        );

        return;
    }

    if (error instanceof TarjetaNoEncontradaError) {
        responder(
            res,
            404,
            error.message,
            "TARJETA_NO_ENCONTRADA",
            fecha
        );

        return;
    }

    if (
        error instanceof
            AutenticacionNoEncontradaError
    ) {
        responder(
            res,
            404,
            error.message,
            "AUTENTICACION_NO_ENCONTRADA",
            fecha
        );

        return;
    }

    if (error instanceof CuentaNoEncontradaError) {
        responder(
            res,
            404,
            error.message,
            "CUENTA_NO_ENCONTRADA",
            fecha
        );

        return;
    }

    if (error instanceof ValidationError) {
        responder(
            res,
            400,
            error.message,
            "VALIDACION_INVALIDA",
            fecha
        );

        return;
    }

    if (error instanceof MontoInvalidoError) {
        responder(
            res,
            400,
            error.message,
            "MONTO_INVALIDO",
            fecha
        );

        return;
    }

    if (error instanceof TarjetaBloqueadaError) {
        responder(
            res,
            409,
            error.message,
            "TARJETA_BLOQUEADA",
            fecha
        );

        return;
    }

    if (error instanceof TarjetaVencidaError) {
        responder(
            res,
            409,
            error.message,
            "TARJETA_VENCIDA",
            fecha
        );

        return;
    }

    if (error instanceof TarjetaNoUsableError) {
        responder(
            res,
            409,
            error.message,
            "TARJETA_NO_USABLE",
            fecha
        );

        return;
    }

    if (error instanceof CuentaInactivaError) {
        responder(
            res,
            409,
            error.message,
            "CUENTA_INACTIVA",
            fecha
        );

        return;
    }

    if (
        error instanceof
            FondosInsuficientesError
    ) {
        responder(
            res,
            409,
            error.message,
            "FONDOS_INSUFICIENTES",
            fecha
        );

        return;
    }

    if (
        error instanceof
            OperacionNoSoportadaError
    ) {
        responder(
            res,
            409,
            error.message,
            "OPERACION_NO_SOPORTADA",
            fecha
        );

        return;
    }

    if (error instanceof BusinessRuleError) {
        responder(
            res,
            409,
            error.message,
            "REGLA_NEGOCIO",
            fecha
        );

        return;
    }

    if (error instanceof DomainError) {
        responder(
            res,
            422,
            error.message,
            "ERROR_DOMINIO",
            fecha
        );

        return;
    }

    const mensaje =
        error instanceof Error
            ? error.message
            : "Error desconocido";

    const requestId =
        res.locals.requestId as
            string | undefined;

    logger.error(
        `Error no controlado en ${ruta}: ${mensaje}`,
        {
            requestId,
            ruta,
            stack:
                error instanceof Error
                    ? error.stack
                    : undefined
        }
    );

    responder(
        res,
        500,
        "Ocurrió un error interno en el servidor",
        "ERROR_INTERNO",
        fecha
    );
}

function responder(
    res: Response,
    estadoHttp: number,
    mensaje: string,
    codigo: string,
    fecha: string
): void {
    const requestId =
        res.locals.requestId as
            string | undefined;

    res.status(
        estadoHttp
    ).json({
        mensaje,
        codigo,

        ...(requestId
            ? {
                requestId
            }
            : {}),

        fecha
    });
}