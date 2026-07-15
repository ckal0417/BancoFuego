export const ESTADOS_TRANSACCION = [

    "EXITOSA",
    "FALLIDA",
    "CANCELADA"

] as const;

export type EstadoTransaccion = (typeof ESTADOS_TRANSACCION)[number];