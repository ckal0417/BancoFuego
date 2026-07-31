export interface DatosCorreoEvento {
    correoCliente?: string;
    email?: string;
    cuentaId?: number;
    monto?: number;
    numeroCuentaDestino?: string;
    numeroCuentaOrigen?: string;
    cuentaDestinoId?: number;
    cuentaOrigenId?: number;
    tipo?: string;
    naturaleza?: "DEBITO" | "CREDITO" | "REVERSA";
    bancoOrigen?: string;
    bancoDestino?: string;
    referenciaExterna?: string;
    estado?: string;
    reversaAplicada?: boolean;
    origen?: {
        cuentaId?: number;
    };
    destino?: {
        cuentaId?: number;
    };
}