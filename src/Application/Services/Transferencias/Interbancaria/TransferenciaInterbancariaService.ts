import {
    EstadoTransferenciaInterbancaria,
    TransferenciaInterbancariaRequestDto,
    TransferenciaInterbancariaResponseDto
} from "../../../DTOs/Transferencias/Interbancaria/TransferenciaInterbancariaDto";
import { IRedBancariaClient } from "../../../Ports/Transferencias/Interbancaria/IRedBancariaClient";
import { IUnidadDeTrabajo } from "../../../Ports/IUnidadDeTrabajo";
import { IdempotenciaService } from "../../IdempotenciaService";
import { TransferenciaBaseService } from "../TransferenciaBaseService";
import { Movimiento } from "../../../../Domain/Entities/Movimiento";
import { Transaccion } from "../../../../Domain/Entities/Transaccion";
import { BusinessRuleError, CuentaNoEncontradaError } from "../../../../Domain/Errors/DomainErrors";
import { Dinero } from "../../../../Domain/ValueObjects/Dinero";

export interface ResultadoTransferenciaInterbancaria {
    respuesta: TransferenciaInterbancariaResponseDto;
    operacionNueva: boolean;
}
export class TransferenciaInterbancariaService extends TransferenciaBaseService {
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
        const monto = Dinero.desde(datos.monto);
        const clave = this.idempotenciaService.normalizarClave(datos.idempotencyKey);
        const hashSolicitud = clave ? this.crearHashSolicitud(datos) : undefined;
        return this.unidadDeTrabajo.ejecutar(async repositorios => {
            const idempotencia = await this.comprobarIdempotencia<TransferenciaInterbancariaResponseDto>(
                repositorios.idempotencias,
                datos.cuentaOrigenId,
                clave,
                hashSolicitud
            );
            if (idempotencia.repetida && idempotencia.respuesta) {
                return {
                    respuesta: idempotencia.respuesta,
                    operacionNueva: false
                };
            }
            const cuentaOrigen = await repositorios.cuentas.buscarPorIdParaActualizar(
                datos.cuentaOrigenId
            );
            if (!cuentaOrigen) {
                throw new CuentaNoEncontradaError();
            }
            const retiro = cuentaOrigen.retirar(monto);
            const callbackUrl = process.env.INTERBANK_WEBHOOK_URL;
            if (
                !callbackUrl ||
                callbackUrl.trim().length === 0
            ) {
                throw new Error(
                    "La variable INTERBANK_WEBHOOK_URL es obligatoria"
                );
            }
            const resultadoExterno =
                await this.redBancariaClient.enviarTransferencia({
                    bancoOrigen: "BANCO_FUEGO",
                    bancoDestino: datos.codigoBancoDestino,
                    numeroCuentaOrigen: cuentaOrigen.obtenerNumeroCuenta().toString(),
                    numeroCuentaDestino: datos.numeroCuentaDestino,
                    monto,
                    concepto: datos.concepto,
                    fecha: new Date(),
                    callbackUrl: callbackUrl.trim()
                });
            if (resultadoExterno.estado === "RECHAZADA") {
                throw new BusinessRuleError(
                    resultadoExterno.mensaje ??
                    "La transferencia fue rechazada por la red bancaria.",
                    "TRANSFERENCIA_RECHAZADA"
                );
            }
            const estadoTransaccion = this.obtenerEstadoTransaccion(
                resultadoExterno.estado
            );
            const transaccion = this.crearTransaccion({
                datos,
                monto,
                estado: estadoTransaccion,
                referenciaExterna: resultadoExterno.referenciaExterna,
                mensaje: resultadoExterno.mensaje
            });
            const transaccionId = await repositorios.transacciones.crear(
                transaccion
            );
            const movimiento = this.crearMovimiento({
                monto,
                saldoAnterior: retiro.saldoAnterior,
                saldoNuevo: retiro.saldoNuevo,
                cuentaOrigenId: datos.cuentaOrigenId,
                transaccionId
            });
            await repositorios.movimientos.crear(movimiento);
            await repositorios.cuentas.actualizar(cuentaOrigen);
            const respuesta = this.crearRespuesta({
                cuentaOrigenId: datos.cuentaOrigenId,
                saldoAnterior: retiro.saldoAnterior.toNumber(),
                saldoNuevo: retiro.saldoNuevo.toNumber(),
                transaccionId,
                estado: estadoTransaccion,
                referenciaExterna: resultadoExterno.referenciaExterna,
                mensaje: resultadoExterno.mensaje
            });
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
        });
    }

    private obtenerEstadoTransaccion(
        estadoExterno: "ACEPTADA" | "PENDIENTE"
    ): EstadoTransferenciaInterbancaria {
        return estadoExterno === "ACEPTADA" ? "EXITOSA" : "PENDIENTE";
    }
    private crearHashSolicitud(
        datos: TransferenciaInterbancariaRequestDto
    ): string {
        return this.idempotenciaService.crearHash({
            tipoTransferencia: "TRANSFERENCIA_EXTERNA_SALIENTE",
            cuentaOrigenId: datos.cuentaOrigenId,
            numeroCuentaDestino: datos.numeroCuentaDestino,
            codigoBancoDestino: datos.codigoBancoDestino,
            monto: datos.monto,
            concepto: datos.concepto,
            operacion: "TRANSFERENCIA"
        });
    }
    private crearTransaccion(datosCreacion: {
        datos: TransferenciaInterbancariaRequestDto;
        monto: Dinero;
        estado: EstadoTransferenciaInterbancaria;
        referenciaExterna?: string;
        mensaje?: string;
    }): Transaccion {
        const {
            datos,
            monto,
            estado,
            referenciaExterna,
            mensaje
        } = datosCreacion;
        return Transaccion.crear({
            tipo: "TRANSFERENCIA_EXTERNA_SALIENTE",
            monto,
            estado,
            descripcion:
                datos.concepto ??
                `Transferencia hacia ${datos.codigoBancoDestino}`,
            referenciaExterna,
            estadoDetalle: mensaje
        });
    }

    private crearMovimiento(datos: {
        monto: Dinero;
        saldoAnterior: Dinero;
        saldoNuevo: Dinero;
        cuentaOrigenId: number;
        transaccionId: number;
    }): Movimiento {
        return Movimiento.debito({
            monto: datos.monto,
            saldoAnterior: datos.saldoAnterior,
            saldoPosterior: datos.saldoNuevo,
            idCuenta: datos.cuentaOrigenId,
            idTransaccion: datos.transaccionId
        });
    }
    private crearRespuesta(datos: {
        cuentaOrigenId: number;
        saldoAnterior: number;
        saldoNuevo: number;
        transaccionId: number;
        estado: EstadoTransferenciaInterbancaria;
        referenciaExterna?: string;
        mensaje?: string;
    }): TransferenciaInterbancariaResponseDto {
        return {
            tipo: "TRANSFERENCIA_EXTERNA_SALIENTE",
            origen: {
                cuentaId: datos.cuentaOrigenId,
                saldoAnterior: datos.saldoAnterior,
                saldoNuevo: datos.saldoNuevo
            },
            transaccionId: datos.transaccionId,
            estado: datos.estado,
            referenciaExterna: datos.referenciaExterna,
            mensaje: datos.mensaje
        };
    }
}