import { defaultProvider, getProviderAdapter } from "../bots/providers.js";
import { removeBaileysSessionDirectory } from "../funcs/baileys-session.js";
import useMensagem from "../funcs/useMensagem.js";
import type { Usuario } from "../types/usuario.js";
import { createLogger } from "../utils/logger.js";
import { botRuntimeManager } from "./bot-runtime-manager.js";

const logger = createLogger({ module: "bot-service" });

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
    }

    botRuntimeManager.remove(user.id, user);
    logger.info(
        {
            usuarioId: user.id,
            provider: user.provider,
            runtimesRestantes: botRuntimeManager.list().length
        },
        "Runtime do usuario encerrado"
    );
}

async function disconnectBot(id: number, options?: DisconnectBotOptions) {
    return botRuntimeManager.runExclusive(id, async () => {
        const adapter = getProviderAdapter();
        const persistence = useMensagem();
        const user = botRuntimeManager.get(id);

        await persistence
            .atualizarRuntime(id, adapter.provider, {
                enabled: false,
                status: "OFFLINE",
                qrCode: null,
                sessionPath: options?.resetSession
                    ? null
                    : adapter.getSessionPaths(id)[0]
            })
            .catch((err) => {
                logger.warn(
                    { usuarioId: id, err },
                    "Nao foi possivel persistir o desligamento do runtime"
                );
            });

        try {
            if (user) {
                await disconnectRegisteredUser(user, options);
            } else {
                logger.info(
                    { usuarioId: id },
                    "Runtime ja estava desligado"
                );

                if (options?.resetSession) {
                    await removeProviderSessions(id);
                }
            }
        } catch (err) {
            logger.error({ usuarioId: id, err }, "Erro ao desconectar usuario no service");
            botRuntimeManager.remove(id, user);
            throw err;
        }
    });
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

    logger.info({ usuarioId: id, provider }, "Iniciando runtime do usuario");
    botRuntimeManager.register(user);

    try {
        await useMensagem()
            .atualizarRuntime(id, provider, {
                enabled: true,
                status: "CONNECTING",
                qrCode: null,
                sessionPath: adapter.getSessionPaths(id)[0]
            })
            .catch((err) => {
                logger.warn(
                    { usuarioId: id, err },
                    "Nao foi possivel persistir a inicializacao do runtime"
                );
            });

        const res: Usuario | void = await adapter.start(user);

        if (res != null) {
            botRuntimeManager.register(res);
        }

        logger.info(
            {
                usuarioId: id,
                provider,
                totalRuntimes: botRuntimeManager.list().length,
                providerPadrao: defaultProvider
            },
            "Runtime do usuario registrado"
        );

        return res;
    } catch (err) {
        botRuntimeManager.remove(id, user);
        throw err;
    }
}

async function startBot(id: number) {
    return botRuntimeManager.runExclusive(id, async () => {
        const existente = botRuntimeManager.get(id);

        if (existente && (existente.cliente || existente.status !== "OFFLINE")) {
            logger.debug(
                { usuarioId: id, provider: existente.provider },
                "Usuario ja possui runtime registrado"
            );
            return existente;
        }

        if (existente) {
            botRuntimeManager.remove(id, existente);
        }

        return initializeBot(id);
    });
}

function getBotConnectionState(id: number): BotConnectionState {
    const user = botRuntimeManager.get(id);

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

function getBotRuntimes() {
    return botRuntimeManager.list();
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
    getBotRuntimes,
    requestBotPairingCode,
    startBot
};
