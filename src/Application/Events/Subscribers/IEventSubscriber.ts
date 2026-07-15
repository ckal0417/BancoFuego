import { Evento } from "../../shared/events/Evento";

export interface IEventSubscriber<T = unknown> {
    manejar(evento: Evento<T>): void;
}