import assert from "node:assert/strict";
import test from "node:test";
import {
  executeCalculation,
  getCalculatorProtocolPrompt
} from "./calculations.js";
import {
  MAX_CALCULATION_ITERATIONS,
  runCalculationAgent
} from "./ai-calculator-agent.js";
import type { Message } from "./config.js";

const initialMessages: Message[] = [
  { role: "user", content: "Quanto fica 1000 com 15% de desconto em 5 parcelas?" }
];

test("executa calculos financeiros e rejeita divisao por zero", () => {
  assert.deepEqual(
    executeCalculation("desconto", {
      valorOriginal: 1000,
      percentual: 15
    }),
    {
      valorOriginal: 1000,
      percentual: 15,
      valorDesconto: 150,
      valorFinal: 850
    }
  );

  assert.deepEqual(
    executeCalculation("comissao", {
      valorBase: 2500,
      percentual: 8
    }),
    {
      valorBase: 2500,
      percentual: 8,
      valorComissao: 200,
      valorLiquido: 2300
    }
  );

  assert.deepEqual(
    executeCalculation("juros_simples", {
      capital: 1000,
      taxaPercentual: 2,
      periodos: 6
    }),
    {
      capital: 1000,
      juros: 120,
      montante: 1120
    }
  );

  assert.throws(
    () => executeCalculation("divisao", { dividendo: 10, divisor: 0 }),
    /Divisao por zero/
  );
});

test("encadeia funcoes ate receber o campo resposta", async () => {
  let completionCalls = 0;

  const finalResponse = await runCalculationAgent(initialMessages, {
    complete: async (messages) => {
      completionCalls += 1;

      if (completionCalls === 1) {
        assert.ok(
          messages.some((message) => message.content.includes("PROTOCOLO OBRIGATORIO"))
        );
        return JSON.stringify({
          acao: "calcular",
          operacao: "desconto",
          argumentos: { valorOriginal: 1000, percentual: 15 }
        });
      }

      if (completionCalls === 2) {
        assert.ok(
          messages.some((message) => message.content.includes('"valorFinal":850'))
        );
        return JSON.stringify({
          acao: "calcular",
          operacao: "parcelamento",
          argumentos: { valorTotal: 850, parcelas: 5 }
        });
      }

      assert.ok(
        messages.some((message) => message.content.includes('"valorParcela":170'))
      );
      return JSON.stringify({
        resposta: "Com 15% de desconto, fica R$ 850,00 ou 5 parcelas de R$ 170,00."
      });
    }
  });

  assert.equal(completionCalls, 3);
  assert.match(finalResponse, /R\$ 850,00/);
});

test("resposta sem calculo usa apenas uma chamada", async () => {
  let completionCalls = 0;

  const response = await runCalculationAgent(initialMessages, {
    complete: async () => {
      completionCalls += 1;
      return JSON.stringify({ resposta: "Posso ajudar com os valores." });
    }
  });

  assert.equal(completionCalls, 1);
  assert.equal(response, "Posso ajudar com os valores.");
});

test("recupera JSON invalido e respeita o limite de seguranca", async () => {
  let invalidJsonCalls = 0;

  const recoveredResponse = await runCalculationAgent(initialMessages, {
    complete: async (messages) => {
      invalidJsonCalls += 1;

      if (invalidJsonCalls === 1) {
        return "nao e json";
      }

      assert.ok(
        messages.some((message) => message.content.includes("erro_protocolo"))
      );
      return JSON.stringify({ resposta: "Formato corrigido." });
    }
  });

  assert.equal(invalidJsonCalls, 2);
  assert.equal(recoveredResponse, "Formato corrigido.");

  let limitedCalls = 0;
  const limitedResponse = await runCalculationAgent(initialMessages, {
    maxIterations: 2,
    complete: async () => {
      limitedCalls += 1;
      return JSON.stringify({
        acao: "calcular",
        operacao: "soma",
        argumentos: { valores: [1, 1] }
      });
    }
  });

  assert.equal(limitedCalls, 2);
  assert.match(limitedResponse, /seguranca/);
  assert.equal(MAX_CALCULATION_ITERATIONS, 8);
  assert.match(getCalculatorProtocolPrompt(), /"funcoes"/);
});
