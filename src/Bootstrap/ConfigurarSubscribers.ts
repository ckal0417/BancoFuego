import { SubscriberFactory } from "../Application/Events/SubscriberFactory";
import { IClienteRepository } from "../Application/Ports/IClienteRepository";
import { ICuentaRepository } from "../Application/Ports/ICuentaRepository";
import { NodemailerEmailService } from "../Infrastructure/Email/NodemailerEmailService";
import { EventBus } from "../Shared/Events/EventBus";

export function configurarSubscribers(
    eventBus: EventBus,
    cuentaRepository: ICuentaRepository,
    clienteRepository: IClienteRepository
): void {
    const emailService = new NodemailerEmailService();

    SubscriberFactory.crear(
        eventBus,
        emailService,
        cuentaRepository,
        clienteRepository
    );
}