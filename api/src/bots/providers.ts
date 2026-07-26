import path from "path";
import { WhatsAppProvider } from "../../generated/prisma/enums.js";
import { env } from "../env.js";
import type { Usuario } from "../types/usuario.js";
import { disconnectBot as disconnectBaileys, startBot as startBaileys } from "./baileys/baileys.js";
import { disconnectBot as disconnectWhatsappWeb, startBot as startWhatsappWeb } from "./whatsapp_web/whatsapp_web.js";

type BotProviderAdapter = {
    provider: WhatsAppProvider;
    start: (usuario: Usuario) => Promise<Usuario | void>;
    disconnect: (usuario: Usuario) => Promise<void>;
    getSessionPaths: (usuarioId: number) => string[];
};

const root = process.cwd();

const providers: Record<WhatsAppProvider, BotProviderAdapter> = {
    BAILEYS: {
        provider: WhatsAppProvider.BAILEYS,
        start: startBaileys,
        disconnect: disconnectBaileys,
        getSessionPaths: (usuarioId) => [
            path.join(root, "src", "bots", "baileys", "sessions", `bot-baileys-${usuarioId}`)
        ]
    },
    WEBJS: {
        provider: WhatsAppProvider.WEBJS,
        start: startWhatsappWeb,
        disconnect: disconnectWhatsappWeb,
        getSessionPaths: (usuarioId) => [
            path.join(root, "src", "bots", "whatsapp_web", "sessions", `session-bot-whatsapp-web-${usuarioId}`)
        ]
    }
};

const normalizeProviderInput = (provider?: string | WhatsAppProvider | null) =>
    typeof provider === "string" ? provider.trim().toUpperCase() : provider;

const isSupportedProvider = (provider: unknown): provider is WhatsAppProvider =>
    provider === WhatsAppProvider.BAILEYS || provider === WhatsAppProvider.WEBJS;

function resolveProvider(provider?: string | WhatsAppProvider | null): WhatsAppProvider {
    const normalizedProvider = normalizeProviderInput(provider);

    if (normalizedProvider == null || normalizedProvider === "") {
        return env.WHATSAPP_PROVIDER;
    }

    if (isSupportedProvider(normalizedProvider)) {
        return normalizedProvider;
    }

    throw new Error(`Provider invalido: ${provider}`);
}

function getProviderAdapter(provider?: string | WhatsAppProvider | null) {
    const resolvedProvider = resolveProvider(provider);
    return providers[resolvedProvider];
}

const defaultProvider = env.WHATSAPP_PROVIDER;

export { defaultProvider, getProviderAdapter, providers, resolveProvider };
