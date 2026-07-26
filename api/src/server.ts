import express from "express";
import { serverEnv } from "./env";
import { serverRouter } from "./routes";
import { createLogger } from "./logger";

const app = express();
const logger = createLogger({ module: "server" });
const PORT = serverEnv.PORT;

process.on("unhandledRejection", (reason) => {
    logger.error({ reason }, "Unhandled promise rejection");
});

process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "Uncaught exception");
});

app.get("/ping", (_req, res) => {
    res.send("pong");
});

app.use(serverRouter);

app.listen(PORT, "0.0.0.0", () => {
    logger.info({ host: "0.0.0.0", port: PORT }, "Servidor HTTP iniciado");
});
