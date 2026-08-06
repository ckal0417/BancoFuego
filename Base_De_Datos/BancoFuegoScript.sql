
-- Se crea la base de datos de la practica del banco y cajero
CREATE SCHEMA IF NOT EXISTS BancoFuego;
SET search_path TO BancoFuego;

-- Creacion de las tablas del esquema BancoFuego
CREATE TABLE BancoFuego.Banco(

    id_banco SERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    direccion VARCHAR(200),
    activo BOOLEAN DEFAULT TRUE,
    update_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Se crea la tabla cliente, que tiene una relacion con la tabla de cuenta
CREATE TABLE BancoFuego.Cliente(

    id_cliente SERIAL PRIMARY KEY,
    cedula VARCHAR(10) NOT NULL UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    correo VARCHAR(100),
    direccion VARCHAR(200),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE

);


--Es un enun para el tipo de cuenta, puede ser de ahorro o corriente
CREATE TYPE tipo_cuenta AS ENUM ('AHORRO', 'CORRIENTE');
-- Se crea la tabla de cuenta 
CREATE TABLE BancoFuego.Cuenta(

    id_cuenta SERIAL PRIMARY KEY,
    numero_cuenta VARCHAR(20) NOT NULL UNIQUE,
    tipo tipo_cuenta NOT NULL, -- Se usa el enun Tipo_cuenta para definir el tipo de cuenta
    saldo NUMERIC(15,2) NOT NULL DEFAULT 0,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activa BOOLEAN DEFAULT TRUE,
    id_cliente INTEGER NOT NULL,
    id_banco INTEGER NOT NULL,
    switch_account_id VARCHAR(100),

    CONSTRAINT chk_saldo
        CHECK(saldo >= 0),

    CONSTRAINT fk_cliente FOREIGN KEY(id_cliente) REFERENCES BancoFuego.cliente(id_cliente)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_banco FOREIGN KEY(id_banco) REFERENCES BancoFuego.banco(id_banco)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

);

CREATE VIEW BancoFuego.cuentas AS
SELECT
    id_cuenta,
    numero_cuenta,
    tipo,
    saldo,
    fecha_creacion,
    activa,
    id_cliente,
    id_banco,
    switch_account_id
FROM BancoFuego.Cuenta;


-- Se crea un enun para el tipo de tarjeta, puede ser de debito o credito
CREATE TYPE tipo_tarjeta AS ENUM ('DEBITO', 'CREDITO');
-- Se crea la tabla de tarjeta, que tiene una relacion con la tabla de cuenta
CREATE TABLE BancoFuego.Tarjeta(

    id_tarjeta SERIAL PRIMARY KEY,
    numero_tarjeta VARCHAR(20) UNIQUE NOT NULL,
    tipo tipo_tarjeta NOT NULL, -- Se usa el enun Tipo_tarjeta para definir el tipo de tarjeta
    fecha_vencimiento DATE NOT NULL,
    cvv VARCHAR(4) NOT NULL,
    activa BOOLEAN DEFAULT TRUE,
    id_cuenta INTEGER NOT NULL,

    CONSTRAINT fk_cuenta FOREIGN KEY(id_cuenta) REFERENCES BancoFuego.cuenta(id_cuenta)
        ON UPDATE CASCADE
        ON DELETE CASCADE

);

-- S crea la tabla de cajero, que tiene una relacion con la tabla de banco
CREATE TABLE BancoFuego.Cajero(

    id_cajero SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    ubicacion VARCHAR(250),
    activo BOOLEAN DEFAULT TRUE,
    id_banco INTEGER NOT NULL,

    CONSTRAINT fk_banco_cajero FOREIGN KEY(id_banco) REFERENCES BancoFuego.banco(id_banco)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

);


-- Se crea un enun para el tipo de transaccion, puede ser deposito, retiro o transferencia
CREATE TYPE tipo_transaccion AS ENUM ('DEPOSITO', 'RETIRO', 'TRANSFERENCIA_INTERNA', 'TRANSFERENCIA_EXTERNA_SALIENTE', 'TRANSFERENCIA_EXTERNA_ENTRANTE');
-- Se crea un enun para el estado de la transaccion, puede ser exitosa, fallida o cancelada
CREATE TYPE estado_transaccion AS ENUM ('EXITOSA', 'FALLIDA', 'CANCELADA', 'PENDIENTE');
-- Se crea la tabla de transaccion, que tiene una relacion con la tabla de cajero
CREATE TABLE BancoFuego.Transaccion(

    id_transaccion SERIAL PRIMARY KEY,
    tipo tipo_transaccion NOT NULL,
    monto NUMERIC(15,2) NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado estado_transaccion DEFAULT 'EXITOSA',
    descripcion TEXT,
    referencia_externa VARCHAR(120),
    numero_tarjeta_origen VARCHAR(20),
    id_cuenta_origen INTEGER,
    idempotency_key VARCHAR(100),
    estado_detalle TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_cajero INTEGER,

    CONSTRAINT chk_monto CHECK(monto > 0),

    CONSTRAINT fk_cajero FOREIGN KEY(id_cajero) REFERENCES BancoFuego.cajero(id_cajero)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

);

-- Se crea un enun para la naturaleza del movimiento, puede ser credito o debito
CREATE TYPE naturaleza_movimiento AS ENUM ('CREDITO', 'DEBITO');
-- Se crea la tabla de movimiento, que tiene una relacion con la tabla de cuenta y transaccion
CREATE TABLE BancoFuego.Movimiento(

    id_movimiento SERIAL PRIMARY KEY,
    naturaleza naturaleza_movimiento NOT NULL,
    monto NUMERIC(15,2) NOT NULL,
    saldo_anterior NUMERIC(15,2) NOT NULL,
    saldo_posterior NUMERIC(15,2) NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_cuenta INTEGER NOT NULL,
    id_transaccion INTEGER NOT NULL,

    CONSTRAINT fk_movimiento_cuenta FOREIGN KEY(id_cuenta) REFERENCES BancoFuego.cuenta(id_cuenta)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_movimiento_transaccion FOREIGN KEY(id_transaccion) REFERENCES BancoFuego.transaccion(id_transaccion)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

);

-- Se crea la tabla de autenticacion, que tiene una relacion con la tabla de tarjeta
CREATE TABLE BancoFuego.Autenticacion(

    id_autenticacion SERIAL PRIMARY KEY,
    pin VARCHAR(255) NOT NULL,
    intentos INTEGER DEFAULT 0,
    bloqueado BOOLEAN DEFAULT FALSE,
    id_tarjeta INTEGER UNIQUE NOT NULL,

    CONSTRAINT chk_intentos
        CHECK(intentos >= 0),

    CONSTRAINT fk_tarjeta FOREIGN KEY(id_tarjeta) REFERENCES BancoFuego.tarjeta(id_tarjeta)
        ON UPDATE CASCADE
        ON DELETE CASCADE

);

-- Se crea tabla para control de idempotencia en operaciones criticas
CREATE TABLE BancoFuego.IdempotenciaOperacion(

    id_idempotencia SERIAL PRIMARY KEY,
    id_cuenta INTEGER NOT NULL,
    operacion VARCHAR(40) NOT NULL,
    idempotency_key VARCHAR(100) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'EN_PROCESO',
    respuesta_http INTEGER,
    respuesta_body JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_idempotencia_operacion UNIQUE (id_cuenta, operacion, idempotency_key),
    CONSTRAINT chk_estado_idempotencia CHECK (estado IN ('EN_PROCESO', 'COMPLETADA')),

    CONSTRAINT fk_idempotencia_cuenta FOREIGN KEY(id_cuenta) REFERENCES BancoFuego.cuenta(id_cuenta)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

);

CREATE TABLE BancoFuego.registros_transferencias_entrantes (
    id_transferencia_entrante SERIAL PRIMARY KEY,
    correlation_id varchar(100) NOT NULL UNIQUE,
    codigo_banco_origen varchar(50) NOT NULL,
    numero_cuenta_origen varchar(10) NOT NULL,
    numero_cuenta_destino varchar(10) NOT NULL,
    monto BIGINT NOT NULL,
    concepto varchar(200) NOT NULL,
    estado varchar(20) NOT NULL DEFAULT 'PROCESADA',
    id_cuenta_destino BIGINT NOT NULL,
    procesado_en timestamp NOT NULL DEFAULT now(),

    CONSTRAINT fk_regidtro_transferencia_cuenta FOREIGN KEY(id_cuenta_destino) REFERENCES BancoFuego.cuenta(id_cuenta)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
)


-- Se crean los indices para optimizar las consultas en las tablas del esquema BancoFuego
CREATE INDEX idx_cliente_cedula
ON BancoFuego.Cliente(cedula);

CREATE INDEX idx_cuenta_numero
ON BancoFuego.Cuenta(numero_cuenta);

CREATE INDEX idx_tarjeta_numero
ON BancoFuego.Tarjeta(numero_tarjeta);

CREATE INDEX idx_movimiento_fecha
ON BancoFuego.Movimiento(fecha);

CREATE INDEX idx_transaccion_fecha
ON BancoFuego.Transaccion(fecha);

CREATE INDEX idx_transaccion_externa_ref_owner
ON BancoFuego.Transaccion(tipo, referencia_externa, numero_tarjeta_origen);

CREATE INDEX idx_transaccion_externa_pendiente
ON BancoFuego.Transaccion(tipo, estado, updated_at);

CREATE INDEX idx_idempotencia_lookup
ON BancoFuego.IdempotenciaOperacion(id_cuenta, operacion, idempotency_key);

CREATE INDEX idx_registro_transferencia_cuenta_destino
ON registros_transferencias_entrantes(id_cuenta_destino);

CREATE INDEX idx_registro_transferencia_procesado_en
ON registros_transferencias_entrantes(procesado_en);



--------------------------------------------------
-- BANCO
--------------------------------------------------

INSERT INTO Banco(nombre, codigo, direccion)
VALUES
('Banco Fuego', 'BF001', 'Av. Amazonas y Naciones Unidas'), 
('Banco Chanchito', 'BS002', 'Av. 10 de Agosto y Patria');


--------------------------------------------------
-- CLIENTES
--------------------------------------------------

INSERT INTO Cliente
(cedula,nombres,apellidos,telefono,correo,direccion)
VALUES
('0102030405','Juan','Perez','0991111111','juan@correo.com','Cuenca'),
('0102030406','Maria','Lopez','0992222222','maria@correo.com','Quito'),
('0102030407','Carlos','Mendoza','0993333333','carlos@correo.com','Guayaquil'),
('0102030408','Ana','Vera','0994444444','ana@correo.com','Loja');

--------------------------------------------------
-- CUENTAS
--------------------------------------------------

INSERT INTO Cuenta
(numero_cuenta,tipo,saldo,id_cliente,id_banco)
VALUES
('2200000001','AHORRO',1200.00,1,1),
('2200000002','CORRIENTE',3500.00,2,1),
('2200000003','AHORRO',900.00,3,1),
('2200000004','CORRIENTE',5400.00,4,1);

--------------------------------------------------
-- TARJETAS
--------------------------------------------------

INSERT INTO Tarjeta
(numero_tarjeta,tipo,fecha_vencimiento,cvv,id_cuenta)
VALUES
('4111111111111111','DEBITO','2029-12-31','123',1),
('4111111111111112','DEBITO','2029-12-31','456',2),
('5111111111111111','CREDITO','2030-06-30','789',3),
('5111111111111112','DEBITO','2028-05-31','852',4);

--------------------------------------------------
-- AUTENTICACION
--------------------------------------------------

INSERT INTO Autenticacion
(pin,intentos,bloqueado,id_tarjeta)
VALUES
('1234',0,false,1),
('4321',0,false,2),
('5678',1,false,3),
('9999',3,true,4);

--------------------------------------------------
-- CAJEROS
--------------------------------------------------

INSERT INTO Cajero
(codigo,ubicacion,id_banco)
VALUES
('ATM001','Mall del Río',1),
('ATM002','Terminal Terrestre',1),
('ATM003','Centro Histórico',1);

--------------------------------------------------
-- TRANSACCIONES
--------------------------------------------------

INSERT INTO Transaccion
(tipo,monto,estado,descripcion,id_cajero)
VALUES
('DEPOSITO',500,'EXITOSA','Depósito en efectivo',1),
('RETIRO',100,'EXITOSA','Retiro por cajero',1),
('TRANSFERENCIA_INTERNA',250,'EXITOSA','Transferencia entre cuentas',2),
('RETIRO',50,'FALLIDA','Fondos insuficientes',3),
('DEPOSITO',1000,'EXITOSA','Depósito de nómina',2);

--------------------------------------------------
-- MOVIMIENTOS
--------------------------------------------------

INSERT INTO Movimiento
(naturaleza,monto,saldo_anterior,saldo_posterior,id_cuenta,id_transaccion)
VALUES
('CREDITO',500,700,1200,1,1),
('DEBITO',100,3600,3500,2,2),
('DEBITO',250,1150,900,3,3),
('DEBITO',50,5400,5400,4,4),
('CREDITO',1000,4400,5400,4,5);