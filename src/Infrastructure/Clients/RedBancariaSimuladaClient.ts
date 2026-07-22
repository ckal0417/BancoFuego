import { IRedBancariaClient, ResolucionCuentaRed, ResultadoTransferenciaInterbancaria, SolicitudTransferenciaInterbancaria } from "../../Application/Ports/IRedBancariaClient";

export class RedBancariaSimuladaClient implements IRedBancariaClient {
    public async resolverCuentaDestino(numeroCuenta: string):
        Promise<ResolucionCuentaRed | null> {
        return null;
    }

    public async transferir(solicitud: SolicitudTransferenciaInterbancaria): Promise<ResultadoTransferenciaInterbancaria> {

        const referencia = `EXT-${Date.now()}`;

        return {
            aprobada: true,
            referencia,
            mensaje:
                `Transferencia aprobada hacia el banco ${solicitud.codigoBancoDestino}`
        };
    }
}