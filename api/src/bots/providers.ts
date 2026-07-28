import path from "path";
import { WhatsAppProvider } from "../../generated/prisma/enums.js";
import type { Usuario } from "../types/usuario.js";
import { disconnectBot as disconnectBaileys, startBot as startBaileys } from "./baileys/baileys.js";

type BotProviderAdapter = {
    provider: WhatsAppProvider;
    start: (usuario: Usuario) => Promise<Usuario | void>;
    disconnect: (usuario: Usuario) => Promise<void>;
    getSessionPaths: (usuarioId: number) => string[];
};

const root = process.cwd();

const providers = {
    BAILEYS: {
        provider: WhatsAppProvider.BAILEYS,
        start: startBaileys,
        disconnect: disconnectBaileys,
        getSessionPaths: (usuarioId) => [
            path.join(root, "src", "bots", "baileys", "sessions", `bot-baileys-${usuarioId}`)
        ]
    }
} satisfies Record<WhatsAppProvider, BotProviderAdapter>;

const defaultProvider = WhatsAppProvider.BAILEYS;

function getProviderAdapter() {
    return providers.BAILEYS;
}

export { defaultProvider, getProviderAdapter, providers };
