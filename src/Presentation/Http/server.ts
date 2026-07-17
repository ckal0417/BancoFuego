import "dotenv/config";
import { app } from "./app";
import { PostgresConnection } from "../../Infrastructure/Database/PostgresConnection";
import logger from "../../Shared/Logging/Logger";

const puerto = Number(
    process.env.PORT ?? 3000
);

async function iniciarServidor(): Promise<void> {
    try {
        await PostgresConnection.verificarConexion();

        app.listen(
            puerto,
            () => {
                logger.info(
                    `API BancoFuego ejecutándose en el puerto ${puerto}`
                );
            }
        );
    } catch (error) {
        const mensaje =
            error instanceof Error
                ? error.message
                : "Error desconocido";

        logger.error(
            `No fue posible iniciar la API: ${mensaje}`
        );

        process.exit(1);
    }
}

void iniciarServidor();