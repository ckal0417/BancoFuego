import { NextFunction, Request, Response } from "express";
import { TransferenciaRequestDto } from "../../../Application/DTOs/TransferenciaDto";
import { TransferenciaService } from "../../../Application/Services/TransferenciaService";

export class TransferenciaController {
    constructor(
        private readonly transferenciaService: TransferenciaService
    ) {}

    public transferir = async (
        req: Request<
            Record<string, never>,
            unknown,
            TransferenciaRequestDto
        >,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const resultado = await this.transferenciaService.ejecutar(
                req.body
            );

            res.status(201).json(resultado);
        } catch (error) {
            next(error);
        }
    };
}