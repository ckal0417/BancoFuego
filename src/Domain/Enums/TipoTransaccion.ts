export const TIPOS_TRANSACCION = [

    "DEPOSITO",
    "RETIRO",
    "TRANSFERENCIA_INTERNA",
    "TRANSFERENCIA_EXTERNA_SALIENTE",
    "TRANSFERENCIA_EXTERNA_ENTRANTE",

] as const;

export type TipoTransaccion = (typeof TIPOS_TRANSACCION)[number];