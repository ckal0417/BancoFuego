import { createHmac, timingSafeEqual } from "node:crypto";
import { NextFunction, Request, Response } from "express";

export class WebhookSignatureMiddleware {
    constructor(
        private readonly secreto: string,
        private readonly tiempoMaximoSegundos: number = 300
    ) {
        if (!secreto || secreto.trim().length === 0) {
            throw new Error(
                "INTERBANK_WEBHOOK_SECRET no está configurado"
            );
        }
    }

    public verificar = (
        req: Request,
        res: Response,
        next: NextFunction
    ): void => {

        const firmaRecibida = req.header("X-Webhook-Signature");
        const timestamp = req.header("X-Webhook-Timestamp");
        if (!firmaRecibida || !timestamp) {
            res.status(401).json({
                mensaje: "La firma y el timestamp del webhook son obligatorios",
                codigo: "WEBHOOK_CREDENCIALES_FALTANTES"
            });

            return;
        }
        if (!this.timestampEsValido(timestamp)) {
            res.status(401).json({
                mensaje: "El timestamp del webhook ha expirado o no es válido",
                codigo: "WEBHOOK_TIMESTAMP_INVALIDO"
            });
            return;
        }
        const contenidoFirmado =
        this.crearContenidoFirmado(
            timestamp,
            req.body
        );
        const firmaEsperada =
        this.generarFirma(
            contenidoFirmado
        );
        if (
            !this.compararFirmas(
                firmaRecibida,
                firmaEsperada
            )
        ) {
            res.status(401).json({
                mensaje: "La firma del webhook no es válida",
                codigo: "WEBHOOK_FIRMA_INVALIDA"
            });
            return;
        }
        next();
    };

    private crearContenidoFirmado(
        timestamp: string,
        body: unknown
    ): string {
        return `${timestamp}.${JSON.stringify(body)}`;
    }

    private generarFirma(
        contenido: string
    ): string {
        return createHmac(
            "sha256",
            this.secreto
        ).update(
            contenido,
            "utf8"
        )
        .digest(
            "hex"
        );
    }

    private timestampEsValido(
        timestamp: string
    ): boolean {
        const fechaWebhook = new Date(timestamp);
        if (
            Number.isNaN(
                fechaWebhook.getTime()
            )
        ) {
            return false;
        }

        const diferenciaMilisegundos = Math.abs(
            Date.now() -
            fechaWebhook.getTime()
        );
        const diferenciaSegundos = diferenciaMilisegundos / 1000;
        return diferenciaSegundos <= this.tiempoMaximoSegundos;
    }

    private compararFirmas(
        firmaRecibida: string,
        firmaEsperada: string
    ): boolean {
        const bufferRecibido =  Buffer.from(
            firmaRecibida,
            "utf8"
        );

        const bufferEsperado = Buffer.from(
            firmaEsperada,
            "utf8"
        );

        if (
            bufferRecibido.length !== bufferEsperado.length
        ) {
            return false;
        }

        return timingSafeEqual(
            bufferRecibido,
            bufferEsperado
        );
    }
}