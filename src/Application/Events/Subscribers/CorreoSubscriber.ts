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

    private async completarDatosCuenta(datos: DatosCorreoEvento): Promise<void> {
        if (datos.numeroCuentaDestino) {
            return;
        }
        const cuentaDestinoId = datos.destino?.cuentaId ?? datos.cuentaDestinoId;
        if (cuentaDestinoId === undefined) {
            return;
        }
        try {
            const cuentaDestino = await this.cuentaRepo.buscarPorId(cuentaDestinoId);

            if (cuentaDestino) {
                datos.numeroCuentaDestino = cuentaDestino.obtenerNumeroCuenta().toString();
            }
        } catch (error: unknown) {
            const mensaje = error instanceof Error ? error.message : String(error);

            logger.warn(
                `[CORREO] No se pudo obtener el número de la cuenta destino ${cuentaDestinoId}: ${mensaje}`
            );
        }
    }
}