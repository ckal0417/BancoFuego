import {
    IRedBancariaClient, ResultadoTransferenciaInterbancaria,
    SolicitudTransferenciaInterbancaria
} from "../../../../Application/Ports/Transferencias/Interbancaria/IRedBancariaClient";

export class RedBancariaSimuladaClient
    implements IRedBancariaClient
{
    public async enviarTransferencia(
        solicitud: SolicitudTransferenciaInterbancaria
    ): Promise<ResultadoTransferenciaInterbancaria> {
        const referenciaExterna = `EXT-${Date.now()}`;

        /*
         * Por ahora el cliente simulado aprueba las operaciones.
         * Luego podremos configurarlo para devolver también
         * PENDIENTE o RECHAZADA durante las pruebas.
         */
        return {
            estado: "ACEPTADA",
            referenciaExterna,
            mensaje:
                `Transferencia aprobada hacia el banco ` +
                solicitud.bancoDestino
        };
    }

    public async consultarEstado(
        referenciaExterna: string
    ): Promise<ResultadoTransferenciaInterbancaria> {
        return {
            estado: "ACEPTADA",
            referenciaExterna,
            mensaje: "Transferencia confirmada por la red simulada."
        };
    }
}