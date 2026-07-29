//* Libraries Imports
import express from "express";
import cors from "cors";

//* Routers Imports
import { botRouter } from "./bot.route.js";

const serverRouter = express.Router();

serverRouter.use(cors({
    origin: "*"
}));
serverRouter.use(express.json());

serverRouter.use("/bot", botRouter);

serverRouter.get("/status", (_, res) => {
    res.send("BotChat Dashboard API is running");
});

export default serverRouter;
