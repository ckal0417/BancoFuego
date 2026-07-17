import { NextFunction, Request, Response } from "express";
import { DepositoService } from "../../../Application/Services/DepositoService";
import { RetiroService } from "../../../Application/Services/RetiroService";
import { OperacionRequestDto } from "../../../Application/DTOs/OperacionDto";

export class OperacionController {
    constructor(
        private readonly depositoService: DepositoService,
        private readonly retiroService: RetiroService
    ) {}

    public depositar = async (
        req: Request<
            Record<string, never>,
            unknown,
            OperacionRequestDto
        >,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const resultado =
                await this.depositoService.ejecutar(
                    req.body
                );

            res.status(201).json(resultado);
        } catch (error) {
            next(error);
        }
    };

    public retirar = async (
        req: Request<
            Record<string, never>,
            unknown,
            OperacionRequestDto
        >,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const resultado =
                await this.retiroService.ejecutar(
                    req.body
                );

            res.status(201).json(resultado);
        } catch (error) {
            next(error);
        }
    };
}