import "dotenv/config";

export type ModoRedBancaria = "REAL" | "SIMULADO";

export interface RedBancariaConfig {
    modo: ModoRedBancaria;
    apiUrl: string;
    apiKey: string;
}

export class ConfigLoader {
    public static cargarRedBancaria(): RedBancariaConfig {
        const valorEnv = process.env.USE_REAL_RED_BANCARIA?.toLowerCase().trim();

        if (valorEnv === undefined || valorEnv === "") {
            throw new Error(
                "❌ Error de Configuración: La variable de entorno USE_REAL_RED_BANCARIA es obligatoria en el archivo .env.\n" +
                "Por favor especifique explícitamente en su .env:\n" +
                "  USE_REAL_RED_BANCARIA=true  (para conectar a la red real de Banred)\n" +
                "  USE_REAL_RED_BANCARIA=false (para usar el simulador offline)"
            );
        }

        const esReal = valorEnv === "true" || valorEnv === "1";

        return {
            modo: esReal ? "REAL" : "SIMULADO",
            apiUrl: process.env.BANRED_API_URL ?? "http://localhost:7000/api",
            apiKey: process.env.BANRED_API_KEY ?? "sk-banco-fuego-key-2026"
        };
    }
}
