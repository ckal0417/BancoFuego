import { EstadoTransaccion } from "../../Domain/Enums/EstadoTransaccion";
import { TipoTransaccion } from "../../Domain/Enums/TipoTransaccion";

export interface HistorialItemDto {
    movimientoId: number;
    transaccionId: number;
    tipo: TipoTransaccion;
    monto: number;
    estado: EstadoTransaccion;
    fecha: Date;
    naturaleza?: string;
    saldoAnterior: number;
    saldoPosterior: number;
}