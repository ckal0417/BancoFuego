export class RegistroTransferenciasEntrantesQueries {
    public static readonly CREAR = `
        INSERT INTO bancofuego.registros_transferencias_entrantes (
            correlation_id,
            codigo_banco_origen,
            numero_cuenta_origen,
            numero_cuenta_destino,
            monto,
            concepto,
            id_cuenta_destino,
            procesado_en
        )
        VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8
        )
        RETURNING id_transferencia_entrante;
    `;

    public static readonly BUSCAR_POR_CORRELATION_ID = `
        SELECT
            id_transferencia_entrante,
            correlation_id,
            codigo_banco_origen,
            numero_cuenta_origen,
            numero_cuenta_destino,
            monto,
            concepto,
            id_cuenta_destino,
            procesado_en
        FROM bancofuego.registros_transferencias_entrantes
        WHERE correlation_id = $1;
    `;
}
