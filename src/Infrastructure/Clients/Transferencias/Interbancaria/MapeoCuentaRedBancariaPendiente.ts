import { IMapeoCuentaRedBancaria } from "../../../../Application/Ports/Transferencias/Interbancaria/IMapeoCuentaBancaria";
import { randomUUID } from "crypto";

export class MapeoCuentaRedBancariaPendiente implements IMapeoCuentaRedBancaria {
    public async resolverAccountIdRed(
        numeroCuentaLocal: string
    ): Promise<string> {
        // Mocking the mapping between local account references and network UUIDs
        // In a real system, this would query the network's API or a local mapping table.
        // We use structurally valid UUIDv4 strings so that the ATM backend's ValidationPipe accepts them.
        if (numeroCuentaLocal === "1") {
            return "11111111-1111-4111-a111-111111111111";
        }
        if (numeroCuentaLocal === "777000111") {
            return "77777777-7777-4777-a777-777777777777";
        }
        
        // As a fallback, we return a random UUID instead of throwing a synchronous error.
        // This allows the API Gateway to accept the payload, and the network to reject it asynchronously.
        return randomUUID();
    }
}