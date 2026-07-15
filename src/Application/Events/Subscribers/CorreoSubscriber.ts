import { Evento } from "../../shared/events/Evento";
import { IEventSubscriber } from "../../Application/interfaces/IEventSubscriber";
import { Consola } from "../../shared/utils/Consola";

export class CorreoSubscriber implements IEventSubscriber {
    public manejar(evento: Evento): void {
        Consola.informacion(`[CORREO] Notificación enviada al usuario por: ${evento.nombre}`);
    }
}