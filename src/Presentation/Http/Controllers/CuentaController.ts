import {
    NextFunction,
    Request,
    Response
} from "express";

import { CuentaService } from "../../../Application/Services/CuentaService";

export class CuentaController {
    constructor(
        private readonly cuentaService: CuentaService
    ) {}

    public obtenerPorId = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id) || id <= 0) {
                res.status(400).json({
                    mensaje:
                        "El identificador de la cuenta no es válido"
                });

                return;
            }

            const cuenta =
                await this.cuentaService.obtenerPorId(id);

            res.status(200).json(cuenta);
        } catch (error) {
            next(error);
        }
    };
}