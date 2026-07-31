import { Router } from "express";
import { improveBotPrompt } from "../controllers/prompt-improvement.controller.js";

const router = Router();

router.post("/improve-prompt/:id", improveBotPrompt);

export { router as promptImprovementRouter };
