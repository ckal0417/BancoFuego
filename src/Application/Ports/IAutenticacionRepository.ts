// Application/Ports/IAutenticacionRepository.ts
import { Autenticacion } from "../../Domain/Entities/Autenticacion";

export interface IAutenticacionRepository {
    buscarPorIdTarjeta(idTarjeta: number): Promise<Autenticacion | null>;
    guardar(autenticacion: Autenticacion): Promise<void>;
}