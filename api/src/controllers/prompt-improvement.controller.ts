import type { Request, Response } from "express";
import {
  PromptImprovementError,
  improvePrompt,
} from "../services/prompt-improvement.service.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger({ module: "prompt-improvement-controller" });

const getPositiveInteger = (value: unknown) => {
  if (Array.isArray(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

async function improveBotPrompt(req: Request, res: Response) {
  const usuarioId = getPositiveInteger(req.params.id);

  if (!usuarioId) {
    res.status(400).send({ message: "Id de usuario invalido." });
    return;
  }

  try {
    const improvedPrompt = await improvePrompt({
      prompt: req.body?.prompt,
      instructions: req.body?.instructions,
    });

    res.status(200).send({ improvedPrompt });
  } catch (error) {
    if (error instanceof PromptImprovementError) {
      logger.warn(
        { usuarioId, statusCode: error.statusCode },
        "Falha ao melhorar prompt",
      );
      res.status(error.statusCode).send({ message: error.message });
      return;
    }

    logger.error({ usuarioId, error }, "Erro inesperado ao melhorar prompt");
    res.status(500).send({ message: "Erro inesperado ao melhorar o prompt." });
  }
}

export { improveBotPrompt };
