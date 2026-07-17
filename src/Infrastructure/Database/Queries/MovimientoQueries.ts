export class MovimientoQueries {
    public static readonly CREAR = `
        INSERT INTO BancoFuego.Movimiento (
            monto,
            saldo_anterior,
            saldo_posterior,
            fecha,
            id_cuenta,
            id_transaccion
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id_movimiento
    `;

    public static readonly BUSCAR_POR_CUENTA_ID = `
        SELECT
            id_movimiento,
            monto,
            saldo_anterior,
            saldo_posterior,
            fecha,
            id_cuenta,
            id_transaccion
        FROM BancoFuego.Movimiento
        WHERE id_cuenta = $1
        ORDER BY fecha DESC
    `;
}