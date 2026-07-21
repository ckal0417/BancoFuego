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
    ) {}

    public async ejecutar(
        datos: TransferenciaRequestDto
    ): Promise<TransferenciaResponseDto> {
        const monto =
            Dinero.desde(datos.monto);

        const clave =
            this.idempotenciaService.normalizarClave(
                datos.idempotencyKey
            );

        const hashSolicitud =
            clave
                ? this.idempotenciaService.crearHash({
                    cuentaOrigenId:
                        datos.cuentaOrigenId,

                    cuentaDestinoId:
                        datos.cuentaDestinoId,

                    numeroCuentaDestino:
                        datos.numeroCuentaDestino,

                    codigoBancoDestino:
                        datos.codigoBancoDestino,

                    monto:
                        datos.monto,

                    operacion:
                        "TRANSFERENCIA"
                })
                : undefined;

        let operacionNueva = true;

        let respuesta:
            TransferenciaResponseDto;

        if (
            datos.cuentaDestinoId !== undefined
        ) {
            respuesta =
                await this.transferirInternamente(
                    datos.cuentaOrigenId,
                    datos.cuentaDestinoId,
                    monto,
                    clave,
                    hashSolicitud,
                    () => {
                        operacionNueva = false;
                    }
                );
        } else if (
            datos.numeroCuentaDestino &&
            datos.codigoBancoDestino
        ) {
            respuesta =
                await this.transferirInterbancariamente(
                    datos.cuentaOrigenId,
                    datos.numeroCuentaDestino,
                    datos.codigoBancoDestino,
                    monto,
                    clave,
                    hashSolicitud,
                    () => {
                        operacionNueva = false;
                    }
                );
        } else {
            throw new ValidationError(
                "Debes indicar una cuenta interna o los datos del banco destino"
            );
        }

        /*
         * Una petición idempotente repetida no debe publicar
         * otra vez el evento, porque la transferencia ya ocurrió.
         */
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
                            "TRANSFERENCIAINTERNA",

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
                            "TRANSFERENCIAINTERBANCARIA",

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