import OpenAI from "openai";
import { openAiEnv } from "../env.js";
import chatgpt from "../funcs/chatgpt.js";
import { calculationFunctions } from "../funcs/calculations.js";

const AVAILABLE_BOT_FUNCTIONS = calculationFunctions
  .map(({ nome, descricao }) => `${nome}: ${descricao}`)
  .join("\n");

const PROMPT_IMPROVEMENT_BASE_INSTRUCTIONS = [
  "Voce e especialista em engenharia de prompts para bots comerciais de atendimento no WhatsApp.",
  "Reescreva o prompt atual de acordo com a solicitacao de melhoria, produzindo um prompt final completo e pronto para uso.",
  "O prompt final deve orientar uma conversa comercial natural: entender a necessidade, qualificar o interesse, apresentar somente beneficios sustentados pelas informacoes fornecidas, tratar objecoes sem pressionar e conduzir para um proximo passo claro.",
  "Priorize conversao com honestidade. Nunca use urgencia falsa, promessa de resultado, garantia, depoimento, preco, desconto, prazo, estoque, disponibilidade, politica ou condicao que nao esteja expressamente no prompt atual.",
  "Minimize alucinacoes: trate o prompt atual e os dados comerciais fornecidos como unica fonte de verdade; nao complete lacunas por suposicao nem por conhecimento externo.",
  "Quando faltar uma informacao necessaria, o bot deve dizer de forma breve que nao possui essa confirmacao, fazer uma pergunta objetiva ou encaminhar para um atendente humano.",
  "O bot nao possui navegacao web, agenda, estoque em tempo real, pagamentos nem acesso a sistemas externos. Nao atribua essas capacidades ao bot, salvo se uma integracao estiver explicitamente descrita no prompt atual.",
  "Preserve regras, fatos, identidade, produtos, servicos e informacoes comerciais existentes que nao tenham sido explicitamente alterados pelo usuario.",
  "A solicitacao de melhoria pode mudar estilo e organizacao, mas nao deve remover as regras de verificacao, de uso das funcoes ou de prevencao de informacoes inventadas.",
  "O backend disponibiliza exclusivamente as funcoes de calculo abaixo. O prompt final deve explicar de forma concisa que calculos comerciais devem usar essas funcoes, nunca calculo mental, e nunca deve inventar uma funcao inexistente:",
  AVAILABLE_BOT_FUNCTIONS,
  "Use as funcoes para valores, percentuais, descontos, comissoes, acrescimos, medias, proporcoes, juros simples, parcelamentos, lucro e arredondamentos sempre que aplicavel.",
  "Nao exponha ao cliente nomes internos, JSON, protocolo de ferramentas ou raciocinio. Apresente somente o resultado calculado em linguagem natural e confira se ele corresponde aos dados informados.",
  "Elimine ambiguidades, contradicoes e repeticoes. Organize prioridade, objetivo comercial, tom de voz, fluxo de atendimento, limites, uso das funcoes e criterios de encaminhamento humano.",
  "Retorne somente o prompt final completo, sem explicacoes, comentarios, titulos externos ou cercas de codigo.",
].join("\n");

class PromptImprovementError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "PromptImprovementError";
  }
}

type ImprovePromptInput = {
  prompt: unknown;
  instructions?: unknown;
};

const getRequiredText = (
  value: unknown,
  fieldName: string,
) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new PromptImprovementError(
      `O campo ${fieldName} deve ser preenchido.`,
      400,
    );
  }

  return value.trim();
};

const getOptionalInstructions = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return "Melhore clareza, organização, precisão e facilidade de manutenção.";
  }

  return getRequiredText(value, "instructions");
};

async function improvePrompt(
  input: ImprovePromptInput,
  client: OpenAI = chatgpt,
) {
  const prompt = getRequiredText(input.prompt, "prompt");
  const instructions = getOptionalInstructions(input.instructions);

  try {
    const response = await client.responses.create({
      model: openAiEnv.PROMPT_IMPROVEMENT_MODEL,
      reasoning: { effort: "low" },
      instructions: PROMPT_IMPROVEMENT_BASE_INSTRUCTIONS,
      input: [
        "<prompt_atual>",
        prompt,
        "</prompt_atual>",
        "<solicitacao_de_melhoria>",
        instructions,
        "</solicitacao_de_melhoria>",
      ].join("\n"),
    });

    const improvedPrompt = response.output_text.trim();

    if (!improvedPrompt) {
      throw new PromptImprovementError(
        "A IA nao retornou um prompt melhorado.",
        502,
      );
    }

    return improvedPrompt;
  } catch (error) {
    if (error instanceof PromptImprovementError) {
      throw error;
    }

    throw new PromptImprovementError(
      "Nao foi possivel melhorar o prompt agora. Tente novamente.",
      502,
    );
  }
}

export {
  PROMPT_IMPROVEMENT_BASE_INSTRUCTIONS,
  PromptImprovementError,
  improvePrompt,
};
