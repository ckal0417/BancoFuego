import {
    TransferenciaInterbancariaRequestDto,
    TransferenciaInterbancariaResponseDto
} from "../../../DTOs/Transferencias/Interbancaria/TransferenciaInterbancariaDto";

import { IRedBancariaClient } from "../../../Ports/Transferencias/Interbancaria/IRedBancariaClient";
import { IUnidadDeTrabajo } from "../../../Ports/IUnidadDeTrabajo";

import { IdempotenciaService } from "../../IdempotenciaService";
import { TransferenciaBaseService } from "../TransferenciaBaseService";

import { Movimiento } from "../../../../Domain/Entities/Movimiento";
import { Transaccion } from "../../../../Domain/Entities/Transaccion";

import {
    BusinessRuleError,
    CuentaNoEncontradaError
} from "../../../../Domain/Errors/DomainErrors";

import { Dinero } from "../../../../Domain/ValueObjects/Dinero";

export interface ResultadoTransferenciaInterbancaria {
    respuesta: TransferenciaInterbancariaResponseDto;
    operacionNueva: boolean;
}

export class TransferenciaInterbancariaService
    extends TransferenciaBaseService
{
    constructor(
        private readonly unidadDeTrabajo: IUnidadDeTrabajo,
        private readonly redBancariaClient: IRedBancariaClient,
        private readonly idempotenciaService: IdempotenciaService
    ) {
        super();
    }

    public async ejecutar(
        datos: TransferenciaInterbancariaRequestDto
    ): Promise<ResultadoTransferenciaInterbancaria> {
        const monto =
            Dinero.desde(datos.monto);

        const clave =
            this.idempotenciaService.normalizarClave(
                datos.idempotencyKey
            );

        const hashSolicitud =
            clave
                ? this.idempotenciaService.crearHash({
                    tipoTransferencia:
                        "TRANSFERENCIA_EXTERNA",
                    cuentaOrigenId:
                        datos.cuentaOrigenId,
                    numeroCuentaDestino:
                        datos.numeroCuentaDestino,
                    codigoBancoDestino:
                        datos.codigoBancoDestino,
                    monto:
                        datos.monto,
                    concepto:
                        datos.concepto,
                    operacion:
                        "TRANSFERENCIA"
                    })
                : undefined;

        return this.unidadDeTrabajo.ejecutar(
            async repositorios => {
                const idempotencia =
                    await this.comprobarIdempotencia<
                        TransferenciaInterbancariaResponseDto
                    >(
                        repositorios.idempotencias,
                        datos.cuentaOrigenId,
                        clave,
                        hashSolicitud
                    );

                if (
                    idempotencia.repetida &&
                    idempotencia.respuesta
                ) {
                    return {
                        respuesta:
                            idempotencia.respuesta,
                        operacionNueva: false
                    };
                }

                const cuentaOrigen =
                    await repositorios.cuentas
                        .buscarPorIdParaActualizar(
                            datos.cuentaOrigenId
                        );

                if (!cuentaOrigen) {
                    throw new CuentaNoEncontradaError();
                }

                const retiro =
                    cuentaOrigen.retirar(monto);

                const resultadoExterno =
                    await this.redBancariaClient
                        .enviarTransferencia({
                            bancoOrigen:
                                "BANCO_FUEGO",

                            bancoDestino:
                                datos.codigoBancoDestino,

                            numeroCuentaOrigen:
                                String(
                                    datos.cuentaOrigenId
                                ),

                            numeroCuentaDestino:
                                datos.numeroCuentaDestino,

                            monto,

                            concepto:
                                datos.concepto,

                            fecha:
                                new Date()
                        });

                if (
                    resultadoExterno.estado ===
                    "RECHAZADA"
                ) {
                    throw new BusinessRuleError(
                        resultadoExterno.mensaje ??
                            "La transferencia fue rechazada por la red bancaria.",
                        "TRANSFERENCIA_RECHAZADA"
                    );
                }

                const estadoTransaccion =
                    resultadoExterno.estado ===
                    "PENDIENTE"
                        ? "PENDIENTE"
                        : "EXITOSA";

                const transaccion =
                    Transaccion.crear({
                        tipo:
                            "TRANSFERENCIA_EXTERNA",

                        monto,

                        estado:
                            estadoTransaccion,

                        descripcion:
                            datos.concepto ??
                            `Transferencia hacia ${datos.codigoBancoDestino}`,

                        referenciaExterna:
                            resultadoExterno
                                .referenciaExterna,

                        estadoDetalle:
                            resultadoExterno
                                .mensaje
                    });

                const transaccionId =
                    await repositorios.transacciones.crear(
                        transaccion
                    );

                const movimiento =
                    Movimiento.debito({
                        monto,
                        saldoAnterior:
                            retiro.saldoAnterior,
                        saldoPosterior:
                            retiro.saldoNuevo,
                        idCuenta:
                            datos.cuentaOrigenId,
                        idTransaccion:
                            transaccionId
                    });

                await repositorios.movimientos.crear(
                    movimiento
                );

                await repositorios.cuentas.actualizar(
                    cuentaOrigen
                );

                const respuesta:
                    TransferenciaInterbancariaResponseDto = {
                        tipo:
                            "TRANSFERENCIA_EXTERNA",

                        origen: {
                            cuentaId:
                                datos.cuentaOrigenId,

                            saldoAnterior:
                                retiro.saldoAnterior.toNumber(),

                            saldoNuevo:
                                retiro.saldoNuevo.toNumber()
                        },

                        transaccionId,

                        estado:
                            estadoTransaccion,

                        referenciaExterna:
                            resultadoExterno
                                .referenciaExterna,

                        mensaje:
                            resultadoExterno
                                .mensaje
                    };

                await this.completarIdempotencia(
                    repositorios.idempotencias,
                    datos.cuentaOrigenId,
                    clave,
                    respuesta
                );

                return {
                    respuesta,
                    operacionNueva: true
                };
            }
        );
    }
}