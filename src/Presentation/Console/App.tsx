import React, { useState, useMemo } from 'react';
import { Box, Text, useApp } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';

import { TarjetaRepositoryPostgres } from '../../Infrastructure/Database/Repositories/TarjetaRepositoryPostgres';
import { AutenticacionRepositoryPostgres } from '../../Infrastructure/Database/Repositories/AutenticacionRepositoryPostgres';
import { CuentaRepositoryPostgres } from '../../Infrastructure/Database/Repositories/CuentaRepositoryPostgres';
import { TransaccionRepositoryPostgres } from '../../Infrastructure/Database/Repositories/TransaccionRepositoryPostgres';
import { MovimientoRepositoryPostgres } from '../../Infrastructure/Database/Repositories/MovimientoRepositoryPostgres';
import { IdempotenciaRepositoryPostgres } from '../../Infrastructure/Database/Repositories/IdempotenciaRepositoryPostgres';
import { PostgresUnidadDeTrabajo } from '../../Infrastructure/Database/PostgresUnidadDeTrabajo';

import { ClienteRepositoryPostgres } from '../../Infrastructure/Database/Repositories/ClienteRepositoryPostgres';

import { EventBus } from '../../Shared/Events/EventBus';
import { JwtTokenService } from '../../Infrastructure/Security/JwtTokenService';
import { AutenticacionService } from '../../Application/Services/AutenticacionService';
import { DepositoService } from '../../Application/Services/DepositoService';
import { RetiroService } from '../../Application/Services/RetiroService';
import { HistorialService } from '../../Application/Services/HistorialService';
import { IdempotenciaService } from '../../Application/Services/IdempotenciaService';

type Pantalla = 'LOGIN_TARJETA' | 'LOGIN_PIN' | 'MENU_PRINCIPAL' | 'DEPOSITO' | 'RETIRO' | 'SALDO' | 'HISTORIAL' | 'MENSAJE';

