import { z } from "zod";

const MAX_ABSOLUTE_NUMBER = 1_000_000_000_000_000;

const finiteNumber = z
  .number()
  .finite()
  .min(-MAX_ABSOLUTE_NUMBER)
  .max(MAX_ABSOLUTE_NUMBER);

const percentage = finiteNumber.min(0).max(100);
const nonNegativeRate = finiteNumber.min(0).max(100_000);
const numberList = z.array(finiteNumber).min(2).max(100);

const operationSchemas = {
  soma: z.object({
    valores: numberList
  }).strict(),
  subtracao: z.object({
    valor: finiteNumber,
    subtrair: finiteNumber
  }).strict(),
  multiplicacao: z.object({
    valores: numberList
  }).strict(),
  divisao: z.object({
    dividendo: finiteNumber,
    divisor: finiteNumber.refine((value) => value !== 0, {
      message: "Divisao por zero nao e permitida."
    })
  }).strict(),
  porcentagem: z.object({
    valor: finiteNumber,
    percentual: finiteNumber
  }).strict(),
  comissao: z.object({
    valorBase: finiteNumber,
    percentual: percentage
  }).strict(),
  desconto: z.object({
    valorOriginal: finiteNumber,
    percentual: percentage
  }).strict(),
  acrescimo: z.object({
    valorBase: finiteNumber,
    percentual: nonNegativeRate
  }).strict(),
  media: z.object({
    valores: z.array(finiteNumber).min(1).max(100)
  }).strict(),
  regra_de_tres: z.object({
    valorConhecido: finiteNumber,
    referenciaConhecida: finiteNumber.refine((value) => value !== 0, {
      message: "A referencia conhecida nao pode ser zero."
    }),
    novaReferencia: finiteNumber
  }).strict(),
  juros_simples: z.object({
    capital: finiteNumber,
    taxaPercentual: nonNegativeRate,
    periodos: nonNegativeRate
  }).strict(),
  parcelamento: z.object({
    valorTotal: finiteNumber,
    parcelas: z.number().int().positive().max(10_000)
  }).strict(),
  lucro: z.object({
    receita: finiteNumber,
    custo: finiteNumber
  }).strict(),
  arredondar: z.object({
    valor: finiteNumber,
    casasDecimais: z.number().int().min(0).max(10)
  }).strict()
};

type OperationName = keyof typeof operationSchemas;
type JsonCalculationResult = Record<string, number>;

const operationNames = Object.keys(operationSchemas) as [
  OperationName,
  ...OperationName[]
];

const calculationRequestSchema = z.object({
  acao: z.literal("calcular"),
  operacao: z.enum(operationNames),
  argumentos: z.record(z.unknown())
}).strict();

const finalAnswerSchema = z.object({
  resposta: z.string().trim().min(1)
}).strict();

const aiCalculationCommandSchema = z.union([
  calculationRequestSchema,
  finalAnswerSchema
]);

const calculationFunctions = [
  {
    nome: "soma",
    descricao: "Soma dois ou mais numeros.",
    argumentos: { valores: "number[] (minimo 2)" }
  },
  {
    nome: "subtracao",
    descricao: "Subtrai um numero de outro.",
    argumentos: { valor: "number", subtrair: "number" }
  },
  {
    nome: "multiplicacao",
    descricao: "Multiplica dois ou mais numeros.",
    argumentos: { valores: "number[] (minimo 2)" }
  },
  {
    nome: "divisao",
    descricao: "Divide o dividendo pelo divisor.",
    argumentos: { dividendo: "number", divisor: "number diferente de zero" }
  },
  {
    nome: "porcentagem",
    descricao: "Calcula quanto um percentual representa de um valor.",
    argumentos: { valor: "number", percentual: "number" }
  },
  {
    nome: "comissao",
    descricao: "Calcula comissao e valor liquido a partir de um valor base.",
    argumentos: { valorBase: "number", percentual: "number entre 0 e 100" }
  },
  {
    nome: "desconto",
    descricao: "Calcula o valor do desconto e o valor final.",
    argumentos: { valorOriginal: "number", percentual: "number entre 0 e 100" }
  },
  {
    nome: "acrescimo",
    descricao: "Calcula um acrescimo percentual e o valor final.",
    argumentos: { valorBase: "number", percentual: "number nao negativo" }
  },
  {
    nome: "media",
    descricao: "Calcula a media aritmetica de uma lista.",
    argumentos: { valores: "number[] (minimo 1)" }
  },
  {
    nome: "regra_de_tres",
    descricao: "Calcula uma proporcao direta.",
    argumentos: {
      valorConhecido: "number",
      referenciaConhecida: "number diferente de zero",
      novaReferencia: "number"
    }
  },
  {
    nome: "juros_simples",
    descricao: "Calcula juros simples e montante.",
    argumentos: {
      capital: "number",
      taxaPercentual: "number por periodo",
      periodos: "number"
    }
  },
  {
    nome: "parcelamento",
    descricao: "Divide um valor total igualmente entre parcelas sem juros.",
    argumentos: { valorTotal: "number", parcelas: "integer positivo" }
  },
  {
    nome: "lucro",
    descricao: "Calcula lucro e margem percentual sobre a receita.",
    argumentos: { receita: "number", custo: "number" }
  },
  {
    nome: "arredondar",
    descricao: "Arredonda um numero para a quantidade informada de casas decimais.",
    argumentos: { valor: "number", casasDecimais: "integer entre 0 e 10" }
  }
] as const;

