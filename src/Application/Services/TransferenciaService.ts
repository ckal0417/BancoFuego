import { TransferenciaRequestDto, TransferenciaResponseDto} from "../DTOs/TransferenciaDto";
import { IRedBancariaClient } from "../Ports/IRedBancariaClient";
import { IUnidadDeTrabajo } from "../Ports/IUnidadDeTrabajo";
import { Movimiento } from "../../Domain/Entities/Movimiento";
import { Transaccion } from "../../Domain/Entities/Transaccion";
import { BusinessRuleError, CuentaNoEncontradaError, ValidationError} from "../../Domain/Errors/DomainErrors";
import { Dinero } from "../../Domain/ValueObjects/Dinero";
import { TiposEvento } from "../Events/TiposEvento";
import { EventBus } from "../../Shared/Events/EventBus";
import { Evento } from "../../Shared/Events/Evento";

export class TransferenciaService {
    constructor(
        private readonly unidadDeTrabajo:
            IUnidadDeTrabajo,

        private readonly redBancariaClient:
            IRedBancariaClient,

        private readonly eventBus:
            EventBus
    ) {}

    public async ejecutar(
        datos: TransferenciaRequestDto
    ): Promise<TransferenciaResponseDto> {
        const monto =
            Dinero.desde(datos.monto);

        let respuesta:
            TransferenciaResponseDto;

        if (datos.cuentaDestinoId !== undefined) {
            respuesta =
                await this.transferirInternamente(
                    datos.cuentaOrigenId,
                    datos.cuentaDestinoId,
                    monto
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
                    monto
                );
        } else {
            throw new ValidationError(
                "Debes indicar una cuenta interna o los datos del banco destino"
            );
        }

        this.eventBus.publicar(
            new Evento(
                TiposEvento.TRANSFERENCIA_REALIZADA,
                respuesta
            )
        );

        return respuesta;
    }

    private async transferirInternamente(
        cuentaOrigenId: number,
        cuentaDestinoId: number,
        monto: Dinero
    ): Promise<TransferenciaResponseDto> {
        if (cuentaOrigenId === cuentaDestinoId) {
            throw new BusinessRuleError(
                "La cuenta origen y destino no pueden ser la misma",
                "MISMA_CUENTA_TRANSFERENCIA"
            );
        }

        return this.unidadDeTrabajo.ejecutar(
            async repositorios => {
                const cuentaOrigen =
                    await repositorios.cuentas.buscarPorId(
                        cuentaOrigenId
                    );

                const cuentaDestino =
                    await repositorios.cuentas.buscarPorId(
                        cuentaDestinoId
                    );

                if (!cuentaOrigen || !cuentaDestino) {
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
                    await repositorios.transacciones.crear(
                        transaccion
                    );

                const movimientoOrigen =
                    Movimiento.crear({
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

                await repositorios.movimientos.crear(
                    movimientoOrigen
                );

                await repositorios.movimientos.crear(
                    movimientoDestino
                );

                await repositorios.cuentas.actualizar(
                    cuentaOrigen
                );

                await repositorios.cuentas.actualizar(
                    cuentaDestino
                );

                return {
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
            }
        );
    }

    private async transferirInterbancariamente(
        cuentaOrigenId: number,
        numeroCuentaDestino: string,
        codigoBancoDestino: string,
        monto: Dinero
    ): Promise<TransferenciaResponseDto> {
        return this.unidadDeTrabajo.ejecutar(
            async repositorios => {
                const cuentaOrigen =
                    await repositorios.cuentas.buscarPorId(
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

                if (!resultadoExterno.aprobada) {
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
                    await repositorios.transacciones.crear(
                        transaccion
                    );

                const movimiento =
                    Movimiento.crear({
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

                await repositorios.movimientos.crear(
                    movimiento
                );

                await repositorios.cuentas.actualizar(
                    cuentaOrigen
                );

                return {
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
            }
        );
    }
}