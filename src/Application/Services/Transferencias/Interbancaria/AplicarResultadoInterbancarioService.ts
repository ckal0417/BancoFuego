import { ConsultaTransferenciaInterbancariaResponseDto } from "../../../DTOs/Transferencias/Interbancaria/TransferenciaInterbancariaDto";
import { ResultadoTransferenciaInterbancaria } from "../../../Ports/Transferencias/Interbancaria/IRedBancariaClient";
import { RepositoriosTransaccionales } from "../../../Ports/IUnidadDeTrabajo";
import { Movimiento } from "../../../../Domain/Entities/Movimiento";
import { Transaccion } from "../../../../Domain/Entities/Transaccion";
import { BusinessRuleError } from "../../../../Domain/Errors/DomainErrors";

export interface ResultadoAplicacion {
    respuesta: ConsultaTransferenciaInterbancariaResponseDto;
    cambioEstado: boolean;
    reversaAplicada: boolean;
    cuentaOrigenId?: number;
    montoRevertido?: number;
}

export class AplicarResultadoInterbancarioService {
    public async aplicar(
        transaccion: Transaccion,
        resultadoExterno: ResultadoTransferenciaInterbancaria,
        repositorios: RepositoriosTransaccionales
    ): Promise<ResultadoAplicacion> {
        this.validarInterbancaria(transaccion);

        if (resultadoExterno.estado === "PENDIENTE") {
            transaccion.marcarPendiente(
                resultadoExterno.referenciaExterna,
                resultadoExterno.mensaje ?? "La transferencia continúa pendiente."
            );

            await repositorios.transacciones.actualizar(transaccion);

            return {
                respuesta: this.aRespuesta(transaccion),
                cambioEstado: false,
                reversaAplicada: false
            };
        }

        if (resultadoExterno.estado === "ACEPTADA") {
            transaccion.marcarExitosa(
                resultadoExterno.referenciaExterna,
                resultadoExterno.mensaje ?? "Transferencia aceptada por la red bancaria."
            );

            await repositorios.transacciones.actualizar(transaccion);

            return {
                respuesta: this.aRespuesta(transaccion),
                cambioEstado: true,
                reversaAplicada: false
            };
        }

        const reversa = await this.aplicarReversa(transaccion, repositorios);

        const detalleBase =
            resultadoExterno.mensaje ??
            `Transferencia rechazada: ${resultadoExterno.codigoError}`;

        transaccion.marcarFallida(
            reversa.aplicada
                ? `${detalleBase}. Reversa aplicada a la cuenta origen.`
                : `${detalleBase}. No fue posible identificar el movimiento original.`
        );

        await repositorios.transacciones.actualizar(transaccion);

        return {
            respuesta: this.aRespuesta(transaccion),
            cambioEstado: true,
            reversaAplicada: reversa.aplicada,
            cuentaOrigenId: reversa.cuentaOrigenId,
            montoRevertido: reversa.aplicada ? transaccion.obtenerMonto().toNumber() : undefined
        };
    }

    private async aplicarReversa(
        transaccion: Transaccion,
        repositorios: RepositoriosTransaccionales
    ): Promise<{ aplicada: boolean; cuentaOrigenId?: number }> {
        const transaccionId = transaccion.obtenerId();

        if (transaccionId === undefined) {
            return { aplicada: false };
        }

        const movimientos = await repositorios.movimientos.buscarPorTransaccionId(transaccionId);
        const movimientoOriginal = movimientos.find(
            movimiento => movimiento.obtenerNaturaleza() === "DEBITO"
        );

        if (!movimientoOriginal) {
            return { aplicada: false };
        }

        const cuentaOrigenId = movimientoOriginal.obtenerIdCuenta();
        const cuentaOrigen = await repositorios.cuentas.buscarPorIdParaActualizar(cuentaOrigenId);

        if (!cuentaOrigen) {
            return { aplicada: false };
        }

        const deposito = cuentaOrigen.depositar(transaccion.obtenerMonto());

        const movimientoReversa = Movimiento.credito({
            monto: transaccion.obtenerMonto(),
            saldoAnterior: deposito.saldoAnterior,
            saldoPosterior: deposito.saldoNuevo,
            idCuenta: cuentaOrigenId,
            idTransaccion: transaccionId
        });

        await repositorios.cuentas.actualizar(cuentaOrigen);
        await repositorios.movimientos.crear(movimientoReversa);

        return {
            aplicada: true,
            cuentaOrigenId
        };
    }

    private validarInterbancaria(transaccion: Transaccion): void {
        if (transaccion.obtenerTipo() !== "TRANSFERENCIA_EXTERNA") {
            throw new BusinessRuleError(
                "La transacción no corresponde a una transferencia interbancaria.",
                "TRANSACCION_NO_INTERBANCARIA"
            );
        }
    }

    public aRespuesta(transaccion: Transaccion): ConsultaTransferenciaInterbancariaResponseDto {
        const id = transaccion.obtenerId();
        const referencia = transaccion.obtenerReferenciaExterna();

        if (id === undefined || !referencia) {
            throw new BusinessRuleError(
                "La transferencia no contiene información externa completa.",
                "TRANSFERENCIA_EXTERNA_INCOMPLETA"
            );
        }

        const estado = transaccion.obtenerEstado();

        if (estado !== "PENDIENTE" && estado !== "EXITOSA" && estado !== "FALLIDA") {
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
            actualizadoEn: transaccion.obtenerActualizadoEn().toISOString()
        };
    }
}