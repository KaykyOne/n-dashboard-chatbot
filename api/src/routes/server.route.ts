import express from "express";
import cors from "cors";
import type { WhatsAppProvider } from "../../generated/prisma/enums.js";
import { disconnect, start } from "../controllers/bot.controller.js";
import { organizerUsuarios } from "../funcs/useBot.js";
import startBot from "../bots/bot.js";
import { resolveProvider } from "../bots/providers.js";
import { createLogger } from "../logger.js";

const serverRouter = express.Router();
const logger = createLogger({ module: "server-routes" });

serverRouter.route("/disconnect/:id").get(disconnect);
serverRouter.route("/start/:id").get(start);

serverRouter.use(cors({
    origin: "*"
}));

serverRouter.get("/", (_req, res) => {
    res.send("BotChat Dashboard API");
});

serverRouter.get("/status", (_req, res) => {
    res.send("BotChat Dashboard API is running");
});

serverRouter.get("/start-bot", (req, res) => {
    let provider: WhatsAppProvider | undefined;

    try {
        provider = typeof req.query.provider === "string"
            ? resolveProvider(req.query.provider)
            : undefined;
    } catch (err) {
        const message = err instanceof Error ? err.message : "Provider invalido";
        res.status(400).send({ message });
        return;
    }

    logger.info({ provider }, "Iniciando rotina global dos bots");
    startBot(provider);
    organizerUsuarios();
    res.send("Bot started");
});

export default serverRouter;
