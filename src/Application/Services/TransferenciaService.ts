import {
    TransferenciaRequestDto,
    TransferenciaResponseDto
} from "../DTOs/TransferenciaDto";

import { TiposEvento } from "../Events/TiposEvento";

import { IRedBancariaClient } from "../Ports/IRedBancariaClient";
import { IUnidadDeTrabajo } from "../Ports/IUnidadDeTrabajo";

import { IdempotenciaService } from "./IdempotenciaService";

import { Movimiento } from "../../Domain/Entities/Movimiento";
import { Transaccion } from "../../Domain/Entities/Transaccion";

import {
    BusinessRuleError,
    CuentaNoEncontradaError,
    ValidationError
} from "../../Domain/Errors/DomainErrors";

import { Dinero } from "../../Domain/ValueObjects/Dinero";

import { EventBus } from "../../Shared/Events/EventBus";
import { Evento } from "../../Shared/Events/Evento";
import { NumeroCuenta } from "../../Domain/ValueObjects/NumeroCuenta";


export class TransferenciaService {
    constructor(
        private readonly unidadDeTrabajo:
            IUnidadDeTrabajo,

        private readonly redBancariaClient:
            IRedBancariaClient,

        private readonly eventBus:
            EventBus,

        private readonly idempotenciaService:
            IdempotenciaService
    ) { }

    public async ejecutar(
        datos: TransferenciaRequestDto
    ): Promise<TransferenciaResponseDto> {
        const monto = Dinero.desde(datos.monto);

        if (!datos.numeroCuentaDestino) {
            throw new ValidationError(
                "El número de cuenta destino es requerido"
            );
        }

        const numeroCuentaDestino =
            NumeroCuenta.desde(datos.numeroCuentaDestino);

        const clave =
            this.idempotenciaService.normalizarClave(
                datos.idempotencyKey
            );

        const hashSolicitud =
            clave
                ? this.idempotenciaService.crearHash({
                    cuentaOrigenId: datos.cuentaOrigenId,
                    numeroCuentaDestino: numeroCuentaDestino.toString(),
                    monto: datos.monto,
                    operacion: "TRANSFERENCIA"
                })
                : undefined;

        let operacionNueva = true;

        const marcarComoRepetida = () => {
            operacionNueva = false;
        };

        /*
         * Resolvemos primero si la cuenta destino es local.
         * Esta consulta corre en su propia unidad de trabajo,
         * de solo lectura (con lock), separada de la operación real.
         */
        const cuentaDestinoLocal =
            await this.unidadDeTrabajo.ejecutar(repositorios =>
                repositorios.cuentas
                    .buscarPorNumeroCuentaParaActualizar(
                        numeroCuentaDestino.toString()
                    )
            );

        let respuesta: TransferenciaResponseDto;

        if (cuentaDestinoLocal) {
            const cuentaDestinoId =
                cuentaDestinoLocal.obtenerId();

            if (cuentaDestinoId === undefined) {
                throw new BusinessRuleError(
                    "La cuenta destino no tiene un identificador válido",
                    "CUENTA_DESTINO_INVALIDA"
                );
            }

            respuesta =
                await this.transferirInternamente(
                    datos.cuentaOrigenId,
                    cuentaDestinoId,
                    monto,
                    clave,
                    hashSolicitud,
                    marcarComoRepetida
                );
        } else {
            const resolucion =
                await this.redBancariaClient
                    .resolverCuentaDestino(
                        numeroCuentaDestino.toString()
                    );

            if (!resolucion) {
                throw new CuentaNoEncontradaError(
                    "No se encontró la cuenta destino"
                );
            }

            respuesta =
                await this.transferirInterbancariamente(
                    datos.cuentaOrigenId,
                    numeroCuentaDestino.toString(),
                    resolucion.codigoBanco,
                    monto,
                    clave,
                    hashSolicitud,
                    marcarComoRepetida
                );
        }

        if (operacionNueva) {
            this.eventBus.publicar(
                new Evento(
                    TiposEvento.TRANSFERENCIA_REALIZADA,
                    respuesta
                )
            );
        }

        return respuesta;
    }

