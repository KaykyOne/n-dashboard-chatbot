import {
    disconnectBot as disconnectBaileysBot,
    startBot as startBaileysBot
} from "../bots/index.js";
import {
    getBaileysSessionPath,
    removeBaileysSessionDirectory
} from "../funcs/baileys-session.js";
import useMensagem from "../funcs/useMensagem.js";
import type { Usuario } from "../types/usuario.js";
import { createLogger } from "../utils/logger.js";
import prisma from "../../prisma/prisma.js";
import { botRuntimeManager } from "./bot-runtime-manager.js";

const logger = createLogger({ module: "bot-service" });
const defaultProvider = "BAILEYS" as const;

type BotConnectionState = {
    connected: boolean;
    initialized: boolean;
    provider: typeof defaultProvider;
    qrCode: string | null;
    status: Usuario["status"];
    lastError: string | null;
    source: "runtime" | "database" | "none";
    updatedAt: string | null;
};

type DisconnectBotOptions = { resetSession?: boolean };

async function removeProviderSessions(id: number) {
    const sessionPath = getBaileysSessionPath(id);
    const removed = removeBaileysSessionDirectory(id, sessionPath);

    if (removed) {
        logger.info({ usuarioId: id, provider: defaultProvider, sessionPath }, "Sessao do provider removida");
    }
}

async function disconnectRegisteredUser(user: Usuario, options?: DisconnectBotOptions) {
    logger.info({ usuarioId: user.id, provider: user.provider }, "Iniciando desconexao do usuario");
    await disconnectBaileysBot(user, { logout: options?.resetSession });

    if (options?.resetSession) await removeProviderSessions(user.id);

    botRuntimeManager.remove(user.id, user);
    logger.info({ usuarioId: user.id, provider: user.provider, runtimesRestantes: botRuntimeManager.list().length }, "Runtime do usuario encerrado");
}

async function disconnectBot(id: number, options?: DisconnectBotOptions) {
    return botRuntimeManager.runExclusive(id, async () => {
        const persistence = useMensagem();
        const user = botRuntimeManager.get(id);

        await persistence.atualizarRuntime(id, defaultProvider, {
            enabled: false,
            status: "OFFLINE",
            qrCode: null,
            sessionPath: options?.resetSession ? null : getBaileysSessionPath(id)
        }).catch((err) => logger.warn({ usuarioId: id, err }, "Nao foi possivel persistir o desligamento do runtime"));

        try {
            if (user) await disconnectRegisteredUser(user, options);
            else if (options?.resetSession) await removeProviderSessions(id);
        } catch (err) {
            logger.error({ usuarioId: id, err }, "Erro ao desconectar usuario no service");
            botRuntimeManager.remove(id, user);
            throw err;
        }
    });
}

async function initializeBot(id: number) {
    const user: Usuario = {
        id,
        qrCode: null,
        cliente: null,
        ativado: true,
        status: "CONNECTING",
        provider: defaultProvider
    };

    logger.info({ usuarioId: id, provider: defaultProvider }, "Iniciando runtime do usuario");
    botRuntimeManager.register(user);

    try {
        await useMensagem().atualizarRuntime(id, defaultProvider, {
            enabled: true,
            status: "CONNECTING",
            qrCode: null,
            sessionPath: getBaileysSessionPath(id)
        }).catch((err) => logger.warn({ usuarioId: id, err }, "Nao foi possivel persistir a inicializacao do runtime"));

        const result = await startBaileysBot(user);
        if (result) {
            botRuntimeManager.register(result);
        }
        logger.info({ usuarioId: id, provider: defaultProvider, totalRuntimes: botRuntimeManager.list().length }, "Runtime do usuario registrado");
        return result;
    } catch (err) {
        botRuntimeManager.remove(id, user);
        throw err;
    }
}

async function startBot(id: number) {
    return botRuntimeManager.runExclusive(id, async () => {
        const existing = botRuntimeManager.get(id);
        if (existing && (existing.cliente || existing.status !== "OFFLINE")) return existing;
        if (existing) botRuntimeManager.remove(id, existing);
        return initializeBot(id);
    });
}

async function getBotConnectionState(id: number): Promise<BotConnectionState> {
    const user = botRuntimeManager.get(id);
    if (user) {
        return {
            connected: user.status === "ONLINE",
            initialized: true,
            provider: user.provider,
            qrCode: user.status === "ONLINE" ? null : user.qrCode,
            status: user.status,
            lastError: null,
            source: "runtime",
            updatedAt: null
        };
    }

    // Runtime state exists only inside an API process. The database fallback
    // makes polling work with PM2 cluster mode, containers, or load balancers.
    const persisted = await prisma.whatsappInstances.findUnique({
        where: { cliente_id_provider: { cliente_id: id, provider: defaultProvider } },
        select: { enabled: true, status: true, qr_code: true, last_error: true, updated_at: true }
    });

    if (!persisted) {
        return { connected: false, initialized: false, provider: defaultProvider, qrCode: null, status: "OFFLINE", lastError: null, source: "none", updatedAt: null };
    }

    return {
        connected: persisted.status === "ONLINE",
        initialized: persisted.enabled,
        provider: defaultProvider,
        qrCode: persisted.status === "ONLINE" ? null : persisted.qr_code,
        status: persisted.status,
        lastError: persisted.last_error,
        source: "database",
        updatedAt: persisted.updated_at.toISOString()
    };
}

function getBotRuntimes() {
    return botRuntimeManager.list();
}

async function requestBotPairingCode(id: number, phoneNumber: string) {
    const sanitizedPhoneNumber = phoneNumber.replace(/\D/g, "");
    if (sanitizedPhoneNumber.length < 8 || sanitizedPhoneNumber.length > 15) {
        throw new Error("Numero invalido. Informe DDI e telefone usando somente digitos.");
    }

    const user = await startBot(id);
    if (!user || !user.cliente) throw new Error("Socket do WhatsApp ainda nao esta disponivel.");
    if (user.status === "ONLINE" || user.cliente.authState.creds.registered) {
        throw new Error("O WhatsApp deste usuario ja esta conectado.");
    }

    user.status = "CONNECTING";
    return user.cliente.requestPairingCode(sanitizedPhoneNumber);
}

export { disconnectBot, getBotConnectionState, getBotRuntimes, requestBotPairingCode, startBot };
