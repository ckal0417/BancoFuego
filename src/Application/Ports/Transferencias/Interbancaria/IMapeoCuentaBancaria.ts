export interface IMapeoCuentaRedBancaria {
    /**
     * @param numeroCuentaLocal Número de cuenta interno o externo.
     * @param codigoBanco Código o nombre de la entidad bancaria elegida.
     * @returns el account_id (UUID) correspondiente en la red.
     * @throws si la cuenta no pertenece al banco seleccionado o no existe.
     */
    resolverAccountIdRed(numeroCuentaLocal: string, codigoBanco?: string): Promise<string>;
}