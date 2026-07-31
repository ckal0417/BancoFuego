import { IRedBancariaClient } from "../../Application/Ports/Transferencias/Interbancaria/IRedBancariaClient";
import { MapeoCuentaRedBancariaPendiente } from "../Clients/Transferencias/Interbancaria/MapeoCuentaRedBancariaPendiente";
import { RedBancariaHttpClient } from "../Clients/Transferencias/Interbancaria/RedBancariaHttpClient";
import { RedBancariaSimuladaClient } from "../Clients/Transferencias/Interbancaria/RedBancariaSimuladaClient";
import { RedBancariaConfig } from "../Config/RedBancariaConfig";

export class RedBancariaClientFactory {
    public static crear(config: RedBancariaConfig): IRedBancariaClient {
        switch (config.modo) {
            case "REAL":
                return new RedBancariaHttpClient(
                    config.apiUrl,
                    config.apiKey,
                    new MapeoCuentaRedBancariaPendiente()
                );
            case "SIMULADO":
                return new RedBancariaSimuladaClient();
        }
    }
}
