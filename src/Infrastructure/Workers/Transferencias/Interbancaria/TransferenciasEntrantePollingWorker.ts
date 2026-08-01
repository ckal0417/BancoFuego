import { ProcesarTransferenciasEntrantesService } from "../../../../Application/Services/Transferencias/Interbancaria/Entrante/ProcesarTransferenciasEntrantesService";


export class TransferenciasEntrantesPollingWorker {

    private temporizador?: NodeJS.Timeout;

    constructor(
        private readonly procesarTransferenciasEntrantesService:
            ProcesarTransferenciasEntrantesService,
        private readonly intervaloMs: number
    ) { }

    public iniciar(): void {

        if (this.temporizador) {
            return;
        }

        this.temporizador = setInterval(
            async () => {

                try {

                    await this
                        .procesarTransferenciasEntrantesService
                        .ejecutar();

                } catch (error) {

                    console.error(
                        "[Worker Transferencias Entrantes]",
                        error
                    );

                }

            },
            this.intervaloMs
        );

    }

    public detener(): void {

        if (!this.temporizador) {
            return;
        }

        clearInterval(this.temporizador);
        this.temporizador = undefined;

    }

}