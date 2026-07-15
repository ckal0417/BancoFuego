export const TIPOS_TRANSACCION = [

    "DEPOSITO",
    "RETIRO",
    "TRANSFERENCIAINTERNA",
    "TRANSFERENCIAINTERBANCARIA"
    
] as const;

export type TipoTransaccion = (typeof TIPOS_TRANSACCION)[number];