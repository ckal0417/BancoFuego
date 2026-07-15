import { Evento } from "../../shared/events/Evento";
import { IEventSubscriber } from "../../Application/interfaces/IEventSubscriber";
import { Consola } from "../../shared/utils/Consola";

export class LogSubscriber implements IEventSubscriber {
    public manejar(evento: Evento): void {
        Consola.informacion(`[LOG] Evento recibido: ${evento.nombre}`);
    }
}