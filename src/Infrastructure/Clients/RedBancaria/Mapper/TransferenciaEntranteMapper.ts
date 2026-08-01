import { RegistroTransferenciaEntrante } from "../../../../Domain/Entities/RegistroTransferenciaEntrante";
import { CorrelationId } from "../../../../Domain/ValueObjects/CorrelationId";
import { Dinero } from "../../../../Domain/ValueObjects/Dinero";
import { NumeroCuenta } from "../../../../Domain/ValueObjects/NumeroCuenta";
import { TransferCommandDto } from "../Dtos/Requests/TransferComandDto";


export class TransferenciaEntranteMapper {

    public static desdeTransferCommand(
        dto: TransferCommandDto,
        idCuentaDestino: number
    ): RegistroTransferenciaEntrante {

        if (!dto.correlation_id) {
            throw new Error(
                "La transferencia no contiene un CorrelationId."
            );
        }

        return RegistroTransferenciaEntrante.crear({

            correlationId: CorrelationId.desde(
                dto.correlation_id
            ),

            codigoBancoOrigen: dto.source_bank,

            cuentaOrigen: NumeroCuenta.desde(
                dto.from_account_id
            ),

            cuentaDestino: NumeroCuenta.desde(
                dto.to_account_id
            ),

            monto: Dinero.desdeCentavos(
                dto.amount
            ),

            concepto: dto.description,

            idCuentaDestino
        });
    }

}