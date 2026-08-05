# BancoFuego

BancoFuego es un sistema bancario en TypeScript con arquitectura por capas (Application, Domain, Infrastructure, Presentation), API HTTP en Express y consola interactiva (TUI).

## Caracteristicas principales

- Autenticacion por JWT.
- Operaciones bancarias: deposito, retiro y transferencias.
- Transferencias interbancarias salientes y entrantes.
- Idempotencia para operaciones criticas.
- Flujo comun de procesamiento para transferencias entrantes por webhook HTTP y polling.
- Historial de movimientos.
- Swagger/OpenAPI para documentacion de API.
- Pruebas unitarias con Vitest.

## Stack tecnico

- Node.js + TypeScript
- Express
- PostgreSQL (pg)
- JWT (jsonwebtoken)
- Logging con Winston
- TUI con Ink + React
- Vitest para testing

## Estructura del proyecto

```text
src/
  Application/      # Casos de uso, DTOs, puertos e interfaces
  Domain/           # Entidades, enums, value objects y reglas de negocio
  Infrastructure/   # Repositorios, DB, seguridad, email, clientes externos
  Presentation/     # API HTTP, controladores, rutas y consola
  Bootstrap/        # Composicion de dependencias
  Shared/           # Utilidades compartidas (eventos, logging)
```

## Requisitos

- Node.js 20+
- npm 10+
- PostgreSQL 14+

## Instalacion

```bash
npm install
```

## Configuracion de entorno

1. Crear archivo .env a partir de .env.example.
2. Ajustar las variables segun tu entorno.

Variables incluidas en .env.example:

```env

DB_HOST = localhost
DB_PORT = 5432
DB_NAME = BancoFuego
DB_USER = postgres
DB_PASSWORD = Admin123456

DB_POOL_MAX = 10
DB_IDLE_TIMEOUT_MS = 30000
DB_CONNECTION_TIMEOUT_MS = default: 5000

JWT_SECRET = BancoFuego_clave_local_2026_cambiar_despues

CORS_ORIGINS = http://localhost:4200 , http://localhost:3000

API_URL = http://localhost:3000/api

INTERBANK_WEBHOOK_SECRET=
INTERBANK_WEBHOOK_URL=http://localhost:3000/api/transferencias/interbancarias/callback
INTERBANK_WEBHOOK_MAX_AGE_SECONDS=300
INTERBANK_SIMULATED_WEBHOOK_DELAY_MS=3000

INTERBANK_POLLING_ENABLED=true
INTERBANK_POLLING_INTERVAL_MS=300000
INTERBANK_POLLING_BATCH_SIZE=50
```

## Migraciones

Ejecutar migraciones antes de iniciar API por primera vez:

```bash
npm run migrate
```

Migraciones relevantes para transferencias entrantes:

- 001_idempotencia_operaciones: base de idempotencia.
- 002_alinear_esquema_operaciones: alineacion de esquema e indices operativos.
- 003_registros_transferencias_entrantes: crea/normaliza registros entrantes, deduplica por correlation_id y agrega indice unico.

## Ejecucion

API HTTP (desarrollo):

```bash
npm run dev:api
```

Consola clasica (desarrollo):

```bash
npm run dev:console
```

Consola TUI (desarrollo):

```bash
npm run start:tui
```

API + TUI en paralelo:

```bash
npm run dev:all
```

Build y ejecucion en modo compilado:

```bash
npm run build
npm run start:api
```

## Scripts disponibles

- npm run check: validacion de tipos sin emitir build.
- npm run build: compila TypeScript a dist.
- npm run migrate: ejecuta migraciones pendientes.
- npm run test: ejecuta pruebas una vez.
- npm run test:watch: ejecuta pruebas en modo watch.
- npm run dev:api: levanta API en desarrollo.
- npm run dev:console: levanta consola clasica.
- npm run start:tui: levanta interfaz TUI.
- npm run dev:all: API + TUI en paralelo.

## Endpoints utiles

Salud y docs:

- GET /health
- GET /docs
- GET /docs/openapi.json

Auth y cuentas:

- POST /api/auth/login
- GET /api/cuentas/me
- GET /api/cuentas/:id

Operaciones:

- POST /api/operaciones/depositos
- POST /api/operaciones/retiros

Transferencias:

- POST /api/transferencias
- GET /api/transferencias/interbancarias/:transaccionId/estado
- POST /api/transferencias/interbancarias/callback
- POST /api/transferencias/interbancarias/recibir

Historial:

- GET /api/historial/me

Testing (simulacion red bancaria):

- POST /api/testing/red-bancaria/transferencias-entrantes

## Idempotencia

Para operaciones criticas, enviar header:

- Idempotency-Key

El sistema detecta reintentos con misma clave y misma solicitud, y devuelve respuesta previa cuando corresponde.

Regla especial en transferencias interbancarias entrantes:

- La clave principal de idempotencia es correlationId para compartir el mismo nucleo entre webhook y polling.
- Idempotency-Key se acepta como header opcional en HTTP, pero no reemplaza correlationId como identidad de negocio de la transferencia entrante.
- Esto evita doble acreditacion cuando webhook y worker de polling observan la misma transferencia.

## Coleccion Postman

El proyecto incluye:

- Pruebas BancoFuego.postman_collection.json

Importala en Postman para probar los endpoints principales.

Actualizacion de hoy en la coleccion:

- El request de POST /api/transferencias/interbancarias/recibir ahora usa correlationId explicito y campos canonicos de entrada.

## Notas operativas

- Al iniciar la API, se verifica conexion a PostgreSQL.
- INTERBANK_POLLING_ENABLED controla el arranque de workers interbancarios.
- Valores admitidos para INTERBANK_POLLING_ENABLED: true/false y 1/0.
- Si la variable tiene un valor invalido, se usa true por defecto y se registra advertencia en logs.
- CORS se controla con CORS_ORIGINS (lista separada por comas).

## Licencia

ISC
