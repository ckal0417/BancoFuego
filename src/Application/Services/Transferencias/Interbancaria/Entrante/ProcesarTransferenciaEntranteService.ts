import { Movimiento } from "../../../../../Domain/Entities/Movimiento";
import { RegistroTransferenciaEntrante } from "../../../../../Domain/Entities/RegistroTransferenciaEntrante";
import { Transaccion } from "../../../../../Domain/Entities/Transaccion";
import { CuentaNoEncontradaError } from "../../../../../Domain/Errors/DomainErrors";
import { CorrelationId } from "../../../../../Domain/ValueObjects/CorrelationId";
import { Dinero } from "../../../../../Domain/ValueObjects/Dinero";
import { NumeroCuenta } from "../../../../../Domain/ValueObjects/NumeroCuenta";
import { ProcesarTransferenciaEntranteRequestDto, ProcesarTransferenciaEntranteResponseDto } from "../../../../DTOs/Transferencias/Interbancaria/Entrante/ProcesarTransferenciaEntranteDto";
import { IUnidadDeTrabajo } from "../../../../Ports/IUnidadDeTrabajo";
import { IdempotenciaService } from "../../../IdempotenciaService";
import { TransferenciaBaseService } from "../../TransferenciaBaseService";

export interface ResultadoProcesarTransferenciaEntrante {
    respuesta: ProcesarTransferenciaEntranteResponseDto;
    operacionNueva: boolean;
}

export class ProcesarTransferenciaEntranteService
    extends TransferenciaBaseService {

    constructor(
        private readonly unidadDeTrabajo: IUnidadDeTrabajo,
        private readonly idempotenciaService: IdempotenciaService
    ) {
        super();
    }

    public async ejecutar(
        datos: ProcesarTransferenciaEntranteRequestDto
    ): Promise<ResultadoProcesarTransferenciaEntrante> {

        const monto =
            Dinero.desde(datos.monto);

        const correlationId =
            CorrelationId.desde(datos.correlationId);

        const clave =
            this.idempotenciaService.normalizarClave(
                datos.idempotencyKey ??
                datos.correlationId
            );

        const hashSolicitud =
            clave
                ? this.idempotenciaService.crearHash({
                    operacion: "TRANSFERENCIA_ENTRANTE",
                    correlationId: datos.correlationId,
                    cuentaDestino: datos.numeroCuentaDestino,
                    monto: datos.monto
                })
                : undefined;

        return this.unidadDeTrabajo.ejecutar(
            async repositorios => {
                const cuentaDestino =
                    await repositorios.cuentas
                        .buscarPorNumeroCuentaParaActualizar(
                            datos.numeroCuentaDestino
                        );

                if (!cuentaDestino) {
                    throw new CuentaNoEncontradaError();
                }

                const cuentaDestinoId =
                    cuentaDestino.obtenerId();

                if (cuentaDestinoId === undefined) {
                    throw new Error(
                        "La cuenta destino no tiene un identificador válido."
                    );
                }

                const idempotencia = await this.comprobarIdempotencia<ProcesarTransferenciaEntranteResponseDto>(
                    repositorios.idempotencias,
                    cuentaDestinoId,
                    clave,
                    hashSolicitud
                );

                if (
                    idempotencia.repetida &&
                    idempotencia.respuesta
                ) {
                    return {
                        respuesta: idempotencia.respuesta,
                        operacionNueva: false
                    };
                }

                const deposito = cuentaDestino.depositar(monto);

                const transaccion = Transaccion.crear({
                    tipo: "TRANSFERENCIA_EXTERNA_ENTRANTE",
                    monto,
                    estado: "EXITOSA",
                    descripcion: datos.concepto,
                    referenciaExterna: datos.correlationId,
                    estadoDetalle: "Transferencia acreditada."
                });

                const transaccionId = await repositorios.transacciones.crear(transaccion);

                const movimiento = Movimiento.credito({
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
                    movimiento
                );

                await repositorios.cuentas.actualizar(
                    cuentaDestino
                );

                const registroTransferencia = RegistroTransferenciaEntrante.crear({
                    correlationId,
                    codigoBancoOrigen:
                        datos.codigoBancoOrigen,
                    cuentaOrigen: NumeroCuenta.desde(
                        datos.numeroCuentaOrigen
                    ),
                    cuentaDestino: NumeroCuenta.desde(
                        datos.numeroCuentaDestino
                    ),
                    monto,
                    concepto: datos.concepto,
                    idCuentaDestino: cuentaDestinoId

                });

                await repositorios
                    .registroTransferenciasEntrantes
                    .guardar(
                        registroTransferencia
                    );


                const respuesta: ProcesarTransferenciaEntranteResponseDto = {
                    tipo: "TRANSFERENCIA_EXTERNA_ENTRANTE",
                    cuentaDestino: {
                        cuentaId: cuentaDestinoId,
                        saldoAnterior: deposito
                            .saldoAnterior
                            .toNumber(),
                        saldoNuevo: deposito
                            .saldoNuevo
                            .toNumber()
                    },
                    transaccionId,
                    correlationId: datos.correlationId,
                    mensaje: "Transferencia acreditada correctamente."
                };

                await this.completarIdempotencia(
                    repositorios.idempotencias,
                    cuentaDestinoId,
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