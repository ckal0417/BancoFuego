import { describe, expect, it, vi } from "vitest";
import { ProcesarTransferenciaEntranteService } from "./ProcesarTransferenciaEntranteService";
import { ProcesarTransferenciasEntrantesService } from "./ProcesarTransferenciasEntrantesService";
import { IdempotenciaService } from "../../../IdempotenciaService";
import {
    IUnidadDeTrabajo,
    RepositoriosTransaccionales
} from "../../../../Ports/IUnidadDeTrabajo";
import {
    IIdempotenciaRepository,
    TipoOperacionIdempotente
} from "../../../../Ports/IIdempotenciaRepository";
import { Cuenta } from "../../../../../Domain/Entities/Cuenta";
import { CorrelationId } from "../../../../../Domain/ValueObjects/CorrelationId";
import { Dinero } from "../../../../../Domain/ValueObjects/Dinero";
import { NumeroCuenta } from "../../../../../Domain/ValueObjects/NumeroCuenta";

interface RegistroIdempotenciaMemoria {
    hashSolicitud: string;
    estado: "EN_PROCESO" | "COMPLETADA";
    codigoRespuesta?: number;
    cuerpoRespuesta?: unknown;
}

function crearCuentaDestino(): Cuenta {
    return Cuenta.reconstruir({
        id: 77,
        numeroCuenta: NumeroCuenta.desde("1234567890"),
        tipo: "AHORRO",
        saldo: Dinero.desde(100),
        fechaCreacion: new Date("2026-01-01T00:00:00.000Z"),
        activa: true,
        idCliente: 10,
        idBanco: 20
    });
}

function crearIdempotenciaMemoria(): {
    repo: IIdempotenciaRepository;
    iniciar: ReturnType<typeof vi.fn>;
    completar: ReturnType<typeof vi.fn>;
} {
    const registros =
        new Map<string, RegistroIdempotenciaMemoria>();

    const claveRegistro = (
        cuentaId: number,
        operacion: TipoOperacionIdempotente,
        clave: string
    ): string => `${cuentaId}|${operacion}|${clave}`;

    const iniciar = vi.fn(async (
        cuentaId: number,
        operacion: TipoOperacionIdempotente,
        clave: string,
        hashSolicitud: string
    ) => {
        const llave =
            claveRegistro(
                cuentaId,
                operacion,
                clave
            );

        const existente =
            registros.get(llave);

        if (!existente) {
            registros.set(llave, {
                hashSolicitud,
                estado: "EN_PROCESO"
            });

            return {
                tipo: "NUEVA" as const
            };
        }

        if (existente.hashSolicitud !== hashSolicitud) {
            return {
                tipo: "CONFLICTO" as const,
                mensaje:
                    "La misma clave de idempotencia no puede utilizarse con datos diferentes"
            };
        }

        if (
            existente.estado === "COMPLETADA" &&
            existente.codigoRespuesta !== undefined
        ) {
            return {
                tipo: "REPETIDA" as const,
                codigoRespuesta:
                    existente.codigoRespuesta,
                cuerpoRespuesta:
                    existente.cuerpoRespuesta
            };
        }

        return {
            tipo: "CONFLICTO" as const,
            mensaje:
                "Ya existe una solicitud en progreso con esta clave de idempotencia"
        };
    });

    const completar = vi.fn(async (
        cuentaId: number,
        operacion: TipoOperacionIdempotente,
        clave: string,
        codigoRespuesta: number,
        cuerpoRespuesta: unknown
    ) => {
        const llave =
            claveRegistro(
                cuentaId,
                operacion,
                clave
            );

        const existente =
            registros.get(llave);

        if (!existente) {
            throw new Error(
                "Registro de idempotencia no encontrado en memoria"
            );
        }

        registros.set(llave, {
            hashSolicitud:
                existente.hashSolicitud,
            estado: "COMPLETADA",
            codigoRespuesta,
            cuerpoRespuesta
        });
    });

    return {
        repo: {
            iniciar,
            completar
        },
        iniciar,
        completar
    };
}

