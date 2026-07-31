import { Client } from 'pg';
import "dotenv/config";

async function main() {
  const c = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '1515', 10),
    database: process.env.DB_NAME,
  });

  await c.connect();
  const res = await c.query(`
    SELECT enumlabel 
    FROM pg_enum 
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
    JOIN pg_namespace ON pg_type.typnamespace = pg_namespace.oid 
    WHERE typname = 'estado_transaccion' AND nspname = 'bancofuego';
  `);
  console.log("Valid enum values:", res.rows.map(r => r.enumlabel));
  await c.end();
}

main().catch(console.error);
