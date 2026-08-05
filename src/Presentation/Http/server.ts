import "dotenv/config";
import { app } from "./app";
import { transferenciaInterbancariaPollingWorker, transferenciasEntrantesPollingWorker } from "../../Bootstrap/CompositionRoot";
import { PostgresConnection } from "../../Infrastructure/Database/PostgresConnection";
import logger from "../../Shared/Logging/Logger";

const puerto =
    Number(
        process.env.PORT ?? 3000
    );

const pollingHabilitado =
    resolverBanderaPolling(
        process.env.INTERBANK_POLLING_ENABLED
    );

async function iniciarServidor():
    Promise<void> {
    try {
        await PostgresConnection
            .verificarConexion();

        const servidor =
            app.listen(
                puerto,
                () => {
                    logger.info(
                        `API BancoFuego ejecutándose en el puerto ${puerto}`
                    );

                    if (pollingHabilitado) {
                        transferenciaInterbancariaPollingWorker.iniciar();
                        transferenciasEntrantesPollingWorker.iniciar();
                        logger.info(
                            "Polling interbancario habilitado"
                        );
                    } else {
                        logger.info(
                            "Polling interbancario deshabilitado por INTERBANK_POLLING_ENABLED"
                        );
                    }
                }
            );

        const cerrarServidor = (
            señal: string
        ): void => {
            logger.info(
                `Se recibió ${señal}. Cerrando BancoFuego...`
            );

            if (pollingHabilitado) {
                transferenciaInterbancariaPollingWorker.detener();
                transferenciasEntrantesPollingWorker.detener();
            }

            servidor.close(
                () => {
                    logger.info(
                        "Servidor HTTP detenido."
                    );

                    process.exitCode = 0;
                }
            );
        };

        process.once(
            "SIGINT",
            () => cerrarServidor("SIGINT")
        );

        process.once(
            "SIGTERM",
            () => cerrarServidor("SIGTERM")
        );
    } catch (error) {
        const mensaje =
            error instanceof Error
                ? error.message
                : "Error desconocido";

        logger.error(
            `No fue posible iniciar la API: ${mensaje}`
        );

        process.exitCode = 1;
    }
}

function resolverBanderaPolling(
    valor: string | undefined
): boolean {
    if (valor === undefined) {
        return true;
    }

    const limpio = valor
        .trim()
        .toLowerCase();

    if (
        limpio === "true" ||
        limpio === "1"
    ) {
        return true;
    }

    if (
        limpio === "false" ||
        limpio === "0"
    ) {
        return false;
    }

    logger.warn(
        `Valor no reconocido para INTERBANK_POLLING_ENABLED: ${valor}. Se usará 'true'.`
    );

    return true;
}

void iniciarServidor();