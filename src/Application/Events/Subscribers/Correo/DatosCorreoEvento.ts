export interface DatosCorreoEvento {
    correoCliente?: string;
    email?: string;

    cuentaId?: number;
    cuentaDestinoId?: number;
    cuentaOrigenId?: number;

    monto?: number;

    numeroCuentaDestino?: string;
    numeroCuentaOrigen?: string;

    nombreTitularOrigen?: string;
    nombreTitularDestino?: string;

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