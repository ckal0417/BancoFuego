export class CodigoBanco {
    private constructor(
        private readonly valor: string
    ) { }

    public static desde(valor: string): CodigoBanco {
        if (!valor || valor.trim().length === 0) {
            throw new Error(
                "El código de banco no puede estar vacío"
            );
        }

        return new CodigoBanco(valor);
    }

    public toString(): string {
        return this.valor;
    }

    public equals(otro: CodigoBanco): boolean {
        return this.valor === otro.valor;
    }
}