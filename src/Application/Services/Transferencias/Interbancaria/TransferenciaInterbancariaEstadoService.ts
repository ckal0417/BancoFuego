import {
    ConsultaTransferenciaInterbancariaResponseDto
} from "../../../DTOs/Transferencias/Interbancaria/TransferenciaInterbancariaDto";

import {
    IRedBancariaClient,
    ResultadoTransferenciaInterbancaria
} from "../../../Ports/Transferencias/Interbancaria/IRedBancariaClient";

import { IUnidadDeTrabajo } from "../../../Ports/IUnidadDeTrabajo";

import { Movimiento } from "../../../../Domain/Entities/Movimiento";
import { Transaccion } from "../../../../Domain/Entities/Transaccion";

import {
    BusinessRuleError
} from "../../../../Domain/Errors/DomainErrors";

import { TiposEvento } from "../../../Events/TiposEvento";
import { EventBus } from "../../../../Shared/Events/EventBus";
import { Evento } from "../../../../Shared/Events/Evento";
import logger from "../../../../Shared/Logging/Logger";

export class TransferenciaInterbancariaEstadoService {
    constructor(
        private readonly unidadDeTrabajo: IUnidadDeTrabajo,
        private readonly redBancariaClient: IRedBancariaClient,
        private readonly eventBus: EventBus
    ) {}

    public async consultarPorId(
        transaccionId: number
    ): Promise<ConsultaTransferenciaInterbancariaResponseDto> {
        if (
            !Number.isInteger(transaccionId) ||
            transaccionId <= 0
        ) {
            throw new BusinessRuleError(
                "El ID de la transacción no es válido.",
                "TRANSACCION_ID_INVALIDO"
            );
        }

        const transaccion =
            await this.unidadDeTrabajo.ejecutar(
                async repositorios =>
                    repositorios.transacciones.buscarPorId(
                        transaccionId
                    )
            );

        if (!transaccion) {
            throw new BusinessRuleError(
                "La transferencia no fue encontrada.",
                "TRANSFERENCIA_NO_ENCONTRADA"
            );
        }

        this.validarInterbancaria(transaccion);

        if (transaccion.esPendiente()) {
            return this.sincronizarTransaccion(
                transaccionId
            );
        }

        return this.aRespuesta(transaccion);
    }

    public async sincronizarPendientes(
        limite: number = 50
    ): Promise<number> {
        const pendientes =
            await this.unidadDeTrabajo.ejecutar(
                async repositorios =>
                    repositorios.transacciones
                        .buscarPendientesInterbancarias(limite)
            );

        let actualizadas = 0;

        for (const transaccion of pendientes) {
            const id = transaccion.obtenerId();

            if (id === undefined) {
                continue;
            }

            try {
                const resultado =
                    await this.sincronizarTransaccion(id);

                if (resultado.estado !== "PENDIENTE") {
                    actualizadas++;
                }
            } catch (error) {
                const mensaje =
                    error instanceof Error
                        ? error.message
                        : String(error);

                logger.warn(
                    `No se pudo sincronizar la transferencia ${id}: ${mensaje}`
                );
            }
        }

        return actualizadas;
    }

    private async sincronizarTransaccion(
        transaccionId: number
    ): Promise<ConsultaTransferenciaInterbancariaResponseDto> {
        /*
         * Primero obtenemos la referencia sin mantener una
         * transacción de base abierta durante la llamada HTTP.
         */
        const referenciaExterna =
            await this.obtenerReferencia(transaccionId);

        const resultadoExterno =
            await this.redBancariaClient.consultarEstado(
                referenciaExterna
            );

        const resultado =
            await this.unidadDeTrabajo.ejecutar(
                async repositorios => {
                    /*
                     * Bloqueamos la transacción para evitar que dos
                     * workers confirmen o reviertan simultáneamente.
                     */
                    const transaccion =
                        await repositorios.transacciones
                            .buscarPorIdParaActualizar(
                                transaccionId
                            );

                    if (!transaccion) {
                        throw new BusinessRuleError(
                            "La transferencia no fue encontrada.",
                            "TRANSFERENCIA_NO_ENCONTRADA"
                        );
                    }

                    this.validarInterbancaria(transaccion);

                    /*
                     * Otro proceso pudo actualizarla mientras se
                     * consultaba la red. En ese caso no hacemos nada.
                     */
                    if (!transaccion.esPendiente()) {
                        return {
                            respuesta: this.aRespuesta(
                                transaccion
                            ),
                            cambioEstado: false,
                            reversaAplicada: false
                        };
                    }

                    return this.aplicarResultado(
                        transaccion,
                        resultadoExterno,
                        repositorios
                    );
                }
            );

        if (resultado.cambioEstado) {
            this.publicarCambioEstado(
                resultado.respuesta,
                resultado.reversaAplicada
            );
        }

        return resultado.respuesta;
    }

    private async obtenerReferencia(
        transaccionId: number
    ): Promise<string> {
        const transaccion =
            await this.unidadDeTrabajo.ejecutar(
                async repositorios =>
                    repositorios.transacciones.buscarPorId(
                        transaccionId
                    )
            );

        if (!transaccion) {
            throw new BusinessRuleError(
                "La transferencia no fue encontrada.",
                "TRANSFERENCIA_NO_ENCONTRADA"
            );
        }

        this.validarInterbancaria(transaccion);

        const referencia =
            transaccion.obtenerReferenciaExterna();

        if (!referencia) {
            throw new BusinessRuleError(
                "La transferencia no tiene referencia externa.",
                "REFERENCIA_EXTERNA_NO_ENCONTRADA"
            );
        }

        return referencia;
    }

