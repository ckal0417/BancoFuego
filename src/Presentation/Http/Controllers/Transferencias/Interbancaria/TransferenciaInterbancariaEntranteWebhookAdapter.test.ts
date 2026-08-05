import { describe, expect, it } from "vitest";
import { ValidationError } from "../../../../../Domain/Errors/DomainErrors";
import { TransferenciaInterbancariaEntranteWebhookAdapter } from "./TransferenciaInterbancariaEntranteWebhookAdapter";

describe("TransferenciaInterbancariaEntranteWebhookAdapter", () => {
    it("mapea payload valido al DTO canonico", () => {
        const dto =
            TransferenciaInterbancariaEntranteWebhookAdapter
                .aProcesarTransferenciaEntranteDto(
                    {
                        correlationId: "corr-001",
                        codigoBancoOrigen: "BANCO_A",
                        numeroCuentaOrigen: "2200000001",
                        numeroCuentaDestino: "2200000008",
                        monto: 25,
                        concepto: "Pago"
                    },
                    "idem-001"
                );

        expect(dto).toEqual({
            correlationId: "corr-001",
            codigoBancoOrigen: "BANCO_A",
            numeroCuentaOrigen: "2200000001",
            numeroCuentaDestino: "2200000008",
            monto: 25,
            concepto: "Pago",
            idempotencyKey: "idem-001"
        });
    });

    it("usa referenciaExterna como compatibilidad cuando correlationId no viene", () => {
        const dto =
            TransferenciaInterbancariaEntranteWebhookAdapter
                .aProcesarTransferenciaEntranteDto(
                    {
                        referenciaExterna: "ref-legacy-001",
                        codigoBancoOrigen: "BANCO_A",
                        numeroCuentaOrigen: "2200000001",
                        numeroCuentaDestino: "2200000008",
                        monto: 10
                    }
                );

        expect(dto.correlationId).toBe("ref-legacy-001");
    });

    it("lanza ValidationError cuando faltan campos requeridos", () => {
        const casos = [
            {
                payload: {
                    codigoBancoOrigen: "BANCO_A",
                    numeroCuentaOrigen: "2200000001",
                    numeroCuentaDestino: "2200000008",
                    monto: 10
                },
                mensaje: "correlationId"
            },
            {
                payload: {
                    correlationId: "corr-001",
                    numeroCuentaOrigen: "2200000001",
                    numeroCuentaDestino: "2200000008",
                    monto: 10
                },
                mensaje: "codigoBancoOrigen"
            },
            {
                payload: {
                    correlationId: "corr-001",
                    codigoBancoOrigen: "BANCO_A",
                    numeroCuentaDestino: "2200000008",
                    monto: 10
                },
                mensaje: "numeroCuentaOrigen"
            },
            {
                payload: {
                    correlationId: "corr-001",
                    codigoBancoOrigen: "BANCO_A",
                    numeroCuentaOrigen: "2200000001",
                    monto: 10
                },
                mensaje: "numeroCuentaDestino"
            },
            {
                payload: {
                    correlationId: "corr-001",
                    codigoBancoOrigen: "BANCO_A",
                    numeroCuentaOrigen: "2200000001",
                    numeroCuentaDestino: "2200000008"
                },
                mensaje: "monto"
            }
        ];

        for (const caso of casos) {
            expect(() =>
                TransferenciaInterbancariaEntranteWebhookAdapter
                    .aProcesarTransferenciaEntranteDto(
                        caso.payload
                    )
            ).toThrowError(
                new RegExp(caso.mensaje)
            );
        }
    });

    it("lanza ValidationError para monto no valido", () => {
        expect(() =>
            TransferenciaInterbancariaEntranteWebhookAdapter
                .aProcesarTransferenciaEntranteDto({
                    correlationId: "corr-001",
                    codigoBancoOrigen: "BANCO_A",
                    numeroCuentaOrigen: "2200000001",
                    numeroCuentaDestino: "2200000008",
                    monto: 0
                })
        ).toThrowError(ValidationError);
    });
});
