import { NextFunction, Request, Response } from "express";
import { HistorialService } from "../../../Application/Services/HistorialService";

export class HistorialController {
    constructor(

        private readonly historialService:HistorialService

    ) {}

    public obtenerPorCuenta = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const cuentaId = Number(req.params.cuentaId);

            if (
                !Number.isInteger(cuentaId) ||
                cuentaId <= 0
            ) {
                res.status(400).json({
                    mensaje: "El identificador de la cuenta no es válido"
                });

                return;
            }

            const historial = await this.historialService.obtenerPorCuenta(cuentaId);

            res.status(200).json(historial);
        } catch (error) {
            next(error);
        }
    };
}