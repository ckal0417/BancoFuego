import { Dinero } from "../../Domain/Value-Objects/Dinero";

interface IRedBancariaClient {
    enviarTransferenciaInterbancaria(datos: {
        cuentaOrigen: string;
        bancoDestinoCodigo: string;
        cuentaDestino: string;
        monto: Dinero;
        referencia: string;
    }): Promise<{ exitosa: boolean; codigoError?: string }>;
}