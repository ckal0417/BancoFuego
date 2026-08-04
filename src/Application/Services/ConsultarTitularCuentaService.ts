import { ICuentaRepository } from "../Ports/ICuentaRepository";
import { IClienteRepository } from "../Ports/IClienteRepository";
import { NumeroCuenta } from "../../Domain/ValueObjects/NumeroCuenta";

export interface ConsultarTitularCuentaResultadoExiste {
    existe: true;
    nombreTitular: string;
    cuentaId: number;
}

export interface ConsultarTitularCuentaResultadoNoExiste {
    existe: false;
    mensaje: string;
}

export type ConsultarTitularCuentaResultado =
    | ConsultarTitularCuentaResultadoExiste
    | ConsultarTitularCuentaResultadoNoExiste;

export class ConsultarTitularCuentaService {
    constructor(
        private readonly cuentaRepository: ICuentaRepository,
        private readonly clienteRepository: IClienteRepository
    ) {}

    public async ejecutar(
        numeroCuenta: string
    ): Promise<ConsultarTitularCuentaResultado> {
        try {
            NumeroCuenta.desde(numeroCuenta.trim());
        } catch (error) {
            return {
                existe: false,
                mensaje:
                    error instanceof Error
                        ? error.message
                        : "El número de cuenta destino no tiene el formato correcto."
            };
        }

        const cuenta = await this.cuentaRepository.buscarPorNumeroCuenta(
            numeroCuenta.trim()
        );

        if (!cuenta) {
            return {
                existe: false,
                mensaje: "No se encontró la cuenta destino."
            };
        }

        const cliente = await this.clienteRepository.buscarPorId(
            cuenta.obtenerIdCliente()
        );

        if (!cliente) {
            return {
                existe: false,
                mensaje:
                    "No se encontró el titular de la cuenta destino."
            };
        }

        const cuentaId = cuenta.obtenerId();

        if (cuentaId === undefined) {
            return {
                existe: false,
                mensaje:
                    "La cuenta destino no contiene un identificador válido."
            };
        }

        return {
            existe: true,
            nombreTitular: cliente.nombreCompleto(),
            cuentaId
        };
    }
}
