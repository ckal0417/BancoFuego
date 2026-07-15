
import 'dotenv/config';
import { Pool } from 'pg';

export class PostgresConnection {
    private static instancia: Pool | undefined;

    static obtenerPool(): Pool {
        if (!PostgresConnection.instancia) {
            PostgresConnection.instancia = new Pool({
                host: process.env.DB_HOST ?? "localhost",
                port: Number(process.env.DB_PORT ?? 5432),
                database: process.env.DB_NAME ?? "bancofuego",
                user: process.env.DB_USER ?? 'postgres',
                password: process.env.DB_PASSWORD ?? 'Admin123456',
            });
        }
        return PostgresConnection.instancia; }
}