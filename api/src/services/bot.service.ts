import fs from "fs";
import { defaultProvider, getProviderAdapter } from "../bots/providers.js";
import type { Usuario } from "../types/usuario.js";
import useMensagem from "../funcs/useMensagem.js";
import { createLogger } from "../utils/logger.js";

const { atualizarQrCode } = useMensagem();
const logger = createLogger({ module: "bot-service" });

let usuarios: Usuario[] = [];

type DisconnectBotOptions = {
    resetSession?: boolean;
};

async function removeProviderSessions(id: number) {
    const adapter = getProviderAdapter();

    for (const sessionPath of adapter.getSessionPaths(id)) {
        if (!fs.existsSync(sessionPath)) {
            continue;
        }

        fs.rmSync(sessionPath, { recursive: true, force: true });
        logger.info({ usuarioId: id, provider: defaultProvider, sessionPath }, "Sessao do provider removida");
    }
}

async function disconnectRegisteredUser(user: Usuario, options?: DisconnectBotOptions) {
    const adapter = getProviderAdapter();

    logger.info({ usuarioId: user.id, provider: user.provider }, "Iniciando desconexao do usuario");
    await adapter.disconnect(user);
    await atualizarQrCode("", user.id, user.provider);

    if (options?.resetSession) {
        await removeProviderSessions(user.id);
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

async function startBot(id: number) {
    const adapter = getProviderAdapter();
    const provider = adapter.provider;
    const existente = usuarios.find((usuario) => usuario.id === id);

    if (existente) {
        logger.warn({ usuarioId: id, provider }, "Usuario ja possui cliente Baileys registrado");
        return;
    }

    const user: Usuario = {
        id,
        qrCode: null,
        cliente: null,
        ativado: false,
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
}

export { disconnectBot, startBot, usuarios };
