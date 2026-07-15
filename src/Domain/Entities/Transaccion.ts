import { EstadoTransaccion } from "../Enums/EstadoTransaccion";
import { TipoTransaccion } from "../Enums/TipoTransaccion";
import { Dinero } from "../ValueObjects/Dinero";

export class Transaccion {
    private constructor(
        private readonly id: number | undefined,
        private readonly tipo: TipoTransaccion,
        private readonly monto: Dinero,
        private estado: EstadoTransaccion,
        private readonly fecha: Date,
        private readonly descripcion: string | undefined,
        private readonly idCajero: number | undefined
    ) {}

    public static crear(datos: {
        tipo: TipoTransaccion;
        monto: Dinero;
        descripcion?: string;
        idCajero?: number;
    }): Transaccion {
        return new Transaccion(
            undefined,
            datos.tipo,
            datos.monto,
            "EXITOSA",
            new Date(),
            datos.descripcion,
            datos.idCajero
        );
    }

    public static reconstruir(datos: {
        id: number;
        tipo: TipoTransaccion;
        monto: Dinero;
        estado: EstadoTransaccion;
        fecha: Date;
        descripcion?: string;
        idCajero?: number;
    }): Transaccion {
        return new Transaccion(
            datos.id,
            datos.tipo,
            datos.monto,
            datos.estado,
            datos.fecha,
            datos.descripcion,
            datos.idCajero
        );
    }

    public marcarFallida(): void {
        this.estado = "FALLIDA";
    }

    public cancelar(): void {
        this.estado = "CANCELADA";
    }

    public obtenerId(): number | undefined {
        return this.id;
    }

    public obtenerTipo(): TipoTransaccion {
        return this.tipo;
    }

    public obtenerMonto(): Dinero {
        return this.monto;
    }

    public obtenerEstado(): EstadoTransaccion {
        return this.estado;
    }

    public obtenerFecha(): Date {
        return this.fecha;
    }

    public obtenerDescripcion(): string | undefined {
        return this.descripcion;
    }

    public obtenerIdCajero(): number | undefined {
        return this.idCajero;
    }
}