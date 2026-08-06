import { readFileSync } from "fs";
import path from "path";
import { PoolClient } from "pg";

import { IMigration } from "./IMigration";

export class EsquemaSqlMigration implements IMigration {
    public readonly nombre = "000_esquema_sql_base";

    public async ejecutar(cliente: PoolClient): Promise<void> {
        const rutaSql = path.resolve(
            process.cwd(),
            "Base_De_Datos",
            "BancoFuegoScript.sql"
        );

        const contenidoSql = readFileSync(rutaSql, "utf8");

        if (!contenidoSql.trim()) {
            return;
        }

        let indiceSavepoint = 0;

        for (const sentencia of this.dividirSentencias(contenidoSql)) {
            if (!sentencia.trim()) {
                continue;
            }

            const savepoint = `sp_${indiceSavepoint}`;
            indiceSavepoint += 1;

            try {
                await cliente.query(`SAVEPOINT ${savepoint}`);
                await cliente.query(sentencia);
                await cliente.query(`RELEASE ${savepoint}`);
            } catch (error) {
                const mensaje = error instanceof Error
                    ? error.message
                    : String(error);

                await cliente.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
                await cliente.query(`RELEASE ${savepoint}`);

                if (this.esErrorIgnorable(mensaje)) {
                    continue;
                }

                throw error;
            }
        }
    }

    private esErrorIgnorable(mensaje: string): boolean {
        const texto = mensaje.toLowerCase();

        return texto.includes("already exists")
            || texto.includes("duplicate key")
            || texto.includes("duplicate object")
            || texto.includes("already defined")
            || texto.includes("constraint") && texto.includes("already exists");
    }

    private dividirSentencias(sql: string): string[] {
        const sentencias: string[] = [];
        let buffer = "";
        let estado: "normal" | "string" | "doubleQuote" = "normal";

        for (let indice = 0; indice < sql.length; indice += 1) {
            const caracter = sql[indice];

            if (estado === "string") {
                buffer += caracter;

                if (caracter === "'" && sql[indice - 1] !== "\\") {
                    estado = "normal";
                }

                continue;
            }

            if (estado === "doubleQuote") {
                buffer += caracter;

                if (caracter === '"') {
                    estado = "normal";
                }

                continue;
            }

            if (caracter === "'") {
                estado = "string";
                buffer += caracter;
                continue;
            }

            if (caracter === '"') {
                estado = "doubleQuote";
                buffer += caracter;
                continue;
            }

            if (caracter === ";") {
                const sentencia = buffer.trim();

                if (sentencia) {
                    sentencias.push(sentencia);
                }

                buffer = "";
                continue;
            }

            buffer += caracter;
        }

        const sentenciaFinal = buffer.trim();

        if (sentenciaFinal) {
            sentencias.push(sentenciaFinal);
        }

        return sentencias;
    }
}
