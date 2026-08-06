const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

function dividirSentencias(sql) {
  const sentencias = [];
  let buffer = '';
  let estado = 'normal';
  for (let i = 0; i < sql.length; i += 1) {
    const caracter = sql[i];
    if (estado === 'string') {
      buffer += caracter;
      if (caracter === "'" && sql[i - 1] !== '\\') {
        estado = 'normal';
      }
      continue;
    }
    if (estado === 'doubleQuote') {
      buffer += caracter;
      if (caracter === '"') {
        estado = 'normal';
      }
      continue;
    }
    if (caracter === "'") {
      estado = 'string';
      buffer += caracter;
      continue;
    }
    if (caracter === '"') {
      estado = 'doubleQuote';
      buffer += caracter;
      continue;
    }
    if (caracter === ';') {
      const sentencia = buffer.trim();
      if (sentencia) sentencias.push(sentencia);
      buffer = '';
      continue;
    }
    buffer += caracter;
  }
  const final = buffer.trim();
  if (final) sentencias.push(final);
  return sentencias;
}

(async () => {
  const sql = fs.readFileSync(path.resolve('Base_De_Datos', 'BancoFuegoScript.sql'), 'utf8');
  const sentencias = dividirSentencias(sql);
  console.log('Total sentencias:', sentencias.length);
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'BancoFuego',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Admin123456'
  });
  const client = await pool.connect();
  try {
    for (let i = 0; i < sentencias.length; i += 1) {
      const sentencia = sentencias[i];
      try {
        await client.query(sentencia);
        console.log(`OK ${i + 1}/${sentencias.length}`);
      } catch (error) {
        console.error(`ERR ${i + 1}/${sentencias.length}`);
        console.error(error.message);
        console.error(sentencia.slice(0, 400));
        break;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
})();
