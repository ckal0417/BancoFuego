import {
    ProcesarTransferenciaEntranteRequestDto
} from "../../../../DTOs/Transferencias/Interbancaria/Entrante/ProcesarTransferenciaEntranteDto";

import { IRedBancariaClient } from "../../../../Ports/Transferencias/Interbancaria/IRedBancariaClient";

import { CorrelationId } from "../../../../../Domain/ValueObjects/CorrelationId";
import { ProcesarTransferenciaEntranteService } from "./ProcesarTransferenciaEntranteService";


export class ProcesarTransferenciasEntrantesService {

    constructor(
        private readonly redBancariaClient: IRedBancariaClient,
        private readonly procesarTransferenciaEntranteService: ProcesarTransferenciaEntranteService
    ) { }

    public async ejecutar(): Promise<void> {

        const transferencias =
            await this.redBancariaClient
                .obtenerTransferenciasEntrantesPendientes();

        for (const transferencia of transferencias) {

            try {

                const solicitud: ProcesarTransferenciaEntranteRequestDto = {

                    correlationId: transferencia.correlationId,

                    codigoBancoOrigen:
                        transferencia.codigoBancoOrigen,

                    numeroCuentaOrigen:
                        transferencia.numeroCuentaOrigen,

                    numeroCuentaDestino:
                        transferencia.numeroCuentaDestino,

                    monto: transferencia.amount,

                    concepto: transferencia.description
                };

                await this.procesarTransferenciaEntranteService
                    .ejecutar(solicitud);

                await this.redBancariaClient.confirmarTransferenciaEntrantesProcesada(
                    CorrelationId.desde(
                        transferencia.correlationId
                    )
                );

            } catch (error) {

                console.error(
                    `Error procesando transferencia ${transferencia.correlationId}`,
                    error
                );

            }

        }

    }

}