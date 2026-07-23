import { useState } from "react";

import {
    ServiciosTui
} from "../../TuiServices";

import {
    MensajeTui,
    PantallaTui,
    PasoTransferenciaInterbancaria,
    SesionTui
} from "../../TuiTypes";

import {
    pasoTransferenciaInterbancariaInicial
} from "../../TuiState";

import {
    TuiMensajes
} from "../../TuiMensajes";

import {
    TuiValidaciones
} from "../../TuiValidaciones";

interface UseTransferenciaInterbancariaControllerParametros {
    servicios: ServiciosTui;

    sesion: SesionTui | null;

    actualizarSesion: (
        actualizador: (
            sesionActual: SesionTui
        ) => SesionTui
    ) => void;

    mostrarMensaje: (
        mensaje: MensajeTui,
        pantallaSiguiente: PantallaTui
    ) => void;
}

export function useTransferenciaInterbancariaController(
    parametros:
        UseTransferenciaInterbancariaControllerParametros
) {
    const {
        servicios,
        sesion,
        actualizarSesion,
        mostrarMensaje
    } = parametros;

    const [
        codigoBancoDestino,
        setCodigoBancoDestino
    ] = useState("");

    const [
        numeroCuentaDestino,
        setNumeroCuentaDestino
    ] = useState("");

    const [
        montoTransferenciaInterbancaria,
        setMontoTransferenciaInterbancaria
    ] = useState("");

    const [
        conceptoTransferencia,
        setConceptoTransferencia
    ] = useState("");

    const [
        pasoTransferenciaInterbancaria,
        setPasoTransferenciaInterbancaria
    ] =
        useState<PasoTransferenciaInterbancaria>(
            pasoTransferenciaInterbancariaInicial
        );

    const [
        cargandoTransferenciaInterbancaria,
        setCargandoTransferenciaInterbancaria
    ] = useState(false);

    function continuar(): void {
        switch (
            pasoTransferenciaInterbancaria
        ) {
            case "BANCO_DESTINO":
                validarBancoDestino();
                return;

            case "CUENTA_DESTINO":
                validarCuentaDestino();
                return;

            case "MONTO":
                validarMonto();
                return;

            case "CONCEPTO":
                void ejecutar();
                return;
        }
    }

    function validarBancoDestino():
        void {
        const error =
            TuiValidaciones.codigoBanco(
                codigoBancoDestino
            );

        if (error) {
            mostrarMensaje(
                TuiMensajes.error(
                    "Banco inválido",
                    error
                ),
                "TRANSFERENCIA_INTERBANCARIA"
            );

            return;
        }

        setPasoTransferenciaInterbancaria(
            "CUENTA_DESTINO"
        );
    }

    function validarCuentaDestino():
        void {
        const error =
            TuiValidaciones.cuentaDestino(
                numeroCuentaDestino
            );

        if (error) {
            mostrarMensaje(
                TuiMensajes.error(
                    "Cuenta inválida",
                    error
                ),
                "TRANSFERENCIA_INTERBANCARIA"
            );

            return;
        }

        setMontoTransferenciaInterbancaria(
            ""
        );

        setPasoTransferenciaInterbancaria(
            "MONTO"
        );
    }

    function validarMonto(): void {
        const monto =
            TuiValidaciones.monto(
                montoTransferenciaInterbancaria
            );

        if (monto === null) {
            mostrarMensaje(
                TuiMensajes.error(
                    "Monto inválido",
                    "Ingrese un monto superior a 0."
                ),
                "TRANSFERENCIA_INTERBANCARIA"
            );

            return;
        }

        setPasoTransferenciaInterbancaria(
            "CONCEPTO"
        );
    }

    async function ejecutar():
        Promise<void> {
        if (!sesion) {
            mostrarMensaje(
                TuiMensajes.error(
                    "Sesión inválida",
                    "No existe una sesión activa."
                ),
                "LOGIN_TARJETA"
            );

            return;
        }

        const monto =
            TuiValidaciones.monto(
                montoTransferenciaInterbancaria
            );

        if (monto === null) {
            mostrarMensaje(
                TuiMensajes.error(
                    "Monto inválido",
                    "Ingrese un monto superior a 0."
                ),
                "TRANSFERENCIA_INTERBANCARIA"
            );

            return;
        }

        setCargandoTransferenciaInterbancaria(
            true
        );

        try {
            const numeroDestino =
                numeroCuentaDestino.trim();

            const bancoDestino =
                codigoBancoDestino.trim();

            const resultado =
                await servicios
                    .transferenciaService
                    .ejecutar({
                        tipoTransferencia:
                            "INTERBANCARIA",

                        cuentaOrigenId:
                            sesion.cuentaId,

                        numeroCuentaDestino:
                            numeroDestino,

                        codigoBancoDestino:
                            bancoDestino,

                        monto,

                        correoCliente:
                            sesion.correoCliente
                    });

            const nuevoSaldo =
                resultado.origen.saldoNuevo;

            actualizarSesion(
                (sesionActual) => ({
                    ...sesionActual,
                    saldo: nuevoSaldo
                })
            );

            const concepto =
                conceptoTransferencia
                    .trim();

            const detalleConcepto =
                concepto.length > 0
                    ? `\nConcepto: ${concepto}`
                    : "";

            limpiar();

            mostrarMensaje(
                TuiMensajes.exito(
                    "Transferencia interbancaria enviada",

                    `Se enviaron $${monto.toFixed(2)} a la cuenta ${numeroDestino} del banco ${bancoDestino}.${detalleConcepto}\nNuevo saldo: $${nuevoSaldo.toFixed(2)}`
                ),
                "MENU_PRINCIPAL"
            );
        } catch (error: unknown) {
            mostrarMensaje(
                TuiMensajes.desdeError(
                    "Error en transferencia interbancaria",

                    error,

                    "No se pudo procesar la transferencia interbancaria."
                ),
                "TRANSFERENCIA_INTERBANCARIA"
            );
        } finally {
            setCargandoTransferenciaInterbancaria(
                false
            );
        }
    }

    function limpiar(): void {
        setCodigoBancoDestino("");

        setNumeroCuentaDestino("");

        setMontoTransferenciaInterbancaria(
            ""
        );

        setConceptoTransferencia("");

        setPasoTransferenciaInterbancaria(
            pasoTransferenciaInterbancariaInicial
        );

        setCargandoTransferenciaInterbancaria(
            false
        );
    }

    return {
        codigoBancoDestino,
        numeroCuentaDestino,
        montoTransferenciaInterbancaria,
        conceptoTransferencia,
        pasoTransferenciaInterbancaria,
        cargandoTransferenciaInterbancaria,

        setCodigoBancoDestino,
        setNumeroCuentaDestino,
        setMontoTransferenciaInterbancaria,
        setConceptoTransferencia,

        continuar,
        ejecutar,
        limpiar
    };
}

export type TransferenciaInterbancariaController =
    ReturnType<
        typeof useTransferenciaInterbancariaController
    >;