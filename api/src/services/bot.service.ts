import { defaultProvider, getProviderAdapter } from "../bots/providers.js";
import { removeBaileysSessionDirectory } from "../funcs/baileys-session.js";
import useMensagem from "../funcs/useMensagem.js";
import type { Usuario } from "../types/usuario.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger({ module: "bot-service" });

let usuarios: Usuario[] = [];
const inicializacoes = new Map<number, Promise<Usuario | void>>();

type BotConnectionState = {
    connected: boolean;
    initialized: boolean;
    provider: typeof defaultProvider;
    qrCode: string | null;
    status: Usuario["status"];
};

type DisconnectBotOptions = {
    resetSession?: boolean;
};

async function removeProviderSessions(id: number) {
    const adapter = getProviderAdapter();

    for (const sessionPath of adapter.getSessionPaths(id)) {
        const removed = removeBaileysSessionDirectory(id, sessionPath);

        if (removed) {
            logger.info(
                { usuarioId: id, provider: defaultProvider, sessionPath },
                "Sessao do provider removida"
            );
        }
    }
}

async function disconnectRegisteredUser(user: Usuario, options?: DisconnectBotOptions) {
    const adapter = getProviderAdapter();

    logger.info({ usuarioId: user.id, provider: user.provider }, "Iniciando desconexao do usuario");
    await adapter.disconnect(user, { logout: options?.resetSession });

    if (options?.resetSession) {
        await removeProviderSessions(user.id);
        await useMensagem().desativarBotPermanentemente(
            user.id,
            user.provider
        );
    }

    usuarios = usuarios.filter((usuario) => usuario.id !== user.id);
    logger.info(
        { usuarioId: user.id, provider: user.provider, ativosRestantes: usuarios.length },
        "Usuario removido da lista de ativos"
    );
}

async function disconnectBot(id: number, options?: DisconnectBotOptions) {
    try {
        const user = usuarios.find((e) => e.id === id);

        if (!user) {
            logger.warn({ usuarioId: id }, "Usuario nao encontrado para desconexao");
            return;
        }

        await disconnectRegisteredUser(user, options);
    } catch (err) {
        logger.error({ usuarioId: id, err }, "Erro ao desconectar usuario no service");
        usuarios = usuarios.filter((e) => e.id !== id);
    }
}

async function initializeBot(id: number) {
    const adapter = getProviderAdapter();
    const provider = adapter.provider;

    const user: Usuario = {
        id,
        qrCode: null,
        cliente: null,
        ativado: true,
        status: "CONNECTING",
        provider
    };

    logger.info({ usuarioId: id, provider }, "Iniciando usuario via service");
    const res: Usuario | void = await adapter.start(user);

    if (res != null) {
        usuarios.push(res);
        logger.info(
            { usuarioId: id, provider, totalRegistrados: usuarios.length, providerPadrao: defaultProvider },
            "Usuario adicionado a lista de ativos"
        );
    }

    return res;
}

async function startBot(id: number) {
    const existente = usuarios.find((usuario) => usuario.id === id);

    if (existente && (existente.cliente || existente.status !== "OFFLINE")) {
        logger.debug({ usuarioId: id, provider: existente.provider }, "Usuario ja possui cliente registrado");
        return existente;
    }

    if (existente) {
        usuarios = usuarios.filter((usuario) => usuario.id !== id);
    }

    const inicializacaoPendente = inicializacoes.get(id);
    if (inicializacaoPendente) {
        return inicializacaoPendente;
    }

    const inicializacao = initializeBot(id);
    inicializacoes.set(id, inicializacao);

    try {
        return await inicializacao;
    } finally {
        inicializacoes.delete(id);
    }
}

function getBotConnectionState(id: number): BotConnectionState {
    const user = usuarios.find((usuario) => usuario.id === id);

    if (!user) {
        return {
            connected: false,
            initialized: false,
            provider: defaultProvider,
            qrCode: null,
            status: "OFFLINE"
        };
    }

    return {
        connected: user.status === "ONLINE",
        initialized: true,
        provider: user.provider,
        qrCode: user.status === "ONLINE" ? null : user.qrCode,
        status: user.status
    };
}

async function requestBotPairingCode(id: number, phoneNumber: string) {
    const sanitizedPhoneNumber = phoneNumber.replace(/\D/g, "");

    if (sanitizedPhoneNumber.length < 8 || sanitizedPhoneNumber.length > 15) {
        throw new Error("Numero invalido. Informe DDI e telefone usando somente digitos.");
    }

    const user = await startBot(id);

    if (!user?.cliente) {
        throw new Error("Socket do WhatsApp ainda nao esta disponivel.");
    }

    if (user.status === "ONLINE" || user.cliente.authState.creds.registered) {
        throw new Error("O WhatsApp deste usuario ja esta conectado.");
    }

    user.status = "CONNECTING";
    const pairingCode = await user.cliente.requestPairingCode(sanitizedPhoneNumber);

    logger.info(
        { usuarioId: id, provider: user.provider, phoneSuffix: sanitizedPhoneNumber.slice(-4) },
        "Codigo de pareamento solicitado"
    );

    return pairingCode;
}

export {
    disconnectBot,
    getBotConnectionState,
    requestBotPairingCode,
    startBot,
    usuarios
};
