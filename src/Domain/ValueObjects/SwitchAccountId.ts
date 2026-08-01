export class SwitchAccountId {
    private constructor(
        private readonly valor: string
    ) { }

    public static desde(valor: string): SwitchAccountId {
        if (!valor.trim()) {
            throw new Error(
                "El SwitchAccountId no puede estar vacío"
            );
        }

        return new SwitchAccountId(valor);
    }

    public toString(): string {
        return this.valor;
    }

    public equals(
        otro: SwitchAccountId
    ): boolean {
        return this.valor === otro.valor;
    }
}