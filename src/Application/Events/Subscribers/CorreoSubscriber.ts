import { Evento } from "../../../Shared/Events/Evento";
import { IEventSubscriber } from "../../../Shared/Events/IEventSubscriber";
import logger from "../../../Shared/Logging/Logger";

export class CorreoSubscriber
    implements IEventSubscriber {

    public manejar(evento: Evento): void {
        logger.info(
            `[CORREO] Notificación simulada por: ${evento.nombre}`
        );
    }
}