import { NextFunction, Request, Response } from "express";
import { DomainError } from "../../../Domain/Errors/DomainErrors";
import logger from "../../../Shared/Logging/Logger";

export function errorHandler(
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    if (error instanceof DomainError) {
        res.status(error.statusCode).json({
            error: error.code,
            mensaje: error.message
        });

        return;
    }

    const mensaje =
        error instanceof Error
            ? error.message
            : "Error desconocido";

    logger.error(mensaje);

    res.status(500).json({
        error: "INTERNAL_SERVER_ERROR",
        mensaje: "Ocurrió un error interno en el servidor"
    });
}