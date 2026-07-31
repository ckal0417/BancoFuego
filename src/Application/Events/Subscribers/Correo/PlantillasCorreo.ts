import { DatosCorreoEvento } from "./DatosCorreoEvento";

export interface PlantillaCorreo {
    asunto: string;
    html: string;
}

export function crearPlantillaCorreo(eventoNombre: string, datos: DatosCorreoEvento): PlantillaCorreo {
    switch (eventoNombre) {
        case "DEPOSITO_REALIZADO":
            return crearPlantillaDeposito(datos);

        case "RETIRO_REALIZADO":
            return crearPlantillaRetiro(datos);

        case "TRANSFERENCIA_REALIZADA":
            return crearPlantillaTransferencia(datos);

        default:
            return crearPlantillaGenerica(eventoNombre);
    }
}

function crearPlantillaDeposito(datos: DatosCorreoEvento): PlantillaCorreo {
    return {
        asunto: "🔥 Banco Fuego - Depósito Exitoso",
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #28a745; border-radius: 8px;">
                <h2 style="color: #28a745;">🔥 Banco Fuego - Depósito Confirmado</h2>
                <p>Se ha abonado dinero correctamente en su cuenta.</p>
                <p><strong>Monto depositado:</strong> $${formatearMonto(datos.monto)}</p>
                <p style="color: #666; font-size: 12px;">Gracias por confiar en Banco Fuego.</p>
            </div>
        `
    };
}

function crearPlantillaRetiro(datos: DatosCorreoEvento): PlantillaCorreo {
    return {
        asunto: "🔥 Banco Fuego - Retiro Realizado",
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #dc3545; border-radius: 8px;">
                <h2 style="color: #dc3545;">🔥 Banco Fuego - Retiro de Efectivo</h2>
                <p>Se ha debitado dinero de su cuenta mediante un retiro.</p>
                <p><strong>Monto retirado:</strong> $${formatearMonto(datos.monto)}</p>
                <p style="color: #666; font-size: 12px;">
                    Si no reconoce esta operación, comuníquese inmediatamente con el banco.
                </p>
            </div>
        `
    };
}

function crearPlantillaTransferencia(datos: DatosCorreoEvento): PlantillaCorreo {
    if (datos.naturaleza === "CREDITO") {
        return crearPlantillaTransferenciaRecibida(datos);
    }

    if (datos.naturaleza === "REVERSA") {
        return crearPlantillaTransferenciaRevertida(datos);
    }

    return crearPlantillaTransferenciaEnviada(datos);
}

function crearPlantillaTransferenciaEnviada(datos: DatosCorreoEvento): PlantillaCorreo {
    const tipoTransferencia = datos.tipo === "TRANSFERENCIA_EXTERNA"
        ? "Interbancaria"
        : "Interna (Banco Fuego)";

    return {
        asunto: "🔥 Banco Fuego - Débito por Transferencia",
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #dc3545; border-radius: 8px;">
                <h2 style="color: #dc3545;">🔥 Banco Fuego - Transferencia Debitada</h2>
                <p>Se ha debitado dinero de su cuenta para realizar una transferencia.</p>
                <p><strong>Monto debitado:</strong> $${formatearMonto(datos.monto)}</p>
                <p><strong>Cuenta destino:</strong> ${datos.numeroCuentaDestino ?? "No especificada"}</p>
                <p><strong>Tipo de transferencia:</strong> ${tipoTransferencia}</p>
                <p style="color: #666; font-size: 12px;">
                    Si no reconoce esta operación, comuníquese inmediatamente con el banco.
                </p>
            </div>
        `
    };
}

function crearPlantillaTransferenciaRecibida(datos: DatosCorreoEvento): PlantillaCorreo {
    return {
        asunto: "🔥 Banco Fuego - Transferencia Recibida",
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #28a745; border-radius: 8px;">
                <h2 style="color: #28a745;">🔥 Banco Fuego - Dinero Recibido</h2>
                <p>Se ha acreditado una transferencia en su cuenta.</p>
                <p><strong>Monto depositado:</strong> $${formatearMonto(datos.monto)}</p>
                <p><strong>Cuenta origen:</strong> ${datos.numeroCuentaOrigen ?? "No especificada"}</p>
                <p style="color: #666; font-size: 12px;">
                    El dinero fue depositado correctamente en su cuenta.
                </p>
            </div>
        `
    };
}

function crearPlantillaTransferenciaRevertida(datos: DatosCorreoEvento): PlantillaCorreo {
    return {
        asunto: "🔥 Banco Fuego - Devolución de Transferencia",
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #28a745; border-radius: 8px;">
                <h2 style="color: #28a745;">🔥 Banco Fuego - Dinero Devuelto</h2>
                <p>El valor de una transferencia interbancaria fue devuelto a su cuenta.</p>
                <p><strong>Monto devuelto:</strong> $${formatearMonto(datos.monto)}</p>
                <p><strong>Referencia:</strong> ${datos.referenciaExterna ?? "No especificada"}</p>
                <p style="color: #666; font-size: 12px;">
                    La transferencia no pudo completarse y el débito fue revertido.
                </p>
            </div>
        `
    };
}

function crearPlantillaGenerica(eventoNombre: string): PlantillaCorreo {
    return {
        asunto: `Banco Fuego - Notificación de ${eventoNombre}`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ff4500; border-radius: 8px;">
                <h2 style="color: #ff4500;">🔥 Banco Fuego</h2>
                <p>Se ha registrado una actividad en su cuenta.</p>
                <p><strong>Evento:</strong> ${eventoNombre}</p>
                <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
            </div>
        `
    };
}

function formatearMonto(monto?: number): string {
    return monto?.toFixed(2) ?? "0.00";
}