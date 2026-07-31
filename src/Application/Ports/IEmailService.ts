export interface OpcionesCorreo {
    para: string;
    asunto: string;
    html: string;
    texto?: string;
}

export interface IEmailService {
    enviarCorreo(opciones: OpcionesCorreo): Promise<boolean>;
}