import { ICuentaRepository } from "../../../Application/Ports/ICuentaRepository";
import { Cuenta } from "../../../Domain/Entities/Cuenta";
import { Dinero } from "../../../Domain/ValueObjects/Dinero";
import { NumeroCuenta } from "../../../Domain/ValueObjects/NumeroCuenta";
import { TipoCuenta } from "../../../Domain/Enums/TipoCuenta";
import { PostgresConnection } from "../PostgresConnection";
import { CuentaQueries } from "../Queries/CuentaQueries";



interface FilaCuenta {
    id_cuenta: number;
    numero_cuenta: string;
    tipo: TipoCuenta;
    saldo: string; // NUMERIC llega como string desde pg
    fecha_creacion: Date;
    activa: boolean;
    id_cliente: number;
    id_banco: number;
}

export class CuentaRepositoryPostgres implements ICuentaRepository {
    private readonly pool = PostgresConnection.obtenerPool();

    async buscarPorId(id: number): Promise<Cuenta | null> {
        const resultado = await this.pool.query<FilaCuenta>(
            CuentaQueries.BUSCAR_POR_ID,
            [id],
        );
        if (resultado.rowCount === 0) return null;
        return this.aEntidad(resultado.rows[0]!);
    }

    async crear(cuenta: Cuenta): Promise<number> {
        const resultado = await this.pool.query<{ id_cuenta: number }>(
            CuentaQueries.CREAR,
            [
                cuenta.obtenerNumeroCuenta().toString(),
                cuenta.obtenerTipo(),
                cuenta.obtenerSaldo().toNumber(),
                cuenta.obtenerIdCliente(),
                cuenta.obtenerIdBanco(),
            ],
        );
        return resultado.rows[0]!.id_cuenta;
    }

    async actualizar(cuenta: Cuenta): Promise<void> {
        const id = cuenta.obtenerId();
        if (id === undefined) {
            throw new Error("No se puede actualizar una cuenta sin id");
        }
        await this.pool.query(CuentaQueries.ACTUALIZAR, [
            cuenta.obtenerSaldo().toNumber(),
            cuenta.estaActiva(),
            id,
        ]);
    }

    private aEntidad(fila: FilaCuenta): Cuenta {
        return Cuenta.reconstruir({
            id: fila.id_cuenta,
            numeroCuenta: NumeroCuenta.desde(fila.numero_cuenta),
            tipo: fila.tipo,
            saldo: Dinero.desde(parseFloat(fila.saldo)),
            fechaCreacion: fila.fecha_creacion,
            activa: fila.activa,
            idCliente: fila.id_cliente,
            idBanco: fila.id_banco,
        });
    }


}