function crearSut(opciones?: {
    onMovimientoCrear?: () => Promise<void>;
}) {
    const cuentaDestino =
        crearCuentaDestino();

    const idempotencia =
        crearIdempotenciaMemoria();

    const cuentas = {
        buscarPorId: vi.fn(async () => null),
        buscarPorIdParaActualizar: vi.fn(async () => null),
        buscarPorNumeroCuenta: vi.fn(async () => null),
        buscarPorNumeroCuentaParaActualizar:
            vi.fn(async () => cuentaDestino),
        crear: vi.fn(async () => 1),
        actualizar: vi.fn(async () => undefined),
        obtenerCuentasSincronizadas:
            vi.fn(async () => [])
    };

    const movimientos = {
        crear: vi.fn(async () => {
            if (opciones?.onMovimientoCrear) {
                await opciones.onMovimientoCrear();
            }

            return 1;
        }),
        buscarPorCuentaId: vi.fn(async () => []),
        buscarPorTransaccionId: vi.fn(async () => [])
    };

    const transacciones = {
        crear: vi.fn(async () => 987),
        actualizar: vi.fn(async () => undefined),
        buscarPorId: vi.fn(async () => null),
        buscarPorIdParaActualizar:
            vi.fn(async () => null),
        buscarTodosPorIds: vi.fn(async () => []),
        buscarPendientesInterbancarias:
            vi.fn(async () => []),
        buscarPorReferenciaExternaParaActualizar:
            vi.fn(async () => null)
    };

    const registroTransferenciasEntrantes = {
        guardar: vi.fn(async () => 1),
        buscarPorCorrelationId:
            vi.fn(async () => null)
    };

    const repositorios: RepositoriosTransaccionales = {
        cuentas,
        movimientos,
        transacciones,
        idempotencias:
            idempotencia.repo,
        registroTransferenciasEntrantes
    };

    const unidadDeTrabajo: IUnidadDeTrabajo = {
        ejecutar: async operacion =>
            operacion(repositorios)
    };

    const servicio =
        new ProcesarTransferenciaEntranteService(
            unidadDeTrabajo,
            new IdempotenciaService()
        );

    return {
        servicio,
        cuentaDestino,
        cuentas,
        movimientos,
        transacciones,
        idempotencia
    };
}