    private async transferirInternamente(
        cuentaOrigenId: number,
        cuentaDestinoId: number,
        monto: Dinero,
        clave: string | undefined,
        hashSolicitud: string | undefined,
        marcarComoRepetida: () => void
    ): Promise<TransferenciaResponseDto> {
        if (
            cuentaOrigenId === cuentaDestinoId
        ) {
            throw new BusinessRuleError(
                "La cuenta origen y destino no pueden ser la misma",
                "MISMA_CUENTA_TRANSFERENCIA"
            );
        }

        return this.unidadDeTrabajo.ejecutar(
            async repositorios => {
                /*
                 * Primero reservamos o consultamos la clave.
                 * Todo ocurre dentro de la misma transacción SQL.
                 */
                if (
                    clave &&
                    hashSolicitud
                ) {
                    const inicio =
                        await repositorios
                            .idempotencias
                            .iniciar(
                                cuentaOrigenId,
                                "TRANSFERENCIA",
                                clave,
                                hashSolicitud
                            );

                    if (
                        inicio.tipo === "REPETIDA"
                    ) {
                        marcarComoRepetida();

                        return inicio
                            .cuerpoRespuesta as
                            TransferenciaResponseDto;
                    }

                    if (
                        inicio.tipo === "CONFLICTO"
                    ) {
                        throw new BusinessRuleError(
                            inicio.mensaje,
                            "IDEMPOTENCIA_CONFLICTO"
                        );
                    }
                }

                /*
                 * Bloqueamos las dos cuentas siempre en el mismo
                 * orden para reducir el riesgo de deadlocks.
                 */
                const [
                    primerId,
                    segundoId
                ] = [
                    cuentaOrigenId,
                    cuentaDestinoId
                ].sort(
                    (a, b) => a - b
                );

                const primeraCuenta =
                    await repositorios.cuentas
                        .buscarPorIdParaActualizar(
                            primerId
                        );

                const segundaCuenta =
                    await repositorios.cuentas
                        .buscarPorIdParaActualizar(
                            segundoId
                        );

                const cuentaOrigen =
                    primerId === cuentaOrigenId
                        ? primeraCuenta
                        : segundaCuenta;

                const cuentaDestino =
                    primerId === cuentaDestinoId
                        ? primeraCuenta
                        : segundaCuenta;

                if (
                    !cuentaOrigen ||
                    !cuentaDestino
                ) {
                    throw new CuentaNoEncontradaError(
                        "No se encontró la cuenta origen o destino"
                    );
                }

                const retiro =
                    cuentaOrigen.retirar(monto);

                const deposito =
                    cuentaDestino.depositar(monto);

                const transaccion =
                    Transaccion.crear({
                        tipo:
                            "TRANSFERENCIA_INTERNA",

                        monto,

                        descripcion:
                            "Transferencia interna"
                    });

                const transaccionId =
                    await repositorios
                        .transacciones
                        .crear(transaccion);

                const movimientoOrigen =
                    Movimiento.crear({
                        naturaleza: "DEBITO",
                        monto,

                        saldoAnterior:
                            retiro.saldoAnterior,

                        saldoPosterior:
                            retiro.saldoNuevo,

                        idCuenta:
                            cuentaOrigenId,

                        idTransaccion:
                            transaccionId
                    });

                const movimientoDestino =
                    Movimiento.crear({
                        naturaleza: "CREDITO",
                        monto,

                        saldoAnterior:
                            deposito.saldoAnterior,

                        saldoPosterior:
                            deposito.saldoNuevo,

                        idCuenta:
                            cuentaDestinoId,

                        idTransaccion:
                            transaccionId
                    });

                await repositorios
                    .movimientos
                    .crear(movimientoOrigen);

                await repositorios
                    .movimientos
                    .crear(movimientoDestino);

                await repositorios
                    .cuentas
                    .actualizar(cuentaOrigen);

                await repositorios
                    .cuentas
                    .actualizar(cuentaDestino);

                const resultadoFinal:
                    TransferenciaResponseDto = {
                    tipo:
                        "TRANSFERENCIAINTERNA",

                    origen: {
                        cuentaId:
                            cuentaOrigenId,

                        saldoAnterior:
                            retiro.saldoAnterior
                                .toNumber(),

                        saldoNuevo:
                            retiro.saldoNuevo
                                .toNumber()
                    },

                    destino: {
                        cuentaId:
                            cuentaDestinoId,

                        saldoAnterior:
                            deposito.saldoAnterior
                                .toNumber(),

                        saldoNuevo:
                            deposito.saldoNuevo
                                .toNumber()
                    },

                    transaccionId
                };

                /*
                 * Guardamos la respuesta antes del COMMIT.
                 * Si algo falla después, también se revierte
                 * este registro de idempotencia.
                 */
                if (clave) {
                    await repositorios
                        .idempotencias
                        .completar(
                            cuentaOrigenId,
                            "TRANSFERENCIA",
                            clave,
                            201,
                            resultadoFinal
                        );
                }

                return resultadoFinal;
            }
        );
    }

