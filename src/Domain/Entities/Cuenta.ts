import { TipoCuenta } from "../Enums/TipoCuenta";
import {
    CuentaInactivaError,
    FondosInsuficientesError,
    MontoInvalidoError
} from "../Errors/DomainErrors";
import { Dinero } from "../ValueObjects/Dinero";
import { NumeroCuenta } from "../ValueObjects/NumeroCuenta";
import { SwitchAccountId } from "../ValueObjects/SwitchAccountId";

export class Cuenta {
    private constructor(
        private readonly id: number | undefined,
        private readonly numeroCuenta: NumeroCuenta,
        private readonly tipo: TipoCuenta,
        private saldo: Dinero,
        private readonly fechaCreacion: Date,
        private activa: boolean,
        private readonly idCliente: number,
        private readonly idBanco: number,
        private switchAccountId?: SwitchAccountId
    ) { }

    public static crear(datos: {
        numeroCuenta: NumeroCuenta;
        tipo: TipoCuenta;
        idCliente: number;
        idBanco: number;
        saldoInicial?: Dinero;
    }): Cuenta {
        return new Cuenta(
            undefined,
            datos.numeroCuenta,
            datos.tipo,
            datos.saldoInicial ?? Dinero.cero(),
            new Date(),
            true,
            datos.idCliente,
            datos.idBanco,
            undefined
        );
    }

    public static reconstruir(datos: {
        id: number;
        numeroCuenta: NumeroCuenta;
        tipo: TipoCuenta;
        saldo: Dinero;
        fechaCreacion: Date;
        activa: boolean;
        idCliente: number;
        idBanco: number;
        switchAccountId?: SwitchAccountId;
    }): Cuenta {
        return new Cuenta(
            datos.id,
            datos.numeroCuenta,
            datos.tipo,
            datos.saldo,
            datos.fechaCreacion,
            datos.activa,
            datos.idCliente,
            datos.idBanco,
            datos.switchAccountId
        );
    }

    public retirar(
        monto: Dinero
    ): {
        saldoAnterior: Dinero;
        saldoNuevo: Dinero;
    } {
        this.asegurarActiva();

        if (!monto.esPositivo()) {
            throw new MontoInvalidoError(
                "El monto a retirar debe ser mayor a cero"
            );
        }

        if (!this.tieneFondosSuficientes(monto)) {
            throw new FondosInsuficientesError();
        }

        const saldoAnterior = this.saldo;
        this.saldo = this.saldo.restar(monto);

        return {
            saldoAnterior,
            saldoNuevo: this.saldo
        };
    }

    public depositar(
        monto: Dinero
    ): {
        saldoAnterior: Dinero;
        saldoNuevo: Dinero;
    } {
        this.asegurarActiva();

        if (!monto.esPositivo()) {
            throw new MontoInvalidoError(
                "El monto a depositar debe ser mayor a cero"
            );
        }

        const saldoAnterior = this.saldo;
        this.saldo = this.saldo.sumar(monto);

        return {
            saldoAnterior,
            saldoNuevo: this.saldo
        };
    }

    private asegurarActiva(): void {
        if (!this.activa) {
            throw new CuentaInactivaError(
                `La cuenta ${this.numeroCuenta.toString()} no está activa`
            );
        }
    }

    public registrarEnSwitch(switchAccountId: SwitchAccountId
    ): void {

        if (this.switchAccountId) {
            throw new Error(
                "La cuenta ya se encuentra registrada en la Red Bancaria"
            );
        }

        this.switchAccountId = switchAccountId;
    }

    public bloquear(): void {
        this.activa = false;
    }

    public reactivar(): void {
        this.activa = true;
    }

    public tieneFondosSuficientes(
        monto: Dinero
    ): boolean {
        return this.saldo.esMayorOIgualQue(monto);
    }

    public obtenerId(): number | undefined {
        return this.id;
    }

    public obtenerNumeroCuenta(): NumeroCuenta {
        return this.numeroCuenta;
    }

    public obtenerTipo(): TipoCuenta {
        return this.tipo;
    }

    public obtenerSaldo(): Dinero {
        return this.saldo;
    }

    public obtenerFechaCreacion(): Date {
        return this.fechaCreacion;
    }

    public obtenerIdCliente(): number {
        return this.idCliente;
    }

    public obtenerIdBanco(): number {
        return this.idBanco;
    }

    public estaActiva(): boolean {
        return this.activa;
    }

    public obtenerSwitchAccountId(): SwitchAccountId | undefined {
        return this.switchAccountId;
    }

    public estaRegistradaEnSwitch(): boolean {
        return this.switchAccountId !== undefined;
    }
}