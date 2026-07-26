import { Request, Response } from "express";
import type { WhatsAppProvider } from "../../generated/prisma/enums.js";
import { disconnectBot, startBot } from "../services/bot.service.js";
import { resolveProvider } from "../bots/providers.js";
import { createLogger } from "../logger.js";

const logger = createLogger({ module: "bot-controller" });

const getProviderFromQuery = (req: Request) => {
    const provider = req.query.provider;
    return typeof provider === "string" ? resolveProvider(provider) : undefined;
};

const getResetSessionFromQuery = (req: Request) => req.query.resetSession === "true";

async function disconnect(req: Request, res: Response) {
    const id = req.params.id;

    if (!id) {
        res.status(400).send({ message: "Id nao encontrado!" });
        return;
    }

    try {
        const resetSession = getResetSessionFromQuery(req);

        logger.info({ usuarioId: Number(id), resetSession }, "Requisicao de desconexao recebida");
        await disconnectBot(Number(id), { resetSession });
        res.status(200).send({ message: "Usuario desconectado com sucesso!" });
    } catch (err) {
        logger.error({ usuarioId: Number(id), err }, "Erro ao desconectar usuario");
        res.status(500).send({ message: "Erro ao desconectar usuario!" });
    }
}

async function start(req: Request, res: Response) {
    const id = req.params.id;

    if (!id) {
        res.status(400).send({ message: "Id nao encontrado!" });
        return;
    }

    try {
        let provider: WhatsAppProvider | undefined;

        try {
            provider = getProviderFromQuery(req);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Provider invalido";
            res.status(400).send({ message });
            return;
        }

        logger.info({ usuarioId: Number(id), provider }, "Requisicao de inicializacao recebida");
        await startBot(Number(id), provider);
        res.status(200).send({ message: "Usuario iniciado com sucesso!" });
    } catch (err) {
        logger.error({ usuarioId: Number(id), err }, "Erro ao iniciar usuario");
        res.status(500).send({ message: "Erro ao iniciar usuario!" });
    }
}

export { disconnect, start };
