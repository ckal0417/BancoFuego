import {
    TransferenciaLocalResponseDto
} from "../../DTOs/Transferencias/Local/TransferenciaLocalDto";

import {
    TransferenciaInterbancariaResponseDto
} from "../../DTOs/Transferencias/Interbancaria/TransferenciaInterbancariaDto";

import { TiposEvento } from "../../Events/TiposEvento";
import { PrepararTransferenciaLocalService } from "./Local/PrepararTransferenciaLocalService";
import { TransferenciaInterbancariaService } from "./Interbancaria/TransferenciaInterbancariaService";
import { EventBus } from "../../../Shared/Events/EventBus";
import { Evento } from "../../../Shared/Events/Evento";

export type EjecutarTransferenciaRequest =
    | {
        tipoTransferencia: "LOCAL";
        cuentaOrigenId: number;
        numeroCuentaDestino: string;
        monto: number;
        idempotencyKey?: string;
        correoCliente?: string;
    }
    | {
        tipoTransferencia: "INTERBANCARIA";
        cuentaOrigenId: number;
        numeroCuentaDestino: string;
        codigoBancoDestino: string;
        monto: number;
        concepto?: string;
        idempotencyKey?: string;
        correoCliente?: string;
    };

export type EjecutarTransferenciaResponse = | TransferenciaLocalResponseDto | TransferenciaInterbancariaResponseDto;

export class TransferenciaService {
    constructor(
        private readonly prepararTransferenciaLocalService: PrepararTransferenciaLocalService,
        private readonly transferenciaInterbancariaService: TransferenciaInterbancariaService,
        private readonly eventBus: EventBus
    ) {}

    public async ejecutar(
        datos: EjecutarTransferenciaRequest
    ): Promise<EjecutarTransferenciaResponse> {
        if (datos.tipoTransferencia === "LOCAL") {
            return this.ejecutarTransferenciaLocal(datos);
        }
        return this.ejecutarTransferenciaInterbancaria(datos);
    }

    private async ejecutarTransferenciaLocal(
        datos: Extract<
            EjecutarTransferenciaRequest,
            { tipoTransferencia: "LOCAL" }
        >
    ): Promise<TransferenciaLocalResponseDto> {
        const resultado =
            await this.prepararTransferenciaLocalService.ejecutar({
                
                cuentaOrigenId: datos.cuentaOrigenId,
                numeroCuentaDestino: datos.numeroCuentaDestino,
                monto: datos.monto,
                idempotencyKey: datos.idempotencyKey,
                correoCliente: datos.correoCliente
            });

        /*
         * No se publican nuevamente los eventos cuando la respuesta
         * proviene de una petición idempotente repetida.
         */
        if (resultado.operacionNueva) {
            /*
             * Evento para el titular de la cuenta origen.
             * Representa el dinero debitado.
             */
            this.eventBus.publicar(
                new Evento(
                    TiposEvento.TRANSFERENCIA_REALIZADA,
                    {
                        naturaleza: "DEBITO",
                        tipo: resultado.respuesta.tipo,
                        cuentaId: resultado.respuesta.origen.cuentaId,
                        cuentaOrigenId: resultado.respuesta.origen.cuentaId,
                        cuentaDestinoId: resultado.respuesta.destino.cuentaId,
                        numeroCuentaDestino: datos.numeroCuentaDestino,
                        monto: datos.monto,
                        correoCliente: datos.correoCliente,
                        bancoDestino: "Banco Fuego"
                    }
                )
            );

            /*
             * Evento para el titular de la cuenta destino.
             * Representa el dinero recibido.
             */
            this.eventBus.publicar(
                new Evento(
                    TiposEvento.TRANSFERENCIA_REALIZADA,
                    {
                        naturaleza: "CREDITO",
                        tipo: resultado.respuesta.tipo,
                        cuentaId:  resultado.respuesta.destino.cuentaId,
                        cuentaOrigenId: resultado.respuesta.origen.cuentaId,
                        cuentaDestinoId: resultado.respuesta.destino.cuentaId,
                        numeroCuentaDestino: datos.numeroCuentaDestino,
                        monto:  datos.monto,
                        bancoOrigen: "Banco Fuego"
                    }
                )
            );
        }
        return resultado.respuesta;
    }

    private async ejecutarTransferenciaInterbancaria(
        datos: Extract<
            EjecutarTransferenciaRequest,
            { tipoTransferencia: "INTERBANCARIA" }
        >
    ): Promise<TransferenciaInterbancariaResponseDto> {
        const resultado =
            await this.transferenciaInterbancariaService.ejecutar({
                cuentaOrigenId: datos.cuentaOrigenId,
                numeroCuentaDestino: datos.numeroCuentaDestino,
                codigoBancoDestino: datos.codigoBancoDestino,
                monto: datos.monto,
                concepto: datos.concepto,
                idempotencyKey: datos.idempotencyKey,
                correoCliente: datos.correoCliente
            });

        /*
         * La transferencia interbancaria solo genera aquí
         * el evento de débito para el remitente.
         *
         * No se usan origen ni destino porque la respuesta
         * interbancaria no posee necesariamente esas propiedades.
         */
        if (resultado.operacionNueva) {
            this.eventBus.publicar(
                new Evento(
                    TiposEvento.TRANSFERENCIA_REALIZADA,
                    {
                        naturaleza:  "DEBITO",
                        tipo: resultado.respuesta.tipo,
                        cuentaId: datos.cuentaOrigenId,
                        cuentaOrigenId: datos.cuentaOrigenId,
                        numeroCuentaDestino: datos.numeroCuentaDestino,
                        bancoDestino: datos.codigoBancoDestino,
                        monto: datos.monto,
                        correoCliente: datos.correoCliente,
                        referenciaExterna: resultado.respuesta.referenciaExterna
                    }
                )
            );
        }
        return resultado.respuesta;
    }
}