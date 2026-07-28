import { Request, Response } from "express";
import { disconnectBot, startBot } from "../services/bot.service.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger({ module: "bot-controller" });

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
};

async function start(req: Request, res: Response) {
    const id = req.params.id;

    if (!id) {
        res.status(400).send({ message: "Id nao encontrado!" });
        return;
    }

    try {
        logger.info({ usuarioId: Number(id), provider: "BAILEYS" }, "Requisicao de inicializacao recebida");
        await startBot(Number(id));
        res.status(200).send({ message: "Usuario iniciado com sucesso!" });
    } catch (err) {
        logger.error({ usuarioId: Number(id), err }, "Erro ao iniciar usuario");
        res.status(500).send({ message: "Erro ao iniciar usuario!" });
    }
};

async function getQrCode(req: Request, res: Response) {
    const id = req.params.id;

    if (!id) {
        res.status(400).send({ message: "Id nao encontrado!" });
        return;
    }

    try {
        logger.info({ usuarioId: Number(id) }, "Requisicao de QR Code recebida");
        // Aqui você pode adicionar a lógica para obter o QR Code
        res.status(200).send({ message: "QR Code obtido com sucesso!" });
    } catch (err) {
        logger.error({ usuarioId: Number(id), err }, "Erro ao obter QR Code");
        res.status(500).send({ message: "Erro ao obter QR Code!" });
    }
};

export { disconnect, start, getQrCode };
