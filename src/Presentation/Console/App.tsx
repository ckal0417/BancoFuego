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
import { TransferenciaService } from '../../Application/Services/Transferencias/TransferenciaService';
import { TransferenciaLocalService } from '../../Application/Services/Transferencias/Local/TransferenciaLocalService';
import { TransferenciaInterbancariaService } from '../../Application/Services/Transferencias/Interbancaria/TransferenciaInterbancariaService';
import { RedBancariaSimuladaClient } from '../../Infrastructure/Clients/Transferencias/Interbancaria/RedBancariaSimuladaClient';
import { SubscriberFactory } from '../../Application/Events/SubscriberFactory';

type Pantalla = 'LOGIN_TARJETA' | 'LOGIN_PIN' | 'MENU_PRINCIPAL' | 'DEPOSITO' | 'RETIRO' | 'SALDO' | 'HISTORIAL' | 'MENSAJE' | 'CONFIRMAR_SALIDA' | 'DESPEDIDA' | 'CAMBIAR_PIN' | 'TRANSFERENCIA';


export const App: React.FC = () => {
    const { exit } = useApp();
    const [pantalla, setPantalla] = useState<Pantalla>('LOGIN_TARJETA');

    // Contenedor de Servicios instanciados limpiamente en React
    const services = useMemo(() => {
        const eventBus = new EventBus();
        SubscriberFactory.crear(eventBus);

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
        const redBancariaClient = new RedBancariaSimuladaClient();

        const authService = new AutenticacionService(tarjetaRepo, autenticacionRepo, cuentaRepo, eventBus, tokenService, clienteRepo);
        const depositoService = new DepositoService(unidadDeTrabajo, eventBus, idempotenciaService);
        const retiroService = new RetiroService(unidadDeTrabajo, eventBus, idempotenciaService);
        const historialService = new HistorialService(movimientoRepo, transaccionRepo);

        const transferenciaLocalService = new TransferenciaLocalService(unidadDeTrabajo, idempotenciaService);
        const transferenciaInterbancariaService = new TransferenciaInterbancariaService(unidadDeTrabajo, redBancariaClient, idempotenciaService);
        const transferenciaService = new TransferenciaService(transferenciaLocalService, transferenciaInterbancariaService, eventBus);

        return { cuentaRepo, authService, depositoService, retiroService, historialService, transferenciaService };
    }, []);



    // Sesión del Usuario
    const [numeroTarjeta, setNumeroTarjeta] = useState('');
    const [pin, setPin] = useState('');
    const [sesion, setSesion] = useState<{ token: string; cuentaId: number; numeroCuenta: string; saldo: number; nombreCliente?: string; correoCliente?: string } | null>(null);

    // Estado para Cambio de PIN
    const [pinNuevoInput, setPinNuevoInput] = useState('');
    const [pasoPin, setPasoPin] = useState<'PIN_ACTUAL' | 'PIN_NUEVO'>('PIN_ACTUAL');

    // Estado para Transferencias
    const [cuentaDestinoInput, setCuentaDestinoInput] = useState('');
    const [pasoTransferencia, setPasoTransferencia] = useState<'CUENTA_DESTINO' | 'MONTO'>('CUENTA_DESTINO');

    // Inputs de operaciones
    const [montoInput, setMontoInput] = useState('');
    const [mensaje, setMensaje] = useState<{ titulo: string; contenido: string; error?: boolean }>({ titulo: '', contenido: '' });
    const [pantallaSiguiente, setPantallaSiguiente] = useState<Pantalla>('LOGIN_TARJETA');
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
            setPantallaSiguiente(esBloqueo ? 'LOGIN_TARJETA' : 'LOGIN_PIN');
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
        } else if (item.value === 'transferir') {
            setCuentaDestinoInput('');
            setMontoInput('');
            setPasoTransferencia('CUENTA_DESTINO');
            setPantalla('TRANSFERENCIA');
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
        } else if (item.value === 'cambiar_pin') {
            setPin('');
            setPinNuevoInput('');
            setPasoPin('PIN_ACTUAL');
            setPantalla('CAMBIAR_PIN');
        } else if (item.value === 'salir') {
            setPantalla('CONFIRMAR_SALIDA');
        }
    };

    const handleTransferenciaCuentaSubmit = () => {
        if (cuentaDestinoInput.trim().length < 5) {
            setMensaje({ titulo: 'Cuenta Inválida', contenido: 'Ingrese un número de cuenta destino válido', error: true });
            setPantallaSiguiente('TRANSFERENCIA');
            setPantalla('MENSAJE');
            return;
        }
        setMontoInput('');
        setPasoTransferencia('MONTO');
    };

    const handleTransferenciaSubmit = async () => {
        const monto = parseFloat(montoInput);
        if (isNaN(monto) || monto <= 0) {
            setMensaje({ titulo: 'Monto Inválido', contenido: 'Ingrese un monto superior a 0', error: true });
            setPantallaSiguiente('TRANSFERENCIA');
            setPantalla('MENSAJE');
            return;
        }

        setCargando(true);
        try {
            const numeroDestino = cuentaDestinoInput.trim();
            const cuentaLocal = await services.cuentaRepo.buscarPorNumeroCuentaParaActualizar(numeroDestino);


            let res;
            let tipoDesc = '';

            if (cuentaLocal && cuentaLocal.obtenerId() !== undefined) {
                res = await services.transferenciaService.ejecutar({
                    tipoTransferencia: 'LOCAL',
                    cuentaOrigenId: sesion!.cuentaId,
                    cuentaDestinoId: cuentaLocal.obtenerId()!,
                    monto,
                    correoCliente: sesion?.correoCliente
                });
                tipoDesc = 'Interna (Banco Fuego)';
            } else {

                res = await services.transferenciaService.ejecutar({
                    tipoTransferencia: 'INTERBANCARIA',
                    cuentaOrigenId: sesion!.cuentaId,
                    numeroCuentaDestino: numeroDestino,
                    codigoBancoDestino: 'BANCO_EXTERNO',
                    monto,
                    correoCliente: sesion?.correoCliente
                });
                tipoDesc = 'Interbancaria';
            }

            const nuevoSaldo = res.origen.saldoNuevo;
            setSesion(prev => prev ? { ...prev, saldo: nuevoSaldo } : null);

            setMensaje({
                titulo: '¡Transferencia Exitosa!',
                contenido: `Se transfirieron $${monto.toFixed(2)} a la cuenta ${numeroDestino} [${tipoDesc}].\nNuevo Saldo: $${nuevoSaldo.toFixed(2)}`
            });
            setCuentaDestinoInput('');
            setMontoInput('');
            setPantallaSiguiente('MENU_PRINCIPAL');
            setPantalla('MENSAJE');
        } catch (err: any) {
            setMensaje({
                titulo: 'Error en Transferencia',
                contenido: err?.message || 'No se pudo procesar la transferencia',
                error: true
            });
            setPantallaSiguiente('MENU_PRINCIPAL');
            setPantalla('MENSAJE');
        } finally {
            setCargando(false);
        }
    };



    const handleCambiarPinSubmit = async () => {
        if (!/^\d{4}$/.test(pinNuevoInput)) {
            setMensaje({ titulo: 'PIN Inválido', contenido: 'El nuevo PIN debe tener exactamente 4 dígitos numéricos', error: true });
            setPantallaSiguiente('CAMBIAR_PIN');
            setPantalla('MENSAJE');
            return;
        }

        setCargando(true);
        try {
            await services.authService.cambiarPin({
                numeroTarjeta,
                pinActual: pin,
                pinNuevo: pinNuevoInput
            });
            setMensaje({ titulo: '¡PIN Cambiado!', contenido: 'Su clave secreta ha sido actualizada con éxito.' });
            setPin('');
            setPinNuevoInput('');
            setPantallaSiguiente('MENU_PRINCIPAL');
            setPantalla('MENSAJE');
        } catch (err: any) {
            const esBloqueo = err?.name === 'TarjetaBloqueadaError' || (err?.message && err.message.toLowerCase().includes('bloqueada'));
            setMensaje({
                titulo: esBloqueo ? '🔒 TARJETA BLOQUEADA' : 'Error al Cambiar PIN',
                contenido: err?.message || 'No se pudo cambiar el PIN',
                error: true
            });
            setPin('');
            setPinNuevoInput('');
            setPantallaSiguiente(esBloqueo ? 'LOGIN_TARJETA' : 'MENU_PRINCIPAL');
            setPantalla('MENSAJE');
        } finally {
            setCargando(false);
        }
    };


    const handleConfirmarSalidaSelect = (item: { value: string }) => {
        if (item.value === 'si') {
            setSesion(null);
            setNumeroTarjeta('');
            setPin('');
            setPantalla('DESPEDIDA');
        } else {
            setPantalla('MENU_PRINCIPAL');
        }
    };

    const handleDespedidaSelect = () => {
        setPantalla('LOGIN_TARJETA');
    };


    const handleDepositoSubmit = async () => {
        const monto = parseFloat(montoInput);
        if (isNaN(monto) || monto <= 0) {
            setMensaje({ titulo: 'Monto Inválido', contenido: 'Ingrese un monto superior a 0', error: true });
            return;
        }

        setCargando(true);
        try {
            const res = await services.depositoService.ejecutar({ cuentaId: sesion!.cuentaId, monto, correoCliente: sesion?.correoCliente });
            setSesion(prev => prev ? { ...prev, saldo: res.saldoNuevo } : null);
            setMensaje({ titulo: '¡Depósito Exitoso!', contenido: `Nuevo Saldo: $${res.saldoNuevo}` });
            setPantallaSiguiente('MENU_PRINCIPAL');
            setPantalla('MENSAJE');
        } catch (err: any) {
            setMensaje({ titulo: 'Error en Depósito', contenido: err?.message || 'No se pudo procesar el depósito', error: true });
            setPantallaSiguiente('MENU_PRINCIPAL');
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
            const res = await services.retiroService.ejecutar({ cuentaId: sesion!.cuentaId, monto, correoCliente: sesion?.correoCliente });
            setSesion(prev => prev ? { ...prev, saldo: res.saldoNuevo } : null);
            setMensaje({ titulo: '¡Retiro Exitoso!', contenido: `Nuevo Saldo: $${res.saldoNuevo}` });
            setPantallaSiguiente('MENU_PRINCIPAL');
            setPantalla('MENSAJE');
        } catch (err: any) {
            setMensaje({ titulo: 'Error en Retiro', contenido: err?.message || 'Saldo insuficiente o falla en retiro', error: true });
            setPantallaSiguiente('MENU_PRINCIPAL');
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
                                { label: '🔄 [3] Realizar Transferencia', value: 'transferir' },
                                { label: '📊 [4] Consultar Saldo', value: 'saldo' },
                                { label: '📜 [5] Ver Historial de Movimientos', value: 'historial' },
                                { label: '🔑 [6] Cambiar PIN Secreto', value: 'cambiar_pin' },
                                { label: '🚪 [7] Cerrar Sesión', value: 'salir' }
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
                    {cargando && <Text color="cyan">Procesando transacción...</Text>}
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

            {/* Pantalla: Transferencia */}
            {pantalla === 'TRANSFERENCIA' && (
                <Box flexDirection="column">
                    <Text color="yellow" bold>TRANSFERENCIA BANCARIA DE FONDOS</Text>
                    <Text color="gray">Cuenta Origen: {sesion?.numeroCuenta} | Saldo: ${sesion?.saldo.toFixed(2)}</Text>

                    {pasoTransferencia === 'CUENTA_DESTINO' && (
                        <Box flexDirection="column" marginTop={1}>
                            <Box>
                                <Text bold>Número de Cuenta Destino: </Text>
                                <TextInput value={cuentaDestinoInput} onChange={setCuentaDestinoInput} onSubmit={handleTransferenciaCuentaSubmit} />
                            </Box>
                            <Box marginTop={1}>
                                <Text color="gray">(Ingrese el número de cuenta y presione Enter)</Text>
                            </Box>
                        </Box>
                    )}

                    {pasoTransferencia === 'MONTO' && (
                        <Box flexDirection="column" marginTop={1}>
                            <Text color="cyan">Cuenta Destino: {cuentaDestinoInput}</Text>
                            <Box marginTop={1}>
                                <Text bold>Monto a Transferir ($): </Text>
                                <TextInput value={montoInput} onChange={setMontoInput} onSubmit={handleTransferenciaSubmit} />
                            </Box>
                        </Box>
                    )}

                    {cargando && <Text color="cyan">Verificando cuenta y transfiriendo fondos...</Text>}
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
                            items={[{ label: '↩ Continuar', value: 'continuar' }]}
                            onSelect={() => setPantalla(pantallaSiguiente)}
                        />
                    </Box>
                </Box>
            )}

            {/* Pantalla: Confirmación de Salida */}
            {pantalla === 'CONFIRMAR_SALIDA' && (
                <Box flexDirection="column">
                    <Text color="yellow" bold>🚪 FINALIZAR TRANSACCIÓN</Text>
                    <Text bold>¿Desea finalizar la transacción?</Text>
                    <Box marginTop={1}>
                        <SelectInput
                            items={[
                                { label: '✅ Sí', value: 'si' },
                                { label: '❌ No', value: 'no' }
                            ]}
                            onSelect={handleConfirmarSalidaSelect}
                        />
                    </Box>
                </Box>
            )}

            {/* Pantalla: Despedida */}
            {pantalla === 'DESPEDIDA' && (
                <Box flexDirection="column">
                    <Text color="green" bold>✨ ¡GRACIAS POR USAR NUESTROS SERVICIOS! ✨</Text>
                    <Text color="gray">Esperamos haberte atendido de la mejor manera en Banco Fuego.</Text>
                    <Box marginTop={1}>
                        <SelectInput
                            items={[{ label: '↩ Volver al Inicio', value: 'inicio' }]}
                            onSelect={handleDespedidaSelect}
                        />
                    </Box>
                </Box>
            )}

            {/* Pantalla: Cambiar PIN */}
            {pantalla === 'CAMBIAR_PIN' && (
                <Box flexDirection="column">
                    <Text color="yellow" bold>🔑 CAMBIO DE PIN SECRETO</Text>
                    {pasoPin === 'PIN_ACTUAL' ? (
                        <Box marginTop={1} flexDirection="column">
                            <Text bold>Ingrese su PIN Actual: </Text>
                            <TextInput value={pin} onChange={setPin} onSubmit={() => setPasoPin('PIN_NUEVO')} mask="*" />
                            <Text color="gray" dimColor>(Presione Enter tras ingresar sus 4 dígitos)</Text>
                        </Box>
                    ) : (
                        <Box marginTop={1} flexDirection="column">
                            <Text bold>Ingrese su NUEVO PIN Secreto: </Text>
                            <TextInput value={pinNuevoInput} onChange={setPinNuevoInput} onSubmit={handleCambiarPinSubmit} mask="*" />
                            <Text color="gray" dimColor>(Debe ser exactamente de 4 dígitos numéricos)</Text>
                        </Box>
                    )}
                    {cargando && <Text color="cyan">Actualizando clave secreta en la base de datos...</Text>}
                </Box>
            )}

        </Box>

    );
};
