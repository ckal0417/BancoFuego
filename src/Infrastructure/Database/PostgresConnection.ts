import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

export class PostgresConnection {
    private static pool: Pool | undefined;

    public static obtenerPool(): Pool {
        if (!this.pool) {
            this.pool = new Pool({
                connectionString:
                    process.env.DATABASE_URL
            });
        }

        return this.pool;
    }

    public static async verificarConexion(): Promise<void> {
        const pool = this.obtenerPool();

        await pool.query("SELECT 1");
    }

    public static async cerrarConexion(): Promise<void> {
        if (!this.pool) {
            return;
        }

        await this.pool.end();

        this.pool = undefined;
    }
}