    private async transferirInterbancariamente(
        cuentaOrigenId: number,
        numeroCuentaDestino: string,
        codigoBancoDestino: string,
        monto: Dinero,
        clave: string | undefined,
        hashSolicitud: string | undefined,
        marcarComoRepetida: () => void
    ): Promise<TransferenciaResponseDto> {
        return this.unidadDeTrabajo.ejecutar(
            async repositorios => {
                /*
                 * Verificamos primero la idempotencia para impedir
                 * enviar dos veces la misma solicitud a la red.
                 */
                if (
                    clave &&
                    hashSolicitud
                ) {
                    const inicio =
                        await repositorios
                            .idempotencias
                            .iniciar(
                                cuentaOrigenId,
                                "TRANSFERENCIA",
                                clave,
                                hashSolicitud
                            );

                    if (
                        inicio.tipo === "REPETIDA"
                    ) {
                        marcarComoRepetida();

                        return inicio
                            .cuerpoRespuesta as
                            TransferenciaResponseDto;
                    }

                    if (
                        inicio.tipo === "CONFLICTO"
                    ) {
                        throw new BusinessRuleError(
                            inicio.mensaje,
                            "IDEMPOTENCIA_CONFLICTO"
                        );
                    }
                }

                /*
                 * También bloqueamos la cuenta origen para impedir
                 * que dos operaciones gasten el mismo saldo.
                 */
                const cuentaOrigen =
                    await repositorios.cuentas
                        .buscarPorIdParaActualizar(
                            cuentaOrigenId
                        );

                if (!cuentaOrigen) {
                    throw new CuentaNoEncontradaError();
                }

                const retiro =
                    cuentaOrigen.retirar(monto);

                const resultadoExterno =
                    await this.redBancariaClient
                        .transferir({
                            numeroCuentaDestino,
                            codigoBancoDestino,
                            monto
                        });

                if (
                    !resultadoExterno.aprobada
                ) {
                    throw new BusinessRuleError(
                        resultadoExterno.mensaje ??
                        "La transferencia fue rechazada por la red bancaria",

                        "TRANSFERENCIA_RECHAZADA"
                    );
                }

                const transaccion =
                    Transaccion.crear({
                        tipo:
                            "TRANSFERENCIA_EXTERNA",

                        monto,

                        descripcion:
                            `Transferencia hacia ${codigoBancoDestino}`
                    });

                const transaccionId =
                    await repositorios
                        .transacciones
                        .crear(transaccion);

                const movimiento =
                    Movimiento.crear({
                        naturaleza: "DEBITO",
                        monto,

                        saldoAnterior:
                            retiro.saldoAnterior,

                        saldoPosterior:
                            retiro.saldoNuevo,

                        idCuenta:
                            cuentaOrigenId,

                        idTransaccion:
                            transaccionId
                    });

                await repositorios
                    .movimientos
                    .crear(movimiento);

                await repositorios
                    .cuentas
                    .actualizar(cuentaOrigen);

                const resultadoFinal:
                    TransferenciaResponseDto = {
                    tipo:
                        "TRANSFERENCIAINTERBANCARIA",

                    origen: {
                        cuentaId:
                            cuentaOrigenId,

                        saldoAnterior:
                            retiro.saldoAnterior
                                .toNumber(),

                        saldoNuevo:
                            retiro.saldoNuevo
                                .toNumber()
                    },

                    transaccionId,

                    referenciaExterna:
                        resultadoExterno.referencia
                };

                if (clave) {
                    await repositorios
                        .idempotencias
                        .completar(
                            cuentaOrigenId,
                            "TRANSFERENCIA",
                            clave,
                            201,
                            resultadoFinal
                        );
                }

                return resultadoFinal;
            }
        );
    }
}