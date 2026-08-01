import { Query } from "pg";
import { IRegistroTransferenciaEntranteRepository } from "../../../Application/Ports/Transferencias/Interbancaria/IRegistroTransferenciaEntranteRepository";
import { RegistroTransferenciaEntrante } from "../../../Domain/Entities/RegistroTransferenciaEntrante";
import { CorrelationId } from "../../../Domain/ValueObjects/CorrelationId";
import { PostgresConnection } from "../PostgresConnection";
import { QueryExecutor } from "../QueryExecutor";

import { NumeroCuenta } from "../../../Domain/ValueObjects/NumeroCuenta";
import { Dinero } from "../../../Domain/ValueObjects/Dinero";
import { RegistroTransferenciasEntrantesQueries } from "../Queries/TrnasferrenciasEntrantesQueries";


interface FilaRegistroTransferenciaEntrante {

    id_transferencia_entrante: number;
    correlation_id: string;
    codigo_banco_origen: string;
    cuenta_origen: string;
    cuenta_destino: string;
    monto_centavos: number;
    concepto: string;
    id_cuenta_destino: number;
    procesado_en: Date;
}


export class RegistroTransferenciaEntranteRepositoryPostgres implements IRegistroTransferenciaEntranteRepository {

    private readonly executor: QueryExecutor;

    constructor(execcutor: QueryExecutor = PostgresConnection.obtenerPool()) {
        this.executor = execcutor;
    }

    public async guardar(registro: RegistroTransferenciaEntrante): Promise<number> {
        const resultado = await this.executor.query<{ id: number }>(
            RegistroTransferenciasEntrantesQueries.CREAR,
            [
                registro
                    .obtenerCorrelationId()
                    .toString(),

                registro
                    .obtenerCodigoBancoOrigen(),

                registro
                    .obtenerCuentaOrigen()
                    .toString(),

                registro
                    .obtenerCuentaDestino()
                    .toString(),

                registro
                    .obtenerMonto()
                    .toCentavos(),

                registro
                    .obtenerConcepto(),

                registro
                    .obtenerIdCuentaDestino(),

                registro
                    .obtenerProcesadoEn()

            ]
        );

        return resultado.rows[0]!.id;
    }

    public async buscarPorCorrelationId(
        correlationId: CorrelationId
    ): Promise<RegistroTransferenciaEntrante | null> {

        const resultado =
            await this.executor.query<FilaRegistroTransferenciaEntrante>(
                RegistroTransferenciasEntrantesQueries.BUSCAR_POR_CORRELATION_ID,
                [
                    correlationId.toString()
                ]
            );

        const fila = resultado.rows[0];

        return fila
            ? this.aEntidad(fila)
            : null;
    }

    private aEntidad(
        fila: FilaRegistroTransferenciaEntrante
    ): RegistroTransferenciaEntrante {

        return RegistroTransferenciaEntrante.reconstruir({

            id: fila.id_transferencia_entrante,
            correlationId:
                CorrelationId.desde(fila.correlation_id),
            codigoBancoOrigen:
                fila.codigo_banco_origen,
            cuentaOrigen:
                NumeroCuenta.desde(fila.cuenta_origen),
            cuentaDestino:
                NumeroCuenta.desde(fila.cuenta_destino),
            monto:
                Dinero.desdeCentavos(fila.monto_centavos),
            concepto:
                fila.concepto,
            idCuentaDestino:
                fila.id_cuenta_destino,
            procesadoEn:
                fila.procesado_en
        });
    }

}