import { Evento } from "../../shared/events/Evento";
import { IEventSubscriber } from "../../Application/interfaces/IEventSubscriber";
import { TransaccionRepository } from "../../Infrastructure/repositories/TransaccionRepository";
import { Transaccion } from "../../Domain/Entities/Transaccion";

export class HistorialSubscriber implements IEventSubscriber<Transaccion> {
    constructor(
        private transaccionRepository: TransaccionRepository
    ) {}

    public manejar(evento: Evento<Transaccion>): void {
        this.transaccionRepository.guardar(evento.datos);
    }
}