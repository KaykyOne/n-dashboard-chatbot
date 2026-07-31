//* Libraries Imports
import express from "express";
import cors from "cors";

//* Routers Imports
import { botRouter } from "./bot.route.js";
import { promptImprovementRouter } from "./prompt-improvement.route.js";
import { testModeRouter } from "./test-mode.route.js";
import { serverEnv } from "../env.js";

const serverRouter = express.Router();

serverRouter.use(cors({
    origin: serverEnv.CORS_ORIGIN
}));
serverRouter.use(express.json());

serverRouter.use("/bot", testModeRouter);
serverRouter.use("/bot", promptImprovementRouter);
serverRouter.use("/bot", botRouter);

serverRouter.get("/status", (_, res) => {
    res.send("BotChat Dashboard API is running");
});

export default serverRouter;
