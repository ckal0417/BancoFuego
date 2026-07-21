# 🛠️ Informe de Correcciones Pendientes en Base de Datos y Enums - BancoFuego

Este documento detalla los fallos críticos de SQL y de tipos que deben ser corregidos en el backend de `BancoFuego` para que los depósitos, retiros y transferencias funcionen sin ser rebotados por PostgreSQL.

---

## 1. Error Crítico en `CuentaQueries.ts` (`BUSCAR_POR_ID_PARA_ACTUALIZAR`)

### ❌ Problema
En `src/Infrastructure/Database/Queries/CuentaQueries.ts` (línea 16), la consulta `BUSCAR_POR_ID_PARA_ACTUALIZAR` incluye las columnas `moneda` y `estado`:
```sql
SELECT
    id_cuenta,
    numero_cuenta,
    tipo,
    moneda,
    saldo,
    estado,
    id_cliente
FROM BancoFuego.Cuenta
WHERE id_cuenta = $1
FOR UPDATE
```

La tabla `BancoFuego.Cuenta` en PostgreSQL **NO tiene las columnas `moneda` ni `estado`** (sus columnas reales son `fecha_creacion`, `activa` e `id_banco`). Al intentar realizar cualquier depósito, retiro o transferencia, PostgreSQL aborta la transacción lanzando:
> `error: column "moneda" does not exist`

### ✅ Solución
Actualizar `BUSCAR_POR_ID_PARA_ACTUALIZAR` en `src/Infrastructure/Database/Queries/CuentaQueries.ts` con las columnas reales de PostgreSQL:
```sql
SELECT
    id_cuenta,
    numero_cuenta,
    tipo,
    saldo,
    fecha_creacion,
    activa,
    id_cliente,
    id_banco
FROM BancoFuego.Cuenta
WHERE id_cuenta = $1
FOR UPDATE
```

---

## 2. Descalce en Enums de Dominio (`TipoTransaccion` y `EstadoTransaccion`)

### ❌ Problema
1. En `src/Domain/Enums/TipoTransaccion.ts`, los valores están declarados como `"TRANSFERENCIAINTERNA"` y `"TRANSFERENCIAINTERBANCARIA"` (sin guiones bajos).
2. En `src/Domain/Enums/EstadoTransaccion.ts`, falta el estado `"PENDIENTE"`.

En PostgreSQL, el tipo enum nativo `bancofuego.tipo_transaccion` exige exactamente:
- `'DEPOSITO'`
- `'RETIRO'`
- `'TRANSFERENCIA_INTERNA'`
- `'TRANSFERENCIA_EXTERNA'`

Al registrar una transferencia, PostgreSQL la rechaza con:
> `invalid input value for enum bancofuego.tipo_transaccion: "TRANSFERENCIAINTERNA"`

### ✅ Solución

#### En `src/Domain/Enums/TipoTransaccion.ts`:
```typescript
export const TIPOS_TRANSACCION = [
    "DEPOSITO",
    "RETIRO",
    "TRANSFERENCIA_INTERNA",
    "TRANSFERENCIA_EXTERNA"
] as const;

export type TipoTransaccion = (typeof TIPOS_TRANSACCION)[number];
```

#### En `src/Domain/Enums/EstadoTransaccion.ts`:
```typescript
export const ESTADOS_TRANSACCION = [
    "EXITOSA",
    "FALLIDA",
    "CANCELADA",
    "PENDIENTE"
] as const;

export type EstadoTransaccion = (typeof ESTADOS_TRANSACCION)[number];
```

---

## 3. Inconsistencia de Casing (Mayúsculas / Minúsculas en Rutas)

### ❌ Problema
Múltiples archivos importan desde `src/shared/...` con `s` minúscula, pero la carpeta física en el proyecto es `src/Shared/` con `S` mayúscula.

### ✅ Solución
Unificar todos los `imports` apuntando explícitamente a `src/Shared/...` para evitar fallos en entornos Linux, Docker o despliegues CI/CD.
