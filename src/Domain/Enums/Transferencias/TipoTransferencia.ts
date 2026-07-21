export const TIPOS_TRANSFERENCIA = [
    "LOCAL",
    "INTERBANCARIA"
] as const;

export type TipoTransferencia =
    (typeof TIPOS_TRANSFERENCIA)[number];

export function esTipoTransferencia(
    valor: string
): valor is TipoTransferencia {
    return TIPOS_TRANSFERENCIA.includes(
        valor as TipoTransferencia
    );
}