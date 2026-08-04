import { useState } from "react";
import { ServiciosTui } from "../../TuiServices";
import { MensajeTui, PantallaTui, PasoTransferenciaLocal, SesionTui } from "../../TuiTypes";
import { pasoTransferenciaLocalInicial } from "../../TuiState";
import { TuiMensajes } from "../../TuiMensajes";
import { TuiValidaciones } from "../../TuiValidaciones";

interface UseTransferenciaLocalControllerParametros {
    servicios: ServiciosTui;
    sesion: SesionTui | null;
    actualizarSesion: (actualizador: (sesionActual: SesionTui) => SesionTui) => void;
    mostrarMensaje: (mensaje: MensajeTui, pantallaSiguiente: PantallaTui) => void;
    mostrarConfirmacion: (mensaje: MensajeTui) => void;
}

export function useTransferenciaLocalController(parametros: UseTransferenciaLocalControllerParametros) {
    
    const { servicios, sesion, actualizarSesion, mostrarMensaje, mostrarConfirmacion } = parametros;
    const [numeroCuentaDestino, setNumeroCuentaDestino] = useState("");
    const [montoTransferenciaLocal, setMontoTransferenciaLocal] = useState("");
    const [pasoTransferenciaLocal, setPasoTransferenciaLocal] = useState<PasoTransferenciaLocal>(pasoTransferenciaLocalInicial);
    const [cargandoTransferenciaLocal, setCargandoTransferenciaLocal] = useState(false);

    function continuar(): void {
        if (pasoTransferenciaLocal === "CUENTA_DESTINO") {
            void validarCuentaDestino();
            return;
        }
        void ejecutar();
    }

    async function validarCuentaDestino(): Promise<void> {
        const numeroDestino = numeroCuentaDestino.trim();
        const error = TuiValidaciones.cuentaDestino(numeroDestino);

        if (error) {
            mostrarError("Cuenta inválida", error);
            return;
        }

        if (sesion && numeroDestino === sesion.numeroCuenta) {
            mostrarError("Cuenta inválida", "No puede transferir dinero a la misma cuenta de origen.");
            return;
        }

        try {
            const resultado = await servicios.consultarTitularCuentaService.ejecutar(numeroDestino);

            if (!resultado.existe) {
                mostrarError("Cuenta inválida", resultado.mensaje);
                return;
            }

            setNumeroCuentaDestino(numeroDestino);
            setMontoTransferenciaLocal("");
            mostrarConfirmacion(
                TuiMensajes.exito(
                    "Confirmar cuenta destino",
                    `Titular: ${resultado.nombreTitular}. ¿Desea continuar al monto?`
                )
            );
        } catch (error: unknown) {
            mostrarMensaje(
                TuiMensajes.desdeError(
                    "Error al consultar cuenta destino",
                    error,
                    "No se pudo validar la cuenta destino."
                ),
                "TRANSFERENCIA_LOCAL"
            );
        }
    }

    async function ejecutar(): Promise<void> {
        if (!sesion) {
            mostrarMensaje(
                TuiMensajes.error("Sesión inválida", "No existe una sesión activa."),
                "LOGIN_TARJETA"
            );
            return;
        }
        const monto = TuiValidaciones.monto(montoTransferenciaLocal);
        if (monto === null) {
            mostrarError("Monto inválido", "Ingrese un monto superior a 0.");
            return;
        }
        const numeroDestino = numeroCuentaDestino.trim();
        if (numeroDestino === sesion.numeroCuenta) {
            mostrarError("Cuenta inválida", "No puede transferir dinero a la misma cuenta de origen.");
            return;
        }
        setCargandoTransferenciaLocal(true);
        try {
            const resultado = await servicios.transferenciaService.ejecutar({
                tipoTransferencia: "LOCAL",
                cuentaOrigenId: sesion.cuentaId,
                numeroCuentaDestino: numeroDestino,
                monto,
                correoCliente: sesion.correoCliente
            });
            const nuevoSaldo = resultado.origen.saldoNuevo;
            actualizarSesion(sesionActual => ({
                ...sesionActual,
                saldo: nuevoSaldo
            }));
            limpiar();
            mostrarMensaje(
                TuiMensajes.exito(
                    "Transferencia local exitosa",
                    `Se transfirieron $${monto.toFixed(2)} a la cuenta ${numeroDestino}.\nNuevo saldo: $${nuevoSaldo.toFixed(2)}`
                ),
                "MENU_PRINCIPAL"
            );
        } catch (error: unknown) {
            mostrarMensaje(
                TuiMensajes.desdeError(
                    "Error en transferencia local",
                    error,
                    "No se pudo procesar la transferencia local."
                ),
                "TRANSFERENCIA_LOCAL"
            );
        } finally {
            setCargandoTransferenciaLocal(false);
        }
    }

    function mostrarError(titulo: string, detalle: string): void {
        mostrarMensaje(TuiMensajes.error(titulo, detalle), "TRANSFERENCIA_LOCAL");
    }

    function limpiar(): void {
        setNumeroCuentaDestino("");
        setMontoTransferenciaLocal("");
        setPasoTransferenciaLocal(pasoTransferenciaLocalInicial);
        setCargandoTransferenciaLocal(false);
    }

    function confirmarCuentaDestino(seleccion: string): void {
        if (seleccion === "si") {
            setPasoTransferenciaLocal("MONTO");
            mostrarMensaje(
                TuiMensajes.exito(
                    "Transferencia local",
                    "Ingrese el monto a transferir. Presione Enter para continuar."
                ),
                "TRANSFERENCIA_LOCAL"
            );
            return;
        }

        setPasoTransferenciaLocal("CUENTA_DESTINO");
        mostrarMensaje(
            TuiMensajes.error(
                "Cuenta destino no confirmada",
                "Reingrese el número de cuenta destino."
            ),
            "TRANSFERENCIA_LOCAL"
        );
    }

    return {
        numeroCuentaDestino,
        montoTransferenciaLocal,
        pasoTransferenciaLocal,
        cargandoTransferenciaLocal,
        setNumeroCuentaDestino,
        setMontoTransferenciaLocal,
        continuar,
        ejecutar,
        limpiar,
        confirmarCuentaDestino
    };
}
export type TransferenciaLocalController = ReturnType<typeof useTransferenciaLocalController>;