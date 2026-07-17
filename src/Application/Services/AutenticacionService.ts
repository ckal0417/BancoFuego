import {
    AutenticacionRequestDto,
    AutenticacionResponseDto
} from "../DTOs/AutenticacionDto";

import { IAutenticacionRepository } from "../Ports/IAutenticacionRepository";
import { ICuentaRepository } from "../Ports/ICuentaRepository";
import { ITarjetaRepository } from "../Ports/ITarjetaRepository";

import {
    AutenticacionNoEncontradaError,
    CuentaNoEncontradaError,
    PinIncorrectoError,
    TarjetaNoEncontradaError
} from "../../Domain/Errors/DomainErrors";

import { IPinHasher } from "../../Domain/ValueObjects/IPinHasher";
import { NumeroTarjeta } from "../../Domain/ValueObjects/NumeroTarjeta";
import { PinTextoPlano } from "../../Domain/ValueObjects/PinTextoPlano";

export class AutenticacionService {
    constructor(
        private readonly tarjetaRepository: ITarjetaRepository,
        private readonly autenticacionRepository:
            IAutenticacionRepository,
        private readonly cuentaRepository: ICuentaRepository,
        private readonly pinHasher: IPinHasher
    ) {}

    public async autenticar(
        datos: AutenticacionRequestDto
    ): Promise<AutenticacionResponseDto> {
        const numeroTarjeta =
            NumeroTarjeta.desde(datos.numeroTarjeta);

        const tarjeta =
            await this.tarjetaRepository.buscarPorNumero(
                numeroTarjeta
            );

        if (!tarjeta) {
            throw new TarjetaNoEncontradaError();
        }

        tarjeta.asegurarUsable();

        const tarjetaId = tarjeta.obtenerId();

        if (tarjetaId === undefined) {
            throw new Error(
                "La tarjeta recuperada no contiene identificador"
            );
        }

        const autenticacion =
            await this.autenticacionRepository
                .buscarPorTarjetaId(tarjetaId);

        if (!autenticacion) {
            throw new AutenticacionNoEncontradaError();
        }

        const pin = PinTextoPlano.desde(datos.pin);

        const pinCorrecto =
            await autenticacion.verificarPin(
                pin,
                this.pinHasher
            );

        await this.autenticacionRepository.actualizar(
            autenticacion
        );

        if (!pinCorrecto) {
            throw new PinIncorrectoError();
        }

        const cuenta =
            await this.cuentaRepository.buscarPorId(
                tarjeta.obtenerIdCuenta()
            );

        if (!cuenta) {
            throw new CuentaNoEncontradaError();
        }

        const cuentaId = cuenta.obtenerId();

        if (cuentaId === undefined) {
            throw new Error(
                "La cuenta recuperada no contiene identificador"
            );
        }

        return {
            token: "",
            cuentaId,
            numeroCuenta:
                cuenta.obtenerNumeroCuenta().toString(),
            saldo:
                cuenta.obtenerSaldo().toNumber()
        };
    }
}