const calculatorProtocol = {
  versao: 1,
  objetivo: "Executar calculos somente pelas funcoes fornecidas pelo backend.",
  formatosPermitidos: {
    solicitarCalculo: {
      acao: "calcular",
      operacao: "<nome de uma funcao do catalogo>",
      argumentos: "<objeto com os argumentos da funcao>"
    },
    finalizar: {
      resposta: "<texto final que sera enviado ao usuario>"
    }
  },
  regras: [
    "Responda sempre com um unico objeto JSON valido e sem markdown.",
    "Quando precisar calcular, solicite apenas uma operacao por resposta.",
    "Nunca calcule mentalmente algo que possa ser resolvido pelo catalogo.",
    "Depois de receber retorno_funcao, use o resultado e decida se precisa de outro calculo.",
    "Finalize somente com o campo resposta.",
    "O campo resposta deve conter apenas a mensagem natural pronta para WhatsApp."
  ],
  funcoes: calculationFunctions
};

function normalizeNumber(value: number, decimalPlaces = 10) {
  if (!Number.isFinite(value) || Math.abs(value) > MAX_ABSOLUTE_NUMBER) {
    throw new Error("O resultado esta fora do intervalo numerico permitido.");
  }

  return Number(value.toFixed(decimalPlaces));
}

function executeCalculation(
  operation: OperationName,
  rawArguments: Record<string, unknown>
): JsonCalculationResult {
  switch (operation) {
    case "soma": {
      const { valores } = operationSchemas.soma.parse(rawArguments);
      return { resultado: normalizeNumber(valores.reduce((total, value) => total + value, 0)) };
    }
    case "subtracao": {
      const { valor, subtrair } = operationSchemas.subtracao.parse(rawArguments);
      return { resultado: normalizeNumber(valor - subtrair) };
    }
    case "multiplicacao": {
      const { valores } = operationSchemas.multiplicacao.parse(rawArguments);
      return { resultado: normalizeNumber(valores.reduce((total, value) => total * value, 1)) };
    }
    case "divisao": {
      const { dividendo, divisor } = operationSchemas.divisao.parse(rawArguments);
      return { resultado: normalizeNumber(dividendo / divisor) };
    }
    case "porcentagem": {
      const { valor, percentual } = operationSchemas.porcentagem.parse(rawArguments);
      return { resultado: normalizeNumber(valor * (percentual / 100)) };
    }
    case "comissao": {
      const { valorBase, percentual } = operationSchemas.comissao.parse(rawArguments);
      const valorComissao = normalizeNumber(valorBase * (percentual / 100));
      return {
        valorBase,
        percentual,
        valorComissao,
        valorLiquido: normalizeNumber(valorBase - valorComissao)
      };
    }
    case "desconto": {
      const { valorOriginal, percentual } = operationSchemas.desconto.parse(rawArguments);
      const valorDesconto = normalizeNumber(valorOriginal * (percentual / 100));
      return {
        valorOriginal,
        percentual,
        valorDesconto,
        valorFinal: normalizeNumber(valorOriginal - valorDesconto)
      };
    }
    case "acrescimo": {
      const { valorBase, percentual } = operationSchemas.acrescimo.parse(rawArguments);
      const valorAcrescimo = normalizeNumber(valorBase * (percentual / 100));
      return {
        valorBase,
        percentual,
        valorAcrescimo,
        valorFinal: normalizeNumber(valorBase + valorAcrescimo)
      };
    }
    case "media": {
      const { valores } = operationSchemas.media.parse(rawArguments);
      const total = valores.reduce((sum, value) => sum + value, 0);
      return { resultado: normalizeNumber(total / valores.length) };
    }
    case "regra_de_tres": {
      const data = operationSchemas.regra_de_tres.parse(rawArguments);
      return {
        resultado: normalizeNumber(
          (data.valorConhecido * data.novaReferencia) / data.referenciaConhecida
        )
      };
    }
    case "juros_simples": {
      const data = operationSchemas.juros_simples.parse(rawArguments);
      const juros = normalizeNumber(
        data.capital * (data.taxaPercentual / 100) * data.periodos
      );
      return {
        capital: data.capital,
        juros,
        montante: normalizeNumber(data.capital + juros)
      };
    }
    case "parcelamento": {
      const { valorTotal, parcelas } = operationSchemas.parcelamento.parse(rawArguments);
      return {
        valorTotal,
        parcelas,
        valorParcela: normalizeNumber(valorTotal / parcelas)
      };
    }
    case "lucro": {
      const { receita, custo } = operationSchemas.lucro.parse(rawArguments);
      const lucro = normalizeNumber(receita - custo);
      const margemPercentual = receita === 0
        ? 0
        : normalizeNumber((lucro / receita) * 100);

      return { receita, custo, lucro, margemPercentual };
    }
    case "arredondar": {
      const { valor, casasDecimais } = operationSchemas.arredondar.parse(rawArguments);
      return { resultado: normalizeNumber(valor, casasDecimais) };
    }
  }
}

function getCalculatorProtocolPrompt() {
  return [
    "PROTOCOLO OBRIGATORIO DE CALCULOS:",
    JSON.stringify(calculatorProtocol)
  ].join("\n");
}

export {
  aiCalculationCommandSchema,
  calculatorProtocol,
  calculationFunctions,
  executeCalculation,
  getCalculatorProtocolPrompt,
  type OperationName
};
