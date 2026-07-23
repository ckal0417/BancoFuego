import { Evento } from "../../../Shared/Events/Evento";
import { IEventSubscriber } from "../../../Shared/Events/IEventSubscriber";
import logger from "../../../Shared/Logging/Logger";
import { NodemailerEmailService } from "../../../Infrastructure/Email/NodemailerEmailService";
import { CuentaRepositoryPostgres } from "../../../Infrastructure/Database/Repositories/CuentaRepositoryPostgres";
import { ClienteRepositoryPostgres } from "../../../Infrastructure/Database/Repositories/ClienteRepositoryPostgres";

export class CorreoSubscriber implements IEventSubscriber {
    private emailService = new NodemailerEmailService();
    private cuentaRepo = new CuentaRepositoryPostgres();
    private clienteRepo = new ClienteRepositoryPostgres();

    public async manejar(evento: Evento): Promise<void> {
        logger.info(`[CORREO] Procesando evento: ${evento.nombre}`);

        const datos = (evento.datos || {}) as Record<string, any>;
        let destinatario = datos.correoCliente || datos.email;

        if (!destinatario && datos.cuentaId) {
            try {
                const cuenta = await this.cuentaRepo.buscarPorId(datos.cuentaId);
                if (cuenta && cuenta.obtenerIdCliente()) {
                    const cliente = await this.clienteRepo.buscarPorId(cuenta.obtenerIdCliente());
                    if (cliente) {
                        destinatario = cliente.obtenerCorreo();
                    }
                }
            } catch (err: any) {
                logger.error(`[CORREO] Error al buscar correo del cliente para la cuenta ${datos.cuentaId}: ${err?.message || err}`);
            }
        }

        if (!destinatario) {
            logger.info(`[CORREO] No se especificó correo para el evento ${evento.nombre}. Se omite envío SMTP.`);
            return;
        }

        let asunto = `Banco Fuego - Notificación de ${evento.nombre}`;
        let htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ff4500; border-radius: 8px;">
                <h2 style="color: #ff4500;">🔥 Banco Fuego</h2>
                <p>Estimado cliente,</p>
                <p>Le notificamos que se ha registrado una actividad en su cuenta:</p>
                <ul>
                    <li><strong>Evento:</strong> ${evento.nombre}</li>
                    <li><strong>Fecha:</strong> ${new Date().toLocaleString()}</li>
                </ul>
                <p style="color: #666; font-size: 12px;">Si usted no reconoce esta operación, por favor contacte de inmediato con nuestra agencia bancaria.</p>
            </div>
        `;

        if (evento.nombre === 'DEPOSITO_REALIZADO') {
            asunto = '🔥 Banco Fuego - Notificación de Depósito Exitoso';
            htmlContent = `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #28a745; border-radius: 8px;">
                    <h2 style="color: #28a745;">🔥 Banco Fuego - Depósito Confirmado</h2>
                    <p>Se ha abonado exitosamente a su cuenta.</p>
                    <p><strong>Monto Depositado:</strong> $${datos.monto || '0.00'}</p>
                    <p><strong>Nuevo Saldo:</strong> $${datos.saldoNuevo || '0.00'}</p>
                    <p style="color: #666; font-size: 12px;">Gracias por confiar en Banco Fuego.</p>
                </div>
            `;
        } else if (evento.nombre === 'RETIRO_REALIZADO') {
            asunto = '🔥 Banco Fuego - Alerta de Retiro de Efectivo';
            htmlContent = `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #dc3545; border-radius: 8px;">
                    <h2 style="color: #dc3545;">🔥 Banco Fuego - Retiro de Efectivo</h2>
                    <p>Se ha realizado un retiro de dinero en su cuenta.</p>
                    <p><strong>Monto Retirado:</strong> $${datos.monto || '0.00'}</p>
                    <p><strong>Nuevo Saldo:</strong> $${datos.saldoNuevo || '0.00'}</p>
                    <p style="color: #666; font-size: 12px;">Si no realizó esta transacción, bloquee su tarjeta o comuníquese con el banco.</p>
                </div>
            `;
        } else if (evento.nombre === 'TRANSFERENCIA_REALIZADA') {
            const saldoNuevo = datos.origen?.saldoNuevo ?? datos.saldoNuevoOrigen ?? '0.00';
            const montoStr = datos.monto ? Number(datos.monto).toFixed(2) : '0.00';
            asunto = '🔥 Banco Fuego - Comprobante de Transferencia Bancaria';
            htmlContent = `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #007bff; border-radius: 8px;">
                    <h2 style="color: #007bff;">🔥 Banco Fuego - Transferencia Realizada</h2>
                    <p>Se ha completado exitosamente la transferencia de fondos desde su cuenta.</p>
                    <p><strong>Monto Transferido:</strong> $${montoStr}</p>
                    <p><strong>Cuenta Destino:</strong> ${datos.numeroCuentaDestino || 'No especificada'}</p>
                    <p><strong>Tipo de Transferencia:</strong> ${datos.tipo === 'TRANSFERENCIA_EXTERNA' ? 'Interbancaria' : 'Interna (Banco Fuego)'}</p>
                    <p><strong>Nuevo Saldo Disponible:</strong> $${saldoNuevo}</p>
                    <p style="color: #666; font-size: 12px;">Gracias por utilizar nuestros servicios financieros.</p>
                </div>
            `;
        }



        await this.emailService.enviarCorreo({
            para: destinatario,
            asunto,
            html: htmlContent
        });
    }
}