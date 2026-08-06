import { PoolClient } from "pg";

import { IMigration } from "./IMigration";

export class RegistrosTransferenciasEntrantesMigration
    implements IMigration {

    public readonly nombre =
        "003_registros_transferencias_entrantes";

    public async ejecutar(
        cliente: PoolClient
    ): Promise<void> {
        await cliente.query(`
            CREATE TABLE IF NOT EXISTS
                BancoFuego.registros_transferencias_entrantes (
                    id_transferencia_entrante
                        SERIAL
                        PRIMARY KEY,

                    correlation_id
                        VARCHAR(150)
                        NOT NULL,

                    codigo_banco_origen
                        VARCHAR(100)
                        NOT NULL,

                    numero_cuenta_origen
                        VARCHAR(20)
                        NOT NULL,

                    numero_cuenta_destino
                        VARCHAR(20)
                        NOT NULL,

                    monto
                        NUMERIC(18,2)
                        NOT NULL,

                    concepto
                        VARCHAR(255),

                    id_cuenta_destino
                        INTEGER
                        NOT NULL,

                    procesado_en
                        TIMESTAMP
                        NOT NULL
                        DEFAULT CURRENT_TIMESTAMP
                )
        `);

        await cliente.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conrelid = 'BancoFuego.registros_transferencias_entrantes'::regclass
                        AND conname = 'fk_regidtro_transferencia_cuenta'
                ) THEN
                    ALTER TABLE BancoFuego.registros_transferencias_entrantes
                    ADD CONSTRAINT fk_regidtro_transferencia_cuenta
                    FOREIGN KEY (id_cuenta_destino)
                    REFERENCES BancoFuego.Cuenta (id_cuenta)
                    ON UPDATE CASCADE
                    ON DELETE RESTRICT;
                END IF;
            END
            $$;
        `);

        await cliente.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS
                uq_registros_transferencias_entrantes_correlation
            ON BancoFuego.registros_transferencias_entrantes (
                correlation_id
            )
        `);

        await cliente.query(`
            CREATE INDEX IF NOT EXISTS
                idx_registros_transferencias_entrantes_procesado_en
            ON BancoFuego.registros_transferencias_entrantes (
                procesado_en DESC
            )
        `);
    }
}
