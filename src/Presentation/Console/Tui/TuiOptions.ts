import { ItemSeleccion } from "./TuiTypes";

export const opcionesMenuPrincipal:
    ItemSeleccion[] = [
        {
            label: "💰 [1] Depositar Dinero",
            value: "depositar"
        },
        {
            label: "💸 [2] Retirar Efectivo",
            value: "retirar"
        },
        {
            label: "🔄 [3] Realizar Transferencia",
            value: "transferir"
        },
        {
            label: "📊 [4] Consultar Saldo",
            value: "saldo"
        },
        {
            label: "📜 [5] Ver Historial de Movimientos",
            value: "historial"
        },
        {
            label: "🔑 [6] Cambiar PIN Secreto",
            value: "cambiar_pin"
        },
        {
            label: "🚪 [7] Cerrar Sesión",
            value: "salir"
        }
    ];

export const opcionesTipoTransferencia:
    ItemSeleccion[] = [
        {
            label: "🏠 Transferencia local",
            value: "local"
        },
        {
            label: "🏦 Transferencia interbancaria",
            value: "interbancaria"
        },
        {
            label: "↩ Regresar",
            value: "regresar"
        }
    ];

export const opcionesBancosDestino:
    ItemSeleccion[] = [
        {
            label: "💎 Banco Rubyy",
            value: "bank_b"
        },
        {
            label: "🏦 Banco Pichincha",
            value: "XGKIPAQV"
        },
        {
            label: "🌊 Banco del Pacífico",
            value: "6FMAET9E"
        },
        {
            label: "🏢 Produbanco",
            value: "BB1PY2WP"
        },
        {
            label: "🌐 Banco de Guayaquil",
            value: "359E5JQV"
        },
        {
            label: "🌎 Banco Internacional",
            value: "L1Y90DPU"
        },
        {
            label: "🏛️ Banco Bolivariano",
            value: "FJ4KVFYH"
        },
        {
            label: "🤝 Banco Solidario",
            value: "4XILP4HU"
        },
        {
            label: "🏔️ Banco del Austro",
            value: "4KYBIBTA"
        },
        {
            label: "🌿 Banco de Loja",
            value: "NVNDIG4Y"
        }
    ];




export const opcionRegresar:
    ItemSeleccion[] = [
        {
            label: "↩ Regresar al Menú Principal",
            value: "menu"
        }
    ];

export const opcionContinuar:
    ItemSeleccion[] = [
        {
            label: "↩ Continuar",
            value: "continuar"
        }
    ];

export const opcionesConfirmarSalida:
    ItemSeleccion[] = [
        {
            label: "✅ Sí",
            value: "si"
        },
        {
            label: "❌ No",
            value: "no"
        }
    ];

export const opcionesConfirmarCancelacion:
    ItemSeleccion[] = [
        {
            label:
                "❌ Sí, cancelar y volver al Menú Principal",
            value: "si"
        },
        {
            label:
                "↩️ No, continuar con la operación",
            value: "no"
        }
    ];