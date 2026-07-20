import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { BancoApiClient } from "./Clients/BancoApiClient";
import { ConsultarSaldoCommand } from "./Commands/ConsultarSaldoCommand";
import { DepositarCommand } from "./Commands/DepositarCommand";
import { HistorialCommand } from "./Commands/HistorialCommand";
import { ICommandConsola } from "./Commands/ICommandConsola";
import { RetirarCommand } from "./Commands/RetirarCommand";
import { TransferirCommand } from "./Commands/TransferirCommand";
import { LoginMenu } from "./Menus/LoginMenu";
import { MainMenu } from "./Menus/MainMenu";
import { SesionCajero } from "./SesionCajero";
import { Consola } from "./Utils/Consola";

async function iniciar(): Promise<void> {
    const entrada = createInterface({
        input,
        output
    });

    const apiClient = new BancoApiClient();
    const sesion = new SesionCajero();

    const comandos = new Map<string, ICommandConsola>([
        [
            "1",
            new ConsultarSaldoCommand(
                entrada,
                apiClient,
                sesion
            )
        ],
        [
            "2",
            new DepositarCommand(
                entrada,
                apiClient,
                sesion
            )
        ],
        [
            "3",
            new RetirarCommand(
                entrada,
                apiClient,
                sesion
            )
        ],
        [
            "4",
            new TransferirCommand(
                entrada,
                apiClient,
                sesion
            )
        ],
        [
            "5",
            new HistorialCommand(
                entrada,
                apiClient,
                sesion
            )
        ]
    ]);

    const loginMenu = new LoginMenu(
        entrada,
        apiClient,
        sesion
    );

    const mainMenu = new MainMenu(
        entrada,
        sesion,
        comandos
    );

    try {
        let programaActivo = true;

        while (programaActivo) {
            const loginExitoso = await loginMenu.ejecutar();

            if (!loginExitoso) {
                programaActivo = await preguntarReintento(entrada);
                continue;
            }

            await mainMenu.ejecutar();

            programaActivo = await preguntarNuevaSesion(entrada);
        }

        Consola.pantalla("BANCO FUEGO");
        Consola.informacion("Gracias por utilizar nuestro cajero.");
    } catch (error) {
        const mensaje =
            error instanceof Error
                ? error.message
                : "Ocurrió un error inesperado.";

        Consola.error(mensaje);
    } finally {
        entrada.close();
    }
}

async function preguntarReintento(
    entrada: ReturnType<typeof createInterface>
): Promise<boolean> {
    const respuesta = (
        await entrada.question(
            "\n¿Desea intentar iniciar sesión nuevamente? (s/n): "
        )
    )
        .trim()
        .toLowerCase();

    return respuesta === "s" || respuesta === "si";
}

async function preguntarNuevaSesion(
    entrada: ReturnType<typeof createInterface>
): Promise<boolean> {
    const respuesta = (
        await entrada.question(
            "\n¿Desea iniciar otra sesión? (s/n): "
        )
    )
        .trim()
        .toLowerCase();

    return respuesta === "s" || respuesta === "si";
}

iniciar().catch((error: unknown) => {
    const mensaje =
        error instanceof Error
            ? error.message
            : "No fue posible iniciar la consola.";

    console.error(mensaje);
    process.exitCode = 1;
});