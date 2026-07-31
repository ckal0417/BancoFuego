const { Client } = require('pg');

async function main() {
  const client = new Client({
    user: 'postgres',
    password: 'admin',
    host: 'localhost',
    port: 5432,
    database: 'isc_atm',
  });

  try {
    await client.connect();
    
    console.log("--- bank_accounts ---");
    const accounts = await client.query('SELECT id, number, bank_code, client_id FROM bank_accounts LIMIT 10;');
    console.table(accounts.rows);

  } catch (err) {
    console.error('Error querying DB:', err.message);
  } finally {
    await client.end();
  }
}

main();
