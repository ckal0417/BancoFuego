export class TransaccionQueries {
    public static readonly CREAR = `
        INSERT INTO BancoFuego.Transaccion (
            tipo,
            monto,
            estado,
            fecha,
            descripcion,
            id_cajero
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id_transaccion
    `;

    public static readonly BUSCAR_POR_ID = `
        SELECT
            id_transaccion,
            tipo,
            monto,
            estado,
            fecha,
            descripcion,
            id_cajero
        FROM BancoFuego.Transaccion
        WHERE id_transaccion = $1
    `;

    public static readonly BUSCAR_TODAS_POR_IDS = `
        SELECT
            id_transaccion,
            tipo,
            monto,
            estado,
            fecha,
            descripcion,
            id_cajero
        FROM BancoFuego.Transaccion
        WHERE id_transaccion = ANY($1::int[])
    `;
}