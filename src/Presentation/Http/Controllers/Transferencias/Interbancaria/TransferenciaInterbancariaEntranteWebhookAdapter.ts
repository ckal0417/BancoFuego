import { ValidationError } from "../../../../../Domain/Errors/DomainErrors";
import { ProcesarTransferenciaEntranteRequestDto } from "../../../../../Application/DTOs/Transferencias/Interbancaria/Entrante/ProcesarTransferenciaEntranteDto";
import { TransferenciaInterbancariaEntranteWebhookRequest } from "../../../../Contracts/Api/Transferencias/TransferenciaInterbancariaEntranteWebhookContract";

export class TransferenciaInterbancariaEntranteWebhookAdapter {

    public static aProcesarTransferenciaEntranteDto(
        payload: TransferenciaInterbancariaEntranteWebhookRequest,
        idempotencyKeyHeader?: string
    ): ProcesarTransferenciaEntranteRequestDto {

        const correlationId =
            this.obtenerTextoObligatorio(
                payload.correlationId ?? payload.referenciaExterna,
                "correlationId"
            );

        const codigoBancoOrigen =
            this.obtenerTextoObligatorio(
                payload.codigoBancoOrigen ?? payload.bancoOrigen,
                "codigoBancoOrigen"
            );

        const numeroCuentaOrigen =
            this.obtenerTextoObligatorio(
                payload.numeroCuentaOrigen,
                "numeroCuentaOrigen"
            );

        const numeroCuentaDestino =
            this.obtenerTextoObligatorio(
                payload.numeroCuentaDestino,
                "numeroCuentaDestino"
            );

        const monto =
            this.obtenerMontoValido(
                payload.monto
            );

        const concepto =
            this.obtenerTextoOpcional(
                payload.concepto ?? payload.description
            );

        const idempotencyKey =
            this.obtenerTextoOpcional(
                idempotencyKeyHeader
            );

        return {
            correlationId,
            codigoBancoOrigen,
            numeroCuentaOrigen,
            numeroCuentaDestino,
            monto,
            concepto,
            idempotencyKey
        };
    }

    private static obtenerTextoObligatorio(
        valor: string | undefined,
        nombreCampo: string
    ): string {

        if (
            typeof valor !== "string" ||
            valor.trim().length === 0
        ) {
            throw new ValidationError(
                `El campo ${nombreCampo} es obligatorio.`
            );
        }

        return valor.trim();
    }

    private static obtenerTextoOpcional(
        valor: string | undefined
    ): string | undefined {

        if (valor === undefined) {
            return undefined;
        }

        if (typeof valor !== "string") {
            throw new ValidationError(
                "El campo debe ser texto."
            );
        }

        const limpio =
            valor.trim();

        return limpio.length > 0
            ? limpio
            : undefined;
    }

    private static obtenerMontoValido(
        valor: number | undefined
    ): number {

        if (
            typeof valor !== "number" ||
            !Number.isFinite(valor) ||
            valor <= 0
        ) {
            throw new ValidationError(
                "El campo monto debe ser un numero mayor que cero."
            );
        }

        return valor;
    }

}
