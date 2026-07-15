import { Dinero } from "../ValueObjects/Dinero";

export class Movimiento {
    private constructor(
        private readonly id: number | undefined,
        private readonly monto: Dinero,
        private readonly saldoAnterior: Dinero,
        private readonly saldoPosterior: Dinero,
        private readonly fecha: Date,
        private readonly idCuenta: number,
        private readonly idTransaccion: number
    ) {}

    public static crear(datos: {
        monto: Dinero;
        saldoAnterior: Dinero;
        saldoPosterior: Dinero;
        idCuenta: number;
        idTransaccion: number;
    }): Movimiento {
        return new Movimiento(
            undefined,
            datos.monto,
            datos.saldoAnterior,
            datos.saldoPosterior,
            new Date(),
            datos.idCuenta,
            datos.idTransaccion
        );
    }

    public static reconstruir(datos: {
        id: number;
        monto: Dinero;
        saldoAnterior: Dinero;
        saldoPosterior: Dinero;
        fecha: Date;
        idCuenta: number;
        idTransaccion: number;
    }): Movimiento {
        return new Movimiento(
            datos.id,
            datos.monto,
            datos.saldoAnterior,
            datos.saldoPosterior,
            datos.fecha,
            datos.idCuenta,
            datos.idTransaccion
        );
    }

    public obtenerId(): number | undefined {
        return this.id;
    }

    public obtenerMonto(): Dinero {
        return this.monto;
    }

    public obtenerSaldoAnterior(): Dinero {
        return this.saldoAnterior;
    }

    public obtenerSaldoPosterior(): Dinero {
        return this.saldoPosterior;
    }

    public obtenerFecha(): Date {
        return this.fecha;
    }

    public obtenerIdCuenta(): number {
        return this.idCuenta;
    }

    public obtenerIdTransaccion(): number {
        return this.idTransaccion;
    }
}