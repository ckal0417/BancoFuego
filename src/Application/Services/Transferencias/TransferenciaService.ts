import {
    TransferenciaRequestDto,
    TransferenciaResponseDto
} from "../../DTOs/Transferencias/TransferenciaDto";
import { TiposEvento } from "../../Events/TiposEvento";
import { TransferenciaLocalService } from "./Local/TransferenciaLocalService";
import { TransferenciaInterbancariaService } from "./Interbancaria/TransferenciaInterbancariaService";
import { EventBus } from "../../../Shared/Events/EventBus";
import { Evento } from "../../../Shared/Events/Evento";

export class TransferenciaService {
    constructor(
        private readonly transferenciaLocalService:
            TransferenciaLocalService,

        private readonly transferenciaInterbancariaService:
            TransferenciaInterbancariaService,

        private readonly eventBus: EventBus
    ) {}

    public async ejecutar(
        datos: TransferenciaRequestDto
    ): Promise<TransferenciaResponseDto> {
        const resultado =
            datos.tipoTransferencia === "LOCAL"
                ? await this.transferenciaLocalService.ejecutar(
                    datos
                )
                : await this.transferenciaInterbancariaService.ejecutar(
                    datos
                );

        /*
         * No publicamos nuevamente el evento cuando la respuesta
         * proviene de una petición idempotente repetida.
         */
        if (resultado.operacionNueva) {
            this.eventBus.publicar(
                new Evento(
                    TiposEvento.TRANSFERENCIA_REALIZADA,
                    resultado.respuesta
                )
            );
        }

        return resultado.respuesta;
    }
}