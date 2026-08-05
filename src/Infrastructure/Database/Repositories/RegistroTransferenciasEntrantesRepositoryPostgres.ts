import { IRegistroTransferenciaEntranteRepository} from "../../../Application/Ports/Transferencias/Interbancaria/IRegistroTransferenciaEntranteRepository";
import { RegistroTransferenciaEntrante } from "../../../Domain/Entities/RegistroTransferenciaEntrante";
import { CorrelationId } from "../../../Domain/ValueObjects/CorrelationId";
import { NumeroCuenta } from "../../../Domain/ValueObjects/NumeroCuenta";
import { Dinero } from "../../../Domain/ValueObjects/Dinero";
import { PostgresConnection } from "../PostgresConnection";
import { QueryExecutor } from "../QueryExecutor";
import { RegistroTransferenciasEntrantesQueries } from "../Queries/TransferenciasEntrantesQueries";

interface FilaRegistroTransferenciaEntrante {
    id_transferencia_entrante: number;
    correlation_id: string;
    codigo_banco_origen: string;
    numero_cuenta_origen: string;
    numero_cuenta_destino: string;
    monto: number;
    concepto: string | null;
    id_cuenta_destino: number;
    procesado_en: Date;
}

interface FilaRegistroCreado {
    id_transferencia_entrante: number;
}

interface ErrorPostgres {
    code?: string;
    constraint?: string;
}

export class RegistroTransferenciaEntranteRepositoryPostgres
implements IRegistroTransferenciaEntranteRepository {

    private readonly executor: QueryExecutor;
    constructor(
        executor: QueryExecutor = PostgresConnection.obtenerPool()
    ) {
        this.executor = executor;
    }
    public async guardar(
        registro: RegistroTransferenciaEntrante
    ): Promise<number> {
        const correlationId =
            registro
                .obtenerCorrelationId()
                .toString();

        const parametros = [
            correlationId,

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
                .obtenerConcepto() ?? null,

            registro
                .obtenerIdCuentaDestino(),

            registro
                .obtenerProcesadoEn()
        ];

        try {
            const resultado = await this.executor.query<FilaRegistroCreado>(
                RegistroTransferenciasEntrantesQueries.CREAR,
                parametros
            );

            const fila = resultado.rows[0];
            if (!fila) {
                throw new Error(
                    "No se pudo registrar la transferencia entrante."
                );
            }

            return fila.id_transferencia_entrante;
        } catch (error) {
            if (
                !this.esDuplicadoPorCorrelationId(error)
            ) {
                throw error;
            }

            const existente = await this.buscarPorCorrelationId(
                CorrelationId.desde(correlationId)
            );

            const idExistente =
                existente?.obtenerId();

            if (idExistente === undefined) {
                throw new Error(
                    "Existe una transferencia entrante con el mismo correlationId, pero no fue posible recuperar su id."
                );
            }

            return idExistente;
        }
    }

    public async buscarPorCorrelationId(
        correlationId: CorrelationId
    ): Promise<RegistroTransferenciaEntrante | null> {

        const resultado = await this.executor.query<FilaRegistroTransferenciaEntrante>(
            RegistroTransferenciasEntrantesQueries
                .BUSCAR_POR_CORRELATION_ID,
            [
                correlationId.toString()
            ]
        );

        const fila = resultado.rows[0];
        return fila? this.aEntidad(fila) : null;
    }

    private aEntidad(
        fila: FilaRegistroTransferenciaEntrante
    ): RegistroTransferenciaEntrante {

        return RegistroTransferenciaEntrante.reconstruir({

            id: fila.id_transferencia_entrante,
            correlationId: CorrelationId.desde(
                fila.correlation_id
            ),
            codigoBancoOrigen: fila.codigo_banco_origen,
            cuentaOrigen: NumeroCuenta.desde(
                fila.numero_cuenta_origen
            ),
            cuentaDestino: NumeroCuenta.desde(
                fila.numero_cuenta_destino
            ),
            monto: Dinero.desdeCentavos(
                fila.monto
            ),
            concepto: fila.concepto ?? "",
            idCuentaDestino: fila.id_cuenta_destino,
            procesadoEn: fila.procesado_en
        });
    }

    private esDuplicadoPorCorrelationId(
        error: unknown
    ): boolean {
        const errorPostgres =
            error as ErrorPostgres;

        if (errorPostgres.code !== "23505") {
            return false;
        }

        if (!errorPostgres.constraint) {
            return true;
        }

        return errorPostgres.constraint
            .toLowerCase()
            .includes("correlation");
    }
}