export const App: React.FC = () => {
    const { exit } = useApp();
    const [pantalla, setPantalla] = useState<Pantalla>('LOGIN_TARJETA');
    
    // Contenedor de Servicios instanciados limpiamente en React
    const services = useMemo(() => {
        const eventBus = new EventBus();
        const tarjetaRepo = new TarjetaRepositoryPostgres();
        const autenticacionRepo = new AutenticacionRepositoryPostgres();
        const cuentaRepo = new CuentaRepositoryPostgres();
        const clienteRepo = new ClienteRepositoryPostgres();
        const transaccionRepo = new TransaccionRepositoryPostgres();
        const movimientoRepo = new MovimientoRepositoryPostgres();
        const idempotenciaRepo = new IdempotenciaRepositoryPostgres();
        const unidadDeTrabajo = new PostgresUnidadDeTrabajo();
        const tokenService = new JwtTokenService();
        const idempotenciaService = new IdempotenciaService();

        const authService = new AutenticacionService(tarjetaRepo, autenticacionRepo, cuentaRepo, eventBus, tokenService, clienteRepo);
        const depositoService = new DepositoService(unidadDeTrabajo, eventBus, idempotenciaService);
        const retiroService = new RetiroService(unidadDeTrabajo, eventBus, idempotenciaService);
        const historialService = new HistorialService(movimientoRepo, transaccionRepo);

        return { cuentaRepo, authService, depositoService, retiroService, historialService };
    }, []);

    // Sesión del Usuario
    const [numeroTarjeta, setNumeroTarjeta] = useState('');
    const [pin, setPin] = useState('');
    const [sesion, setSesion] = useState<{ token: string; cuentaId: number; numeroCuenta: string; saldo: number; nombreCliente?: string; correoCliente?: string } | null>(null);


    // Inputs de operaciones
    const [montoInput, setMontoInput] = useState('');
    const [mensaje, setMensaje] = useState<{ titulo: string; contenido: string; error?: boolean }>({ titulo: '', contenido: '' });
    const [cargando, setCargando] = useState(false);
    const [historialItems, setHistorialItems] = useState<any[]>([]);

    const handleTarjetaSubmit = () => {
        if (numeroTarjeta.trim().length >= 16) {
            setPantalla('LOGIN_PIN');
        } else {
            setMensaje({ titulo: 'Error', contenido: 'El número de tarjeta debe tener al menos 16 dígitos', error: true });
        }
    };

    const handlePinSubmit = async () => {
        setCargando(true);
        try {
            const res = await services.authService.autenticar({ numeroTarjeta, pin });
            setSesion(res);
            setPin('');
            setPantalla('MENU_PRINCIPAL');
        } catch (err: any) {
            const esBloqueo = err?.name === 'TarjetaBloqueadaError' || (err?.message && err.message.toLowerCase().includes('bloqueada'));
            setMensaje({
                titulo: esBloqueo ? '🔒 TARJETA BLOQUEADA' : '⚠️ FALLO DE AUTENTICACIÓN',
                contenido: esBloqueo 
                    ? 'La tarjeta ha sido bloqueada por acumular 3 intentos fallidos de PIN. Acuda a una agencia bancaria para desbloquearla.' 
                    : (err?.message || 'PIN o Tarjeta incorrectos'),
                error: true
            });
            setPin('');
            setPantalla('MENSAJE');
        } finally {
            setCargando(false);
        }
    };


    const handleMenuSelect = async (item: { value: string }) => {
        if (item.value === 'depositar') {
            setMontoInput('');
            setPantalla('DEPOSITO');
        } else if (item.value === 'retirar') {
            setMontoInput('');
            setPantalla('RETIRO');
        } else if (item.value === 'saldo') {
            try {
                const cuenta = await services.cuentaRepo.buscarPorId(sesion!.cuentaId);
                if (cuenta) {
                    setSesion(prev => prev ? { ...prev, saldo: cuenta.obtenerSaldo().toNumber() } : null);
                }
            } catch (err) { }
            setPantalla('SALDO');
        } else if (item.value === 'historial') {
            setCargando(true);
            try {
                const items = await services.historialService.obtenerPorCuenta(sesion!.cuentaId);
                setHistorialItems(items);
            } catch (err) {
                setHistorialItems([]);
            } finally {
                setCargando(false);
                setPantalla('HISTORIAL');
            }
        } else if (item.value === 'salir') {
            setSesion(null);
            setNumeroTarjeta('');
            setPin('');
            setPantalla('LOGIN_TARJETA');
        }
    };

    const handleDepositoSubmit = async () => {
        const monto = parseFloat(montoInput);
        if (isNaN(monto) || monto <= 0) {
            setMensaje({ titulo: 'Monto Inválido', contenido: 'Ingrese un monto superior a 0', error: true });
            return;
        }

        setCargando(true);
        try {
            const res = await services.depositoService.ejecutar({ cuentaId: sesion!.cuentaId, monto });
            setSesion(prev => prev ? { ...prev, saldo: res.saldoNuevo } : null);
            setMensaje({ titulo: '¡Depósito Exitoso!', contenido: `Nuevo Saldo: $${res.saldoNuevo}` });
            setPantalla('MENSAJE');
        } catch (err: any) {
            setMensaje({ titulo: 'Error en Depósito', contenido: err?.message || 'No se pudo procesar el depósito', error: true });
            setPantalla('MENSAJE');
        } finally {
            setCargando(false);
        }
    };

    const handleRetiroSubmit = async () => {
        const monto = parseFloat(montoInput);
        if (isNaN(monto) || monto <= 0) {
            setMensaje({ titulo: 'Monto Inválido', contenido: 'Ingrese un monto superior a 0', error: true });
            return;
        }

        setCargando(true);
        try {
            const res = await services.retiroService.ejecutar({ cuentaId: sesion!.cuentaId, monto });
            setSesion(prev => prev ? { ...prev, saldo: res.saldoNuevo } : null);
            setMensaje({ titulo: '¡Retiro Exitoso!', contenido: `Nuevo Saldo: $${res.saldoNuevo}` });
            setPantalla('MENSAJE');
        } catch (err: any) {
            setMensaje({ titulo: 'Error en Retiro', contenido: err?.message || 'Saldo insuficiente o falla en retiro', error: true });
            setPantalla('MENSAJE');
        } finally {
            setCargando(false);
        }
    };

    return (
        <Box flexDirection="column" padding={1} borderStyle="single" borderColor="red" minHeight={15}>
            {/* Cabecera */}
            <Box flexDirection="column" marginBottom={1} alignItems="center">
                <Text color="red" bold>🔥 BANCO FUEGO - CAJERO AUTOMÁTICO 🔥</Text>
                <Text color="gray">===================================================</Text>
            </Box>

            {/* Pantalla: Login Tarjeta */}
            {pantalla === 'LOGIN_TARJETA' && (
                <Box flexDirection="column">
                    <Text color="yellow" bold>INGRESO DE TARJETA</Text>
                    <Box marginTop={1}>
                        <Text bold>Número de Tarjeta: </Text>
                        <TextInput value={numeroTarjeta} onChange={setNumeroTarjeta} onSubmit={handleTarjetaSubmit} />
                    </Box>
                    <Box marginTop={1}>
                        <Text color="gray">(Ingresa 16 dígitos y presiona Enter)</Text>
                    </Box>
                </Box>
            )}

            {/* Pantalla: Login PIN */}
            {pantalla === 'LOGIN_PIN' && (
                <Box flexDirection="column">
                    <Text color="yellow" bold>AUTENTICACIÓN DE SEGURIDAD</Text>
                    <Text color="gray">Tarjeta: {numeroTarjeta}</Text>
                    <Box marginTop={1}>
                        <Text bold>PIN Secreto: </Text>
                        <TextInput value={pin} onChange={setPin} onSubmit={handlePinSubmit} mask="*" />
                    </Box>
                    <Box marginTop={1}>
                        <Text color="magenta">⚠️ Nota: Tras 3 intentos fallidos la tarjeta será bloqueada por seguridad.</Text>
                    </Box>
                    {cargando && <Text color="cyan">Conectando...</Text>}
                </Box>
            )}

            {/* Pantalla: Menú Principal */}
            {pantalla === 'MENU_PRINCIPAL' && sesion && (
                <Box flexDirection="column">
                    <Text color="green" bold>BIENVENIDO {sesion.nombreCliente ? sesion.nombreCliente.toUpperCase() : ''}</Text>


                    <Box marginTop={1} flexDirection="column">
                        <Text color="yellow">Selecciona una operación (Usa las flechas ↑ / ↓ y presiona Enter):</Text>
                        <SelectInput
                            items={[
                                { label: '💰 [1] Depositar Dinero', value: 'depositar' },
                                { label: '💸 [2] Retirar Efectivo', value: 'retirar' },
                                { label: '📊 [3] Consultar Saldo', value: 'saldo' },
                                { label: '📜 [4] Ver Historial de Movimientos', value: 'historial' },
                                { label: '🚪 [5] Cerrar Sesión', value: 'salir' }
                            ]}
                            onSelect={handleMenuSelect}
                        />
                    </Box>
                </Box>
            )}

            {/* Pantalla: Depósito */}
            {pantalla === 'DEPOSITO' && (
                <Box flexDirection="column">
                    <Text color="yellow" bold>DEPOSITAR DINERO EN CUENTA</Text>
                    <Box marginTop={1}>
                        <Text bold>Monto a depositar ($): </Text>
                        <TextInput value={montoInput} onChange={setMontoInput} onSubmit={handleDepositoSubmit} />
                    </Box>
                    {cargando && <Text color="cyan">Procesando transacción atómica en BD...</Text>}
                </Box>
            )}

            {/* Pantalla: Retiro */}
            {pantalla === 'RETIRO' && (
                <Box flexDirection="column">
                    <Text color="yellow" bold>RETIRAR EFECTIVO</Text>
                    <Box marginTop={1}>
                        <Text bold>Monto a retirar ($): </Text>
                        <TextInput value={montoInput} onChange={setMontoInput} onSubmit={handleRetiroSubmit} />
                    </Box>
                    {cargando && <Text color="cyan">Verificando saldo y dispensando efectivo...</Text>}
                </Box>
            )}

            {/* Pantalla: Saldo */}
            {pantalla === 'SALDO' && sesion && (
                <Box flexDirection="column">
                    <Text color="yellow" bold>CONSULTA DE SALDO</Text>
                    <Text>Número de Cuenta: {sesion.numeroCuenta}</Text>
                    <Text color="green" bold>Saldo Disponible: ${sesion.saldo.toFixed(2)}</Text>
                    <Box marginTop={1}>
                        <SelectInput
                            items={[{ label: '↩ Regresar al Menú Principal', value: 'menu' }]}
                            onSelect={() => setPantalla('MENU_PRINCIPAL')}
                        />
                    </Box>
                </Box>
            )}

            {/* Pantalla: Historial */}
            {pantalla === 'HISTORIAL' && (
                <Box flexDirection="column">
                    <Text color="yellow" bold>HISTORIAL DE MOVIMIENTOS</Text>
                    {historialItems.length === 0 ? (
                        <Text color="gray">No se encontraron movimientos para esta cuenta.</Text>
                    ) : (
                        historialItems.slice(0, 5).map((item, idx) => (
                            <Text key={idx} color={item.monto > 0 ? 'green' : 'red'}>
                                • {new Date(item.fecha).toLocaleString()} | {item.tipo} | ${item.monto} | {item.descripcion || 'Sin detalle'}
                            </Text>
                        ))
                    )}
                    <Box marginTop={1}>
                        <SelectInput
                            items={[{ label: '↩ Regresar al Menú Principal', value: 'menu' }]}
                            onSelect={() => setPantalla('MENU_PRINCIPAL')}
                        />
                    </Box>
                </Box>
            )}

            {/* Pantalla: Mensajes de Notificación */}
            {pantalla === 'MENSAJE' && (
                <Box flexDirection="column">
                    <Text color={mensaje.error ? 'red' : 'green'} bold>{mensaje.titulo}</Text>
                    <Text>{mensaje.contenido}</Text>
                    <Box marginTop={1}>
                        <SelectInput
                            items={[{ label: '↩ Continuar', value: 'menu' }]}
                            onSelect={() => setPantalla('MENU_PRINCIPAL')}
                        />
                    </Box>
                </Box>
            )}
        </Box>
    );
};