    private async aplicarResultado(
        transaccion: Transaccion,
        resultadoExterno: ResultadoTransferenciaInterbancaria,
        repositorios: Parameters<
            Parameters<IUnidadDeTrabajo["ejecutar"]>[0]
        >[0]
    ): Promise<{
        respuesta: ConsultaTransferenciaInterbancariaResponseDto;
        cambioEstado: boolean;
        reversaAplicada: boolean;
    }> {
        if (resultadoExterno.estado === "PENDIENTE") {
            transaccion.marcarPendiente(
                resultadoExterno.referenciaExterna,
                resultadoExterno.mensaje ??
                    "La transferencia continúa pendiente."
            );

            await repositorios.transacciones.actualizar(
                transaccion
            );

            return {
                respuesta: this.aRespuesta(transaccion),
                cambioEstado: false,
                reversaAplicada: false
            };
        }

        if (resultadoExterno.estado === "ACEPTADA") {
            transaccion.marcarExitosa(
                resultadoExterno.referenciaExterna,
                resultadoExterno.mensaje ??
                    "Transferencia aceptada por la red bancaria."
            );

            await repositorios.transacciones.actualizar(
                transaccion
            );

            return {
                respuesta: this.aRespuesta(transaccion),
                cambioEstado: true,
                reversaAplicada: false
            };
        }

        const reversaAplicada =
            await this.aplicarReversa(
                transaccion,
                repositorios
            );

        const detalleBase =
            resultadoExterno.mensaje ??
            `Transferencia rechazada: ${resultadoExterno.codigoError}`;

        transaccion.marcarFallida(
            reversaAplicada
                ? `${detalleBase}. Reversa aplicada a la cuenta origen.`
                : `${detalleBase}. No fue posible identificar el movimiento original.`
        );

        await repositorios.transacciones.actualizar(
            transaccion
        );

        return {
            respuesta: this.aRespuesta(transaccion),
            cambioEstado: true,
            reversaAplicada
        };
    }

    private async aplicarReversa(
        transaccion: Transaccion,
        repositorios: Parameters<
            Parameters<IUnidadDeTrabajo["ejecutar"]>[0]
        >[0]
    ): Promise<boolean> {
        const transaccionId = transaccion.obtenerId();

        if (transaccionId === undefined) {
            return false;
        }

        const movimientos =
            await repositorios.movimientos
                .buscarPorTransaccionId(transaccionId);

        /*
         * Una interbancaria tiene un único movimiento original:
         * el débito realizado a la cuenta origen.
         */
        const movimientoOriginal = movimientos[0];

        if (!movimientoOriginal) {
            return false;
        }

        const cuentaOrigenId =
            movimientoOriginal.obtenerIdCuenta();

        const cuentaOrigen =
            await repositorios.cuentas
                .buscarPorIdParaActualizar(cuentaOrigenId);

        if (!cuentaOrigen) {
            return false;
        }

        const deposito =
            cuentaOrigen.depositar(
                transaccion.obtenerMonto()
            );

        const movimientoReversa = Movimiento.crear({
            monto: transaccion.obtenerMonto(),
            saldoAnterior: deposito.saldoAnterior,
            saldoPosterior: deposito.saldoNuevo,
            idCuenta: cuentaOrigenId,
            idTransaccion: transaccionId
        });

        await repositorios.cuentas.actualizar(
            cuentaOrigen
        );

        await repositorios.movimientos.crear(
            movimientoReversa
        );

        return true;
    }

    private validarInterbancaria(
        transaccion: Transaccion
    ): void {
        if (
            transaccion.obtenerTipo() !==
            "TRANSFERENCIAINTERBANCARIA"
        ) {
            throw new BusinessRuleError(
                "La transacción no corresponde a una transferencia interbancaria.",
                "TRANSACCION_NO_INTERBANCARIA"
            );
        }
    }

    private aRespuesta(
        transaccion: Transaccion
    ): ConsultaTransferenciaInterbancariaResponseDto {
        const id = transaccion.obtenerId();
        const referencia =
            transaccion.obtenerReferenciaExterna();

        if (id === undefined || !referencia) {
            throw new BusinessRuleError(
                "La transferencia no contiene información externa completa.",
                "TRANSFERENCIA_EXTERNA_INCOMPLETA"
            );
        }

        const estado = transaccion.obtenerEstado();

        if (
            estado !== "PENDIENTE" &&
            estado !== "EXITOSA" &&
            estado !== "FALLIDA"
        ) {
            throw new BusinessRuleError(
                "La transferencia tiene un estado no consultable.",
                "ESTADO_TRANSFERENCIA_INVALIDO"
            );
        }

        return {
            transaccionId: id,
            referenciaExterna: referencia,
            estado,
            mensaje: transaccion.obtenerEstadoDetalle(),
            actualizadoEn:
                transaccion
                    .obtenerActualizadoEn()
                    .toISOString()
        };
    }

    private publicarCambioEstado(
        respuesta: ConsultaTransferenciaInterbancariaResponseDto,
        reversaAplicada: boolean
    ): void {
        this.eventBus.publicar(
            new Evento(
                TiposEvento.TRANSFERENCIA_REALIZADA,
                {
                    canal: "INTERBANCARIA",
                    transaccionId:
                        respuesta.transaccionId,
                    referenciaExterna:
                        respuesta.referenciaExterna,
                    estado: respuesta.estado,
                    reversaAplicada,
                    actualizadoEn:
                        respuesta.actualizadoEn
                }
            )
        );
    }
}