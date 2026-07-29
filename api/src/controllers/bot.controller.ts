import { Request, Response } from "express";
import {
    disconnectBot,
    getBotConnectionState,
    requestBotPairingCode,
    startBot
} from "../services/bot.service.js";
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
        res.status(200).send(getBotConnectionState(Number(id)));
    } catch (err) {
        logger.error({ usuarioId: Number(id), err }, "Erro ao obter QR Code");
        res.status(500).send({ message: "Erro ao obter QR Code!" });
    }
};

async function pairingCode(req: Request, res: Response) {
    const id = Number(req.params.id);
    const phoneNumber = String(req.body?.phoneNumber ?? "");

    if (!Number.isInteger(id) || id <= 0) {
        res.status(400).send({ message: "Id de usuario invalido!" });
        return;
    }

    if (!phoneNumber.trim()) {
        res.status(400).send({ message: "Informe o numero com DDI para gerar o codigo." });
        return;
    }

    try {
        const code = await requestBotPairingCode(id, phoneNumber);
        res.status(200).send({
            pairingCode: code,
            message: "Codigo de pareamento gerado com sucesso!"
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao gerar codigo de pareamento!";
        const status = message.includes("ja esta conectado") ? 409 : 400;

        logger.error({ usuarioId: id, err }, "Erro ao gerar codigo de pareamento");
        res.status(status).send({ message });
    }
}

export { disconnect, start, getQrCode, pairingCode };
