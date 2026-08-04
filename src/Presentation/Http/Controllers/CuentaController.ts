import {
    NextFunction,
    Request,
    Response
} from "express";

import { CuentaService } from "../../../Application/Services/CuentaService";
import { ConsultarTitularCuentaService } from "../../../Application/Services/ConsultarTitularCuentaService";

interface DatosAutenticacion {
    cuentaId: number;
    numeroCuenta: string;
}

export class CuentaController {
    constructor(
        private readonly cuentaService: CuentaService,
        private readonly consultarTitularCuentaService: ConsultarTitularCuentaService
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

    public obtenerPropia = async (
        _req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const autenticacion =
                res.locals.autenticacion as
                    DatosAutenticacion;

            const cuenta =
                await this.cuentaService.obtenerPorId(
                    autenticacion.cuentaId
                );

            res.status(200).json(cuenta);
        } catch (error) {
            next(error);
        }
    };

    public obtenerTitularPorNumeroCuenta = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const numeroCuenta = req.params.numeroCuenta;

            if (typeof numeroCuenta !== "string") {
                res.status(400).json({
                    mensaje:
                        "El número de cuenta destino no es válido."
                });
                return;
            }

            const resultado =
                await this.consultarTitularCuentaService.ejecutar(
                    numeroCuenta
                );

            if (!resultado.existe) {
                res.status(404).json({
                    mensaje: resultado.mensaje
                });
                return;
            }

            res.status(200).json({
                nombreTitular: resultado.nombreTitular
            });
        } catch (error) {
            next(error);
        }
    };
}
