import type { Interface } from "node:readline/promises";
import { BancoApiClient } from "../Clients/BancoApiClient";
import { SesionCajero } from "../SesionCajero";
import { Consola } from "../Utils/Consola";

interface LoginResponse {
    token: string;
    titular: string;
    numeroCuenta: string;
    tipoCuenta: string;
}

export class LoginMenu {
    constructor(
        private readonly entrada: Interface,
        private readonly apiClient: BancoApiClient,
        private readonly sesion: SesionCajero
    ) {}

    public async ejecutar(): Promise<boolean> {
        Consola.pantalla("INICIO DE SESIÓN");

        const numeroTarjeta = (
            await this.entrada.question("Número de tarjeta: ")
        ).trim();

        const pin = (
            await this.entrada.question("PIN: ")
        ).trim();

        if (!numeroTarjeta || !pin) {
            Consola.error("La tarjeta y el PIN son obligatorios.");
            await this.continuar();
            return false;
        }

        try {
            const respuesta = await this.apiClient.post<LoginResponse>(
                "/auth/login",
                {
                    numeroTarjeta,
                    pin
                }
            );

            this.sesion.iniciar({
                token: respuesta.token,
                titular: respuesta.titular,
                numeroCuenta: respuesta.numeroCuenta,
                tipoCuenta: respuesta.tipoCuenta
            });

            Consola.exito(`Bienvenido, ${respuesta.titular}.`);
            await this.continuar();

            return true;
        } catch (error) {
            Consola.error(this.obtenerMensaje(error));
            await this.continuar();

            return false;
        }
    }

    private async continuar(): Promise<void> {
        await this.entrada.question(
            "\nPresione ENTER para continuar..."
        );
    }

    private obtenerMensaje(error: unknown): string {
        return error instanceof Error
            ? error.message
            : "No fue posible iniciar sesión.";
    }
}