import { Evento } from "../../../Shared/Events/Evento";
import { IEventSubscriber } from "../../../Shared/Events/IEventSubscriber";
import logger from "../../../Shared/Logging/Logger";
import { DatosCorreoEvento } from "./Correo/DatosCorreoEvento";
import { crearPlantillaCorreo } from "./Correo/PlantillasCorreo";
import { IEmailService } from "../../Ports/IEmailService";
import { ICuentaRepository } from "../../Ports/ICuentaRepository";
import { IClienteRepository } from "../../Ports/IClienteRepository";

export class CorreoSubscriber implements IEventSubscriber {
    constructor(
        private readonly emailService: IEmailService,
        private readonly cuentaRepo: ICuentaRepository,
        private readonly clienteRepo: IClienteRepository
    ) {}

    public async manejar(evento: Evento): Promise<void> {

        logger.info(`[CORREO] Procesando evento: ${evento.nombre}`);
        const datos = (evento.datos ?? {}) as DatosCorreoEvento;
        const destinatario = await this.obtenerDestinatario(datos);
        if (!destinatario) {
            logger.info(
                `[CORREO] No se especificó correo para el evento ${evento.nombre}. Se omite envío SMTP.`
            );
            return;
        }
        await this.completarDatosCuenta(datos);
        const plantilla = crearPlantillaCorreo(evento.nombre, datos);
        await this.emailService.enviarCorreo({
            para: destinatario,
            asunto: plantilla.asunto,
            html: plantilla.html
        });
    }

    private async obtenerDestinatario(datos: DatosCorreoEvento): Promise<string | undefined> {
        
        const correoRecibido = datos.correoCliente ?? datos.email;
        if (correoRecibido) {
            return correoRecibido;
        }
        const cuentaIdBusqueda = datos.cuentaId ?? datos.origen?.cuentaId;
        if (cuentaIdBusqueda === undefined) {
            return undefined;
        }
        try {
            const cuenta = await this.cuentaRepo.buscarPorId(cuentaIdBusqueda);
            const clienteId = cuenta?.obtenerIdCliente();

            if (clienteId === undefined) {
                return undefined;
            }

            const cliente = await this.clienteRepo.buscarPorId(clienteId);
            return cliente?.obtenerCorreo();
        } catch (error: unknown) {
            const mensaje = error instanceof Error ? error.message : String(error);

            logger.error(
                `[CORREO] Error al buscar correo del cliente para la cuenta ${cuentaIdBusqueda}: ${mensaje}`
            );
            return undefined;
        }
    }

private async completarDatosCuenta(
    datos: DatosCorreoEvento
): Promise<void> {
    await this.completarDatosCuentaOrigen(datos);
    await this.completarDatosCuentaDestino(datos);
}

private async completarDatosCuentaOrigen(
    datos: DatosCorreoEvento
): Promise<void> {
    const cuentaOrigenId =
        datos.origen?.cuentaId ??
        datos.cuentaOrigenId ??
        (
            datos.naturaleza === "DEBITO"
                ? datos.cuentaId
                : undefined
        );

    if (cuentaOrigenId === undefined) {
        return;
    }

    try {
        const cuentaOrigen =
            await this.cuentaRepo.buscarPorId(
                cuentaOrigenId
            );

        if (!cuentaOrigen) {
            return;
        }

        if (!datos.numeroCuentaOrigen) {
            datos.numeroCuentaOrigen =
                cuentaOrigen
                    .obtenerNumeroCuenta()
                    .toString();
        }

        if (!datos.nombreTitularOrigen) {
            const clienteId =
                cuentaOrigen.obtenerIdCliente();

            const cliente =
                await this.clienteRepo.buscarPorId(
                    clienteId
                );

            if (cliente) {
                datos.nombreTitularOrigen =
                    cliente.nombreCompleto();
            }
        }
    } catch (error: unknown) {
        const mensaje =
            error instanceof Error
                ? error.message
                : String(error);

        logger.warn(
            `[CORREO] No se pudieron completar los datos ` +
            `de la cuenta origen ${cuentaOrigenId}: ${mensaje}`
        );
    }
}

    private async completarDatosCuentaDestino(
        datos: DatosCorreoEvento
    ): Promise<void> {
        const cuentaDestinoId =
            datos.destino?.cuentaId ??
            datos.cuentaDestinoId ??
            (
                datos.naturaleza === "CREDITO"
                    ? datos.cuentaId
                    : undefined
            );

        if (cuentaDestinoId === undefined) {
            return;
        }

        try {
            const cuentaDestino =
                await this.cuentaRepo.buscarPorId(
                    cuentaDestinoId
                );

            if (!cuentaDestino) {
                return;
            }

            if (!datos.numeroCuentaDestino) {
                datos.numeroCuentaDestino =
                    cuentaDestino
                        .obtenerNumeroCuenta()
                        .toString();
            }

            if (!datos.nombreTitularDestino) {
                const clienteId =
                    cuentaDestino.obtenerIdCliente();

                const cliente =
                    await this.clienteRepo.buscarPorId(
                        clienteId
                    );

                if (cliente) {
                    datos.nombreTitularDestino =
                        cliente.nombreCompleto();
                }
            }
        } catch (error: unknown) {
            const mensaje =
                error instanceof Error
                    ? error.message
                    : String(error);

            logger.warn(
                `[CORREO] No se pudieron completar los datos ` +
                `de la cuenta destino ${cuentaDestinoId}: ${mensaje}`
            );
        }
    }
}