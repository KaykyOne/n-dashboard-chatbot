import { z } from "zod";
import type { Message } from "./config.js";
import {
  aiCalculationCommandSchema,
  executeCalculation,
  getCalculatorProtocolPrompt
} from "./calculations.js";

const MAX_CALCULATION_ITERATIONS = 8;
const LOOP_LIMIT_FALLBACK =
  "Nao consegui concluir esse calculo com seguranca. Posso encaminhar para um atendente.";

type CompletionFunction = (messages: Message[]) => Promise<string | null>;

type CalculationLoopOptions = {
  complete: CompletionFunction;
  maxIterations?: number;
};

function formatValidationError(error: z.ZodError) {
  return error.issues.map((issue) => ({
    campo: issue.path.join("."),
    mensagem: issue.message
  }));
}

async function runCalculationAgent(
  messages: Message[],
  options: CalculationLoopOptions
) {
  const loopMessages: Message[] = [
    ...messages,
    {
      role: "system",
      content: getCalculatorProtocolPrompt()
    }
  ];

  const maxIterations = options.maxIterations ?? MAX_CALCULATION_ITERATIONS;

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const rawResponse = await options.complete(loopMessages);

    if (!rawResponse) {
      loopMessages.push({
        role: "system",
        content: JSON.stringify({
          erro_protocolo: "A resposta anterior veio vazia. Retorne um objeto JSON valido."
        })
      });
      continue;
    }

    loopMessages.push({
      role: "assistant",
      content: rawResponse
    });

    let decodedResponse: unknown;

    try {
      decodedResponse = JSON.parse(rawResponse);
    } catch {
      loopMessages.push({
        role: "system",
        content: JSON.stringify({
          erro_protocolo: "JSON invalido. Use somente um dos formatos permitidos."
        })
      });
      continue;
    }

    const parsedCommand = aiCalculationCommandSchema.safeParse(decodedResponse);

    if (!parsedCommand.success) {
      loopMessages.push({
        role: "system",
        content: JSON.stringify({
          erro_protocolo: "Objeto fora do contrato.",
          detalhes: formatValidationError(parsedCommand.error)
        })
      });
      continue;
    }

    if ("resposta" in parsedCommand.data) {
      return parsedCommand.data.resposta;
    }

    try {
      const result = executeCalculation(
        parsedCommand.data.operacao,
        parsedCommand.data.argumentos
      );

      loopMessages.push({
        role: "system",
        content: JSON.stringify({
          retorno_funcao: {
            operacao: parsedCommand.data.operacao,
            argumentos: parsedCommand.data.argumentos,
            resultado: result
          }
        })
      });
    } catch (error) {
      loopMessages.push({
        role: "system",
        content: JSON.stringify({
          erro_funcao: {
            operacao: parsedCommand.data.operacao,
            mensagem: error instanceof Error
              ? error.message
              : "Nao foi possivel executar a operacao."
          }
        })
      });
    }
  }

  return LOOP_LIMIT_FALLBACK;
}

export {
  MAX_CALCULATION_ITERATIONS,
  runCalculationAgent,
  type CompletionFunction
};
