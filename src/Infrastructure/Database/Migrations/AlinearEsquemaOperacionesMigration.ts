import { PoolClient } from "pg";

import { IMigration } from "./IMigration";

export class AlinearEsquemaOperacionesMigration
    implements IMigration {

    public readonly nombre =
        "002_alinear_esquema_operaciones";

    public async ejecutar(
        cliente: PoolClient
    ): Promise<void> {
        await cliente.query(`
            ALTER TABLE BancoFuego.Movimiento
            ADD COLUMN IF NOT EXISTS saldo_posterior NUMERIC(18,2)
        `);

        await cliente.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'bancofuego'
                        AND table_name = 'movimiento'
                        AND column_name = 'saldo_nuevo'
                ) THEN
                    UPDATE BancoFuego.Movimiento
                    SET saldo_posterior = saldo_nuevo
                    WHERE saldo_posterior IS NULL
                        AND saldo_nuevo IS NOT NULL;
                END IF;
            END
            $$;
        `);

        await cliente.query(`
            ALTER TABLE BancoFuego.Movimiento
            ALTER COLUMN saldo_posterior SET NOT NULL
        `);

        await cliente.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_indexes
                    WHERE schemaname = 'bancofuego'
                        AND tablename = 'movimiento'
                        AND indexname = 'idx_movimiento_cuenta_fecha'
                ) THEN
                    CREATE INDEX idx_movimiento_cuenta_fecha
                    ON BancoFuego.Movimiento (id_cuenta, fecha DESC);
                END IF;
            END
            $$;
        `);

        await cliente.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_indexes
                    WHERE schemaname = 'bancofuego'
                        AND tablename = 'idempotenciaoperacion'
                        AND indexname = 'uq_idempotencia_operacion_nueva'
                ) THEN
                    CREATE UNIQUE INDEX uq_idempotencia_operacion_nueva
                    ON BancoFuego.IdempotenciaOperacion (
                        id_cuenta,
                        operacion,
                        idempotency_key
                    );
                END IF;
            END
            $$;
        `);
    }
}
