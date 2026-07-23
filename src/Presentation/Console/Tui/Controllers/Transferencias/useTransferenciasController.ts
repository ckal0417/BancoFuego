import {
    ItemSeleccion,
    PantallaTui
} from "../../TuiTypes";

interface UseTransferenciasControllerParametros {
    cambiarPantalla: (
        pantalla: PantallaTui
    ) => void;

    limpiarTransferenciaLocal:
        () => void;

    limpiarTransferenciaInterbancaria:
        () => void;
}

export function useTransferenciasController(
    parametros:
        UseTransferenciasControllerParametros
) {
    const {
        cambiarPantalla,
        limpiarTransferenciaLocal,
        limpiarTransferenciaInterbancaria
    } = parametros;

    function iniciar(): void {
        limpiarTodas();

        cambiarPantalla(
            "TIPO_TRANSFERENCIA"
        );
    }

    function seleccionarTipo(
        item: ItemSeleccion
    ): void {
        switch (item.value) {
            case "local":
                limpiarTransferenciaLocal();

                cambiarPantalla(
                    "TRANSFERENCIA_LOCAL"
                );

                return;

            case "interbancaria":
                limpiarTransferenciaInterbancaria();

                cambiarPantalla(
                    "TRANSFERENCIA_INTERBANCARIA"
                );

                return;

            case "regresar":
            default:
                cambiarPantalla(
                    "MENU_PRINCIPAL"
                );
        }
    }

    function limpiarTodas(): void {
        limpiarTransferenciaLocal();

        limpiarTransferenciaInterbancaria();
    }

    return {
        iniciar,
        seleccionarTipo,
        limpiarTodas
    };
}

export type TransferenciasController =
    ReturnType<
        typeof useTransferenciasController
    >;