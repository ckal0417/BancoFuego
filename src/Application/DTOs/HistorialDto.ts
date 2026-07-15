import { EstadoTransaccion } from "../../Domain/Enums/EstadoTransaccion";
import { TipoTransaccion } from "../../Domain/Enums/TipoTransaccion";

export interface HistorialItemDto {
    transaccionId: number;
    tipo: TipoTransaccion;
    monto: number;
    estado: EstadoTransaccion;
    fecha: Date;
    saldoAnterior: number;
    saldoPosterior: number;
}