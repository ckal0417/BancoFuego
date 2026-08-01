import { CorrelationId } from "../ValueObjects/CorrelationId";
import { Dinero } from "../ValueObjects/Dinero";
import { NumeroCuenta } from "../ValueObjects/NumeroCuenta";

export class RegistroTransferenciaEntrante {

    private constructor(
        private readonly id: number | undefined,
        private readonly correlationId: CorrelationId,
        private readonly codigoBancoOrigen: string,
        private readonly cuentaOrigen: NumeroCuenta,
        private readonly cuentaDestino: NumeroCuenta,
        private readonly monto: Dinero,
        private readonly concepto: string | undefined,
        private readonly idCuentaDestino: number,
        private readonly procesadoEn: Date
    ) { }

    public static crear(datos: {
        correlationId: CorrelationId;
        codigoBancoOrigen: string;
        cuentaOrigen: NumeroCuenta;
        cuentaDestino: NumeroCuenta;
        monto: Dinero;
        concepto: string | undefined;
        idCuentaDestino: number;
    }): RegistroTransferenciaEntrante {

        return new RegistroTransferenciaEntrante(
            undefined,
            datos.correlationId,
            datos.codigoBancoOrigen,
            datos.cuentaOrigen,
            datos.cuentaDestino,
            datos.monto,
            datos.concepto,
            datos.idCuentaDestino,
            new Date()
        );
    }

    public static reconstruir(datos: {
        id: number;
        correlationId: CorrelationId;
        codigoBancoOrigen: string;
        cuentaOrigen: NumeroCuenta;
        cuentaDestino: NumeroCuenta;
        monto: Dinero;
        concepto: string;
        idCuentaDestino: number;
        procesadoEn: Date;
    }): RegistroTransferenciaEntrante {

        return new RegistroTransferenciaEntrante(
            datos.id,
            datos.correlationId,
            datos.codigoBancoOrigen,
            datos.cuentaOrigen,
            datos.cuentaDestino,
            datos.monto,
            datos.concepto,
            datos.idCuentaDestino,
            datos.procesadoEn
        );
    }

    public obtenerId(): number | undefined {
        return this.id;
    }

    public obtenerCorrelationId(): CorrelationId {
        return this.correlationId;
    }

    public obtenerCodigoBancoOrigen(): string {
        return this.codigoBancoOrigen;
    }

    public obtenerCuentaOrigen(): NumeroCuenta {
        return this.cuentaOrigen;
    }

    public obtenerCuentaDestino(): NumeroCuenta {
        return this.cuentaDestino;
    }

    public obtenerMonto(): Dinero {
        return this.monto;
    }

    public obtenerConcepto(): string | undefined {
        return this.concepto;
    }

    public obtenerIdCuentaDestino(): number {
        return this.idCuentaDestino;
    }

    public obtenerProcesadoEn(): Date {
        return this.procesadoEn;
    }
}