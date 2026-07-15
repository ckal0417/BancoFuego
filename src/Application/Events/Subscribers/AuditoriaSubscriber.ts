import { Evento } from "../../shared/events/Evento";
import { IEventSubscriber } from "../../Application/interfaces/IEventSubscriber";
import { Consola } from "../../shared/utils/Consola";

export class AuditoriaSubscriber implements IEventSubscriber {
    public manejar(evento: Evento): void {
        Consola.informacion(`[AUDITORÍA] Operación registrada: ${evento.nombre}`);
    }
}