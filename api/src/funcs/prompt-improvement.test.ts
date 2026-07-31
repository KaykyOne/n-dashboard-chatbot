import assert from "node:assert/strict";
import test from "node:test";
import type OpenAI from "openai";
import {
  PROMPT_IMPROVEMENT_BASE_INSTRUCTIONS,
  PromptImprovementError,
  improvePrompt,
} from "../services/prompt-improvement.service.js";
import { calculationFunctions } from "./calculations.js";

test("prompt fixo descreve todas as funcoes e limita alucinacoes", () => {
  for (const { nome } of calculationFunctions) {
    assert.match(PROMPT_IMPROVEMENT_BASE_INSTRUCTIONS, new RegExp(`\\b${nome}\\b`));
  }

  assert.match(PROMPT_IMPROVEMENT_BASE_INSTRUCTIONS, /conversao com honestidade/i);
  assert.match(PROMPT_IMPROVEMENT_BASE_INSTRUCTIONS, /unica fonte de verdade/i);
  assert.match(PROMPT_IMPROVEMENT_BASE_INSTRUCTIONS, /nunca calculo mental/i);
  assert.match(PROMPT_IMPROVEMENT_BASE_INSTRUCTIONS, /atendente humano/i);
});

test("retorna o prompt melhorado produzido pela Responses API", async () => {
  let receivedRequest: Record<string, unknown> | undefined;
  const client = {
    responses: {
      create: async (request: Record<string, unknown>) => {
        receivedRequest = request;
        return { output_text: "  Prompt melhorado para atendimento.  " };
      },
    },
  } as unknown as OpenAI;

  const result = await improvePrompt(
    {
      prompt: "Prompt atual",
      instructions: "Deixe mais objetivo",
    },
    client,
  );

  assert.equal(result, "Prompt melhorado para atendimento.");
  assert.equal(receivedRequest?.model, "gpt-5.5");
  assert.equal(
    receivedRequest?.instructions,
    PROMPT_IMPROVEMENT_BASE_INSTRUCTIONS,
  );
  assert.match(String(receivedRequest?.input), /Deixe mais objetivo/);
});

test("rejeita prompt vazio antes de chamar a IA", async () => {
  let called = false;
  const client = {
    responses: {
      create: async () => {
        called = true;
        return { output_text: "Nao deveria ser chamado" };
      },
    },
  } as unknown as OpenAI;

  await assert.rejects(
    () => improvePrompt({ prompt: "   " }, client),
    (error: unknown) =>
      error instanceof PromptImprovementError && error.statusCode === 400,
  );
  assert.equal(called, false);
});

test("aceita prompt e instrucao longos sem limite explicito de caracteres", async () => {
  const longPrompt = "Contexto comercial detalhado. ".repeat(1_500);
  const longInstructions = "Aprimore esta regra mantendo todos os dados. ".repeat(1_000);
  let receivedInput = "";
  const client = {
    responses: {
      create: async (request: Record<string, unknown>) => {
        receivedInput = String(request.input);
        return { output_text: "Prompt longo melhorado." };
      },
    },
  } as unknown as OpenAI;

  const result = await improvePrompt(
    { prompt: longPrompt, instructions: longInstructions },
    client,
  );

  assert.equal(result, "Prompt longo melhorado.");
  assert.match(receivedInput, /Contexto comercial detalhado/);
  assert.match(receivedInput, /Aprimore esta regra/);
});

test("transforma falha da OpenAI em erro de gateway sem vazar detalhes", async () => {
  const client = {
    responses: {
      create: async () => {
        throw new Error("segredo interno do provedor");
      },
    },
  } as unknown as OpenAI;

  await assert.rejects(
    () => improvePrompt({ prompt: "Prompt atual" }, client),
    (error: unknown) =>
      error instanceof PromptImprovementError
      && error.statusCode === 502
      && !error.message.includes("segredo"),
  );
});
