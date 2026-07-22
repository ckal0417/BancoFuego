export const TIPOS_TRANSACCION = [

    "DEPOSITO",
    "RETIRO",
    "TRANSFERENCIA_INTERNA",
    "TRANSFERENCIA_EXTERNA"

] as const;

export type TipoTransaccion = (typeof TIPOS_TRANSACCION)[number];