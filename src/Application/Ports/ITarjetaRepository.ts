// Application/Ports/ITarjetaRepository.ts
import { Tarjeta } from "../../Domain/Entities/Tarjeta";
import { NumeroTarjeta } from "../../Domain/Value-Objects/NumeroTarjeta";

export interface ITarjetaRepository {
    buscarPorNumero(numero: NumeroTarjeta): Promise<Tarjeta | null>;
}