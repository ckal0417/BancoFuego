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
                BancoFuego.Registros_Transferencias_Entrantes (
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
            DELETE FROM BancoFuego.Registros_Transferencias_Entrantes r
            USING BancoFuego.Registros_Transferencias_Entrantes d
            WHERE r.id_transferencia_entrante < d.id_transferencia_entrante
                AND r.correlation_id = d.correlation_id
        `);

        await cliente.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS
                uq_registros_transferencias_entrantes_correlation
            ON BancoFuego.Registros_Transferencias_Entrantes (
                correlation_id
            )
        `);

        await cliente.query(`
            CREATE INDEX IF NOT EXISTS
                idx_registros_transferencias_entrantes_procesado_en
            ON BancoFuego.Registros_Transferencias_Entrantes (
                procesado_en DESC
            )
        `);
    }
}
