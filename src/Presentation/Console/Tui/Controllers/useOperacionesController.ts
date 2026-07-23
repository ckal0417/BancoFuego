import { useState } from "react";
import { ServiciosTui } from "../TuiServices";
import { HistorialItemTui, MensajeTui, PantallaTui, SesionTui } from "../TuiTypes";
import { TuiMensajes } from "../TuiMensajes";
import { TuiValidaciones } from "../TuiValidaciones";

interface UseOperacionesControllerParametros {
    servicios: ServiciosTui;

    sesion: SesionTui | null;

    actualizarSesion: (
        actualizador: (
            sesionActual: SesionTui
        ) => SesionTui
    ) => void;

    cambiarPantalla: (
        pantalla: PantallaTui
    ) => void;

    mostrarMensaje: (
        mensaje: MensajeTui,
        pantallaSiguiente: PantallaTui
    ) => void;
}

export function useOperacionesController(
    parametros:
        UseOperacionesControllerParametros
) {
    const {
        servicios,
        sesion,
        actualizarSesion,
        cambiarPantalla,
        mostrarMensaje
    } = parametros;

    const [
        montoOperacion,
        setMontoOperacion
    ] = useState("");

    const [
        historialItems,
        setHistorialItems
    ] = useState<HistorialItemTui[]>(
        []
    );

    const [
        cargandoOperacion,
        setCargandoOperacion
    ] = useState(false);

    function iniciarDeposito(): void {
        setMontoOperacion("");

        cambiarPantalla(
            "DEPOSITO"
        );
    }

    function iniciarRetiro(): void {
        setMontoOperacion("");

        cambiarPantalla(
            "RETIRO"
        );
    }

    async function ejecutarDeposito():
        Promise<void> {
        if (!sesion) {
            mostrarSesionInvalida();
            return;
        }

        const monto =
            TuiValidaciones.monto(
                montoOperacion
            );

        if (monto === null) {
            mostrarMensaje(
                TuiMensajes.error(
                    "Monto inválido",
                    "Ingrese un monto superior a 0."
                ),
                "DEPOSITO"
            );

            return;
        }

        setCargandoOperacion(true);

        try {
            const resultado =
                await servicios
                    .depositoService
                    .ejecutar({
                        cuentaId:
                            sesion.cuentaId,

                        monto,

                        correoCliente:
                            sesion.correoCliente
                    });

            actualizarSesion(
                (sesionActual) => ({
                    ...sesionActual,

                    saldo:
                        resultado.saldoNuevo
                })
            );

            setMontoOperacion("");

            mostrarMensaje(
                TuiMensajes.exito(
                    "Depósito exitoso",

                    `Nuevo saldo: $${resultado.saldoNuevo.toFixed(2)}`
                ),
                "MENU_PRINCIPAL"
            );
        } catch (error: unknown) {
            mostrarMensaje(
                TuiMensajes.desdeError(
                    "Error en depósito",

                    error,

                    "No se pudo procesar el depósito."
                ),
                "MENU_PRINCIPAL"
            );
        } finally {
            setCargandoOperacion(false);
        }
    }

    async function ejecutarRetiro():
        Promise<void> {
        if (!sesion) {
            mostrarSesionInvalida();
            return;
        }

        const monto =
            TuiValidaciones.monto(
                montoOperacion
            );

        if (monto === null) {
            mostrarMensaje(
                TuiMensajes.error(
                    "Monto inválido",
                    "Ingrese un monto superior a 0."
                ),
                "RETIRO"
            );

            return;
        }

        setCargandoOperacion(true);

        try {
            const resultado =
                await servicios
                    .retiroService
                    .ejecutar({
                        cuentaId:
                            sesion.cuentaId,

                        monto,

                        correoCliente:
                            sesion.correoCliente
                    });

            actualizarSesion(
                (sesionActual) => ({
                    ...sesionActual,

                    saldo:
                        resultado.saldoNuevo
                })
            );

            setMontoOperacion("");

            mostrarMensaje(
                TuiMensajes.exito(
                    "Retiro exitoso",

                    `Nuevo saldo: $${resultado.saldoNuevo.toFixed(2)}`
                ),
                "MENU_PRINCIPAL"
            );
        } catch (error: unknown) {
            mostrarMensaje(
                TuiMensajes.desdeError(
                    "Error en retiro",

                    error,

                    "Saldo insuficiente o no se pudo procesar el retiro."
                ),
                "MENU_PRINCIPAL"
            );
        } finally {
            setCargandoOperacion(false);
        }
    }

    async function consultarSaldo():
        Promise<void> {
        if (!sesion) {
            mostrarSesionInvalida();
            return;
        }

        setCargandoOperacion(true);

        try {
            const cuenta =
                await servicios
                    .cuentaRepository
                    .buscarPorId(
                        sesion.cuentaId
                    );

            if (cuenta) {
                const saldoActual =
                    cuenta
                        .obtenerSaldo()
                        .toNumber();

                actualizarSesion(
                    (sesionActual) => ({
                        ...sesionActual,
                        saldo: saldoActual
                    })
                );
            }

            cambiarPantalla(
                "SALDO"
            );
        } catch (error: unknown) {
            mostrarMensaje(
                TuiMensajes.desdeError(
                    "Error al consultar saldo",

                    error,

                    "No se pudo consultar el saldo de la cuenta."
                ),
                "MENU_PRINCIPAL"
            );
        } finally {
            setCargandoOperacion(false);
        }
    }

    async function consultarHistorial():
        Promise<void> {
        if (!sesion) {
            mostrarSesionInvalida();
            return;
        }

        setCargandoOperacion(true);

        try {
            const resultado =
                await servicios
                    .historialService
                    .obtenerPorCuenta(
                        sesion.cuentaId
                    );

            setHistorialItems(
                resultado as HistorialItemTui[]
            );

            cambiarPantalla(
                "HISTORIAL"
            );
        } catch (error: unknown) {
            setHistorialItems([]);

            mostrarMensaje(
                TuiMensajes.desdeError(
                    "Error al consultar historial",

                    error,

                    "No se pudo consultar el historial de movimientos."
                ),
                "MENU_PRINCIPAL"
            );
        } finally {
            setCargandoOperacion(false);
        }
    }

    function limpiarOperacion(): void {
        setMontoOperacion("");
        setCargandoOperacion(false);
    }

    function mostrarSesionInvalida():
        void {
        mostrarMensaje(
            TuiMensajes.error(
                "Sesión inválida",

                "No existe una sesión activa."
            ),
            "LOGIN_TARJETA"
        );
    }

    return {
        montoOperacion,
        historialItems,
        cargandoOperacion,

        setMontoOperacion,

        iniciarDeposito,
        iniciarRetiro,
        ejecutarDeposito,
        ejecutarRetiro,
        consultarSaldo,
        consultarHistorial,
        limpiarOperacion
    };
}

export type OperacionesController =
    ReturnType<
        typeof useOperacionesController
    >;