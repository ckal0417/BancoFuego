import { Movimiento } from "../../../../Domain/Entities/Movimiento";
import { Transaccion } from "../../../../Domain/Entities/Transaccion";
import { Dinero } from "../../../../Domain/ValueObjects/Dinero";
import {
    RecibirTransferenciaInterbancariaRequestDto,
    RecibirTransferenciaInterbancariaResponseDto
} from "../../../DTOs/Transferencias/Interbancaria/RecibirTransferenciaInterbancaria";
import { IUnidadDeTrabajo } from "../../../Ports/IUnidadDeTrabajo";
import { TiposEvento } from "../../../Events/TiposEvento";
import { EventBus } from "../../../../Shared/Events/EventBus";
import { Evento } from "../../../../Shared/Events/Evento";

export class RecibirTransferenciaInterbancariaService {
    constructor(
        private readonly unidadDeTrabajo: IUnidadDeTrabajo,
        private readonly eventBus: EventBus
    ) {}

    public async recibir(
        datos: RecibirTransferenciaInterbancariaRequestDto
    ): Promise<RecibirTransferenciaInterbancariaResponseDto> {
        const monto = Dinero.desde(datos.monto);
        const resultado = await this.unidadDeTrabajo.ejecutar(async repositorios => {
            const existente = await repositorios.transacciones.buscarPorReferenciaExternaParaActualizar(
                datos.referenciaExterna
            );
            if (existente) {
                return {
                    respuesta: {
                        estado: "ACEPTADA" as const,
                        referenciaExterna: datos.referenciaExterna,
                        transaccionId: existente.obtenerId(),
                        mensaje: "Operación ya procesada previamente."
                    },
                    operacionNueva: false,
                    cuentaDestinoId: undefined
                };
            }
            const cuentaDestino = await repositorios.cuentas.buscarPorNumeroCuentaParaActualizar(
                datos.numeroCuentaDestino
            );
            if (!cuentaDestino) {
                return {
                    respuesta: {
                        estado: "RECHAZADA" as const,
                        referenciaExterna: datos.referenciaExterna,
                        codigoError: "CUENTA_DESTINO_NO_EXISTE",
                        mensaje: "La cuenta destino no existe en este banco."
                    },
                    operacionNueva: false,
                    cuentaDestinoId: undefined
                };
            }
            let credito;
            try {
                credito = cuentaDestino.depositar(monto);
            } catch (error) {
                return {
                    respuesta: {
                        estado: "RECHAZADA" as const,
                        referenciaExterna: datos.referenciaExterna,
                        codigoError: "CUENTA_NO_PUEDE_RECIBIR",
                        mensaje: error instanceof Error
                            ? error.message
                            : "No se pudo acreditar la cuenta destino."
                    },
                    operacionNueva: false,
                    cuentaDestinoId: undefined
                };
            }
            const transaccion = Transaccion.crear({
                tipo: "TRANSFERENCIA_ENTRANTE",
                monto,
                estado: "EXITOSA",
                descripcion: datos.concepto ?? `Transferencia recibida de ${datos.bancoOrigen}`,
                referenciaExterna: datos.referenciaExterna
            });
            const transaccionId = await repositorios.transacciones.crear(transaccion);
            const cuentaDestinoId = cuentaDestino.obtenerId();
            if (cuentaDestinoId === undefined) {
                throw new Error("La cuenta destino no tiene un identificador válido.");
            }
            const movimiento = Movimiento.credito({
                monto,
                saldoAnterior: credito.saldoAnterior,
                saldoPosterior: credito.saldoNuevo,
                idCuenta: cuentaDestinoId,
                idTransaccion: transaccionId
            });
            await repositorios.movimientos.crear(movimiento);
            await repositorios.cuentas.actualizar(cuentaDestino);
            return {
                respuesta: {
                    estado: "ACEPTADA" as const,
                    referenciaExterna: datos.referenciaExterna,
                    transaccionId
                },
                operacionNueva: true,
                cuentaDestinoId
            };
        });

        if (resultado.operacionNueva && resultado.cuentaDestinoId !== undefined) {
            this.eventBus.publicar(
                new Evento(TiposEvento.TRANSFERENCIA_REALIZADA, {
                    naturaleza: "CREDITO",
                    tipo: "TRANSFERENCIA_ENTRANTE",
                    cuentaId: resultado.cuentaDestinoId,
                    cuentaDestinoId: resultado.cuentaDestinoId,
                    numeroCuentaDestino: datos.numeroCuentaDestino,
                    bancoOrigen: datos.bancoOrigen,
                    monto: datos.monto,
                    referenciaExterna: datos.referenciaExterna
                })
            );
        }
        return resultado.respuesta;
    }
}