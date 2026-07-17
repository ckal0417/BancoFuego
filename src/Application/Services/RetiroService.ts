import { OperacionRequestDto, OperacionResponseDto } from "../DTOs/OperacionDto";
import { TiposEvento } from "../Events/TiposEvento";
import { IUnidadDeTrabajo } from "../Ports/IUnidadDeTrabajo";
import { Movimiento } from "../../Domain/Entities/Movimiento";
import { Transaccion } from "../../Domain/Entities/Transaccion";
import { CuentaNoEncontradaError } from "../../Domain/Errors/DomainErrors";
import { Dinero } from "../../Domain/ValueObjects/Dinero";
import { EventBus } from "../../Shared/Events/EventBus";
import { Evento } from "../../Shared/Events/Evento";

export class RetiroService {
    constructor(
        private readonly unidadDeTrabajo:
            IUnidadDeTrabajo,

        private readonly eventBus:
            EventBus
    ) {}

    public async ejecutar(
        datos: OperacionRequestDto
    ): Promise<OperacionResponseDto> {
        const respuesta =
            await this.unidadDeTrabajo.ejecutar(
                async repositorios => {
                    const cuenta =
                        await repositorios.cuentas
                            .buscarPorId(
                                datos.cuentaId
                            );

                    if (!cuenta) {
                        throw new CuentaNoEncontradaError();
                    }

                    const monto =
                        Dinero.desde(datos.monto);

                    const resultado =
                        cuenta.retirar(monto);

                    const transaccion =
                        Transaccion.crear({
                            tipo: "RETIRO",
                            monto,
                            descripcion:
                                "Retiro de cuenta"
                        });

                    const transaccionId =
                        await repositorios
                            .transacciones
                            .crear(transaccion);

                    const movimiento =
                        Movimiento.crear({
                            monto,
                            saldoAnterior:
                                resultado.saldoAnterior,
                            saldoPosterior:
                                resultado.saldoNuevo,
                            idCuenta:
                                datos.cuentaId,
                            idTransaccion:
                                transaccionId
                        });

                    const movimientoId =
                        await repositorios
                            .movimientos
                            .crear(movimiento);

                    await repositorios.cuentas
                        .actualizar(cuenta);

                    return {
                        saldoAnterior:
                            resultado.saldoAnterior
                                .toNumber(),

                        saldoNuevo:
                            resultado.saldoNuevo
                                .toNumber(),

                        transaccionId,
                        movimientoId
                    };
                }
            );

        this.eventBus.publicar(
            new Evento(
                TiposEvento.RETIRO_REALIZADO,
                respuesta
            )
        );

        return respuesta;
    }
}