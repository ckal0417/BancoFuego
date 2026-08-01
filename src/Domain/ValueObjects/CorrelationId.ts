export class CorrelationId {

    private constructor(
        private readonly valor: string
    ) { }

    public static desde(
        valor: string
    ): CorrelationId {

        if (!valor.trim()) {
            throw new Error(
                "El CorrelationId no puede estar vacío."
            );
        }

        return new CorrelationId(valor);
    }

    public toString(): string {
        return this.valor;
    }

    public equals(
        otro: CorrelationId
    ): boolean {

        return this.valor === otro.valor;
    }
}