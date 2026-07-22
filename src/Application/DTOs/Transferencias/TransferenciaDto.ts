import { 
    TransferenciaLocalRequestDto, TransferenciaLocalResponseDto
} from "./Local/TransferenciaLocalDto";
import {
    TransferenciaInterbancariaRequestDto, TransferenciaInterbancariaResponseDto
} from "./Interbancaria/TransferenciaInterbancariaDto";
import { TipoTransferencia } from "../../../Domain/Enums/Transferencias/TipoTransferencia";

export type TransferenciaRequestDto =
    | ({
          tipoTransferencia: "LOCAL";
      } & TransferenciaLocalRequestDto)
    | ({
          tipoTransferencia: "INTERBANCARIA";
      } & TransferenciaInterbancariaRequestDto);

export type TransferenciaResponseDto =
    | TransferenciaLocalResponseDto
    | TransferenciaInterbancariaResponseDto;

export interface TransferenciaBaseDto {
    tipoTransferencia: TipoTransferencia;
    cuentaOrigenId: number;
    monto: number;
    idempotencyKey?: string;
    correoCliente?: string;
}