describe("ProcesarTransferenciaEntranteService", () => {
    const solicitudBase = {
        correlationId:
            "ext-abc-001",
        codigoBancoOrigen:
            "BANCO_ORIGEN",
        numeroCuentaOrigen:
            "2200000001",
        numeroCuentaDestino:
            "1234567890",
        monto: 10,
        concepto:
            "Pago de proveedor"
    };

    it("reintento con mismo identificador externo devuelve respuesta previa sin reprocesar", async () => {
        const sut =
            crearSut();

        const primerResultado =
            await sut.servicio.ejecutar(
                solicitudBase
            );

        const segundoResultado =
            await sut.servicio.ejecutar(
                solicitudBase
            );

        expect(
            primerResultado.operacionNueva
        ).toBe(true);

        expect(
            segundoResultado.operacionNueva
        ).toBe(false);

        expect(
            segundoResultado.respuesta
        ).toEqual(
            primerResultado.respuesta
        );

        expect(
            sut.transacciones.crear
        ).toHaveBeenCalledTimes(1);

        expect(
            sut.movimientos.crear
        ).toHaveBeenCalledTimes(1);

        expect(
            sut.idempotencia.iniciar
        ).toHaveBeenNthCalledWith(
            1,
            77,
            "TRANSFERENCIA",
            "ext-abc-001",
            expect.any(String)
        );

        expect(
            sut.idempotencia.completar
        ).toHaveBeenCalledWith(
            77,
            "TRANSFERENCIA",
            "ext-abc-001",
            201,
            primerResultado.respuesta
        );
    });

    it("concurrencia con mismo identificador externo permite una sola operacion y la otra entra en conflicto", async () => {
        let desbloquearMovimiento:
            (() => void) | undefined;

        let notificarMovimiento:
            (() => void) | undefined;

        const movimientoAlcanzado =
            new Promise<void>(resolve => {
                notificarMovimiento =
                    resolve;
            });

        const bloqueoMovimiento =
            new Promise<void>(resolve => {
                desbloquearMovimiento =
                    resolve;
            });

        const sut =
            crearSut({
                onMovimientoCrear: async () => {
                    notificarMovimiento?.();
                    await bloqueoMovimiento;
                }
            });

        const primeraEjecucion =
            sut.servicio.ejecutar(
                solicitudBase
            );

        await movimientoAlcanzado;

        await expect(
            sut.servicio.ejecutar(
                solicitudBase
            )
        ).rejects.toMatchObject({
            code:
                "IDEMPOTENCIA_CONFLICTO"
        });

        desbloquearMovimiento?.();

        const resultadoPrimero =
            await primeraEjecucion;

        expect(
            resultadoPrimero.operacionNueva
        ).toBe(true);

        expect(
            sut.transacciones.crear
        ).toHaveBeenCalledTimes(1);

        expect(
            sut.movimientos.crear
        ).toHaveBeenCalledTimes(1);

        expect(
            sut.cuentaDestino
                .obtenerSaldo()
                .toNumber()
        ).toBe(110);
    });

    it("webhook y polling con la misma correlationId comparten idempotencia y evitan doble abono", async () => {
        const sut =
            crearSut();

        const redBancariaClient = {
            enviarTransferencia: vi.fn(),
            consultarEstado: vi.fn(),
            obtenerTransferenciasEntrantesPendientes: vi.fn(async () => [
                {
                    id: "trx-red-1",
                    correlationId: solicitudBase.correlationId,
                    codigoBancoOrigen: solicitudBase.codigoBancoOrigen,
                    numeroCuentaOrigen: solicitudBase.numeroCuentaOrigen,
                    numeroCuentaDestino: solicitudBase.numeroCuentaDestino,
                    operation: "transfer",
                    type: "credit" as const,
                    amount: solicitudBase.monto,
                    state: "pending",
                    description: solicitudBase.concepto,
                    createdAt: new Date("2026-08-05T00:00:00.000Z")
                }
            ]),
            confirmarTransferenciaEntrantesProcesada: vi.fn(async () => undefined)
        };

        const flujoCompartido =
            new ProcesarTransferenciasEntrantesService(
                redBancariaClient,
                sut.servicio
            );

        const respuestaWebhook =
            await flujoCompartido.procesarTransferenciaEntrante({
                ...solicitudBase,
                idempotencyKey: "header-webhook-distinto"
            });

        await flujoCompartido.ejecutar();

        const respuestaPosterior =
            await flujoCompartido.procesarTransferenciaEntrante(
                solicitudBase
            );

        expect(
            respuestaWebhook.operacionNueva
        ).toBe(true);

        expect(
            respuestaPosterior.operacionNueva
        ).toBe(false);

        expect(
            respuestaPosterior.respuesta
        ).toEqual(
            respuestaWebhook.respuesta
        );

        expect(
            sut.transacciones.crear
        ).toHaveBeenCalledTimes(1);

        expect(
            sut.movimientos.crear
        ).toHaveBeenCalledTimes(1);

        expect(
            sut.idempotencia.iniciar
        ).toHaveBeenNthCalledWith(
            1,
            77,
            "TRANSFERENCIA",
            solicitudBase.correlationId,
            expect.any(String)
        );

        expect(
            redBancariaClient
                .confirmarTransferenciaEntrantesProcesada
        ).toHaveBeenCalledWith(
            CorrelationId.desde(
                solicitudBase.correlationId
            )
        );
    });
});