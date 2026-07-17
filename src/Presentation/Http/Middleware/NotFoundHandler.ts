import { Request, Response } from "express";

export function notFoundHandler(
    req: Request,
    res: Response
): void {
    res.status(404).json({
        error: "ROUTE_NOT_FOUND",
        mensaje:
            `No existe la ruta ${req.method} ${req.originalUrl}`
    });
}