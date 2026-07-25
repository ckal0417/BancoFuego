
export interface RespuestaCallbackInterbancarioRequestDto {
    referenciaExterna: string;
    estado: "ACEPTADA" | "RECHAZADA";
    codigoError?: string;
    mensaje?: string;
}