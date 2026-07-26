
import { Historico, Leads } from '../../generated/prisma/client.js';
import prisma from '../../prisma/prisma.js';
import useUsuario from './useUsuario.js';
import { configurePrompt, promptColombo, Message } from './config.js';
import chatgpt from './chatgpt.js';
import fs from 'fs';

const { getAtividade } = useUsuario();

async function organizerUsuarios() {
  const usuariosAtuais = await prisma.usuarios.findMany({
    where: { ativo: true, ia_ativa: false },
    select: { id: true }
  });

  const idsAtuais = usuariosAtuais.map(u => u.id);

  const res = await prisma.whatsappInstances.updateMany({
    where: { cliente_id: { in: idsAtuais } },
    data: { qr_code: "", status: "OFFLINE" }
  })

  console.log(`✅ ${res.count} usuários organizados para reconexão!`);
  return;
};

export default function useBot() {

  async function getPrompt(usuario_id: number) {
    const data = await prisma.usuarios.findFirst({
      where: { id: usuario_id },
      select: { prompt: true }
    });

    return data ? data.prompt : "responda educadamente epenas, sorria e acene"
  };

  async function criarLead(usuario_id: number, numero: string) {

    const lead = await prisma.leads.findFirst({
      where: { numero: numero, cliente_id: usuario_id },
      select: { id: true }
    });
    if (!lead) {
      await prisma.leads.create({
        data: {
          cliente_id: usuario_id,
          numero: numero,
          ia_ativa: true
        }
      });
    }

    return;
  };

  async function getLead(numero: string, usuario_id: number) {

    const numeroFormatado = limparNumero(numero)

    const res = await prisma.leads.findFirst({
      where: {
        cliente_id: usuario_id,
        numero: numeroFormatado
      }
    })

    return res;
  }

  async function getHistorico(usuario_id: number, numero: string, mensagem: string) {

    let his: Message[] = [];
    his.push({ role: 'user', content: mensagem });

    const lead = await prisma.leads.findFirst({
      where: { numero: numero, cliente_id: usuario_id },
      select: { id: true }
    })

    if (!lead) {
      await criarLead(usuario_id, numero);
      return his;
    }

    const historicoBanco = await prisma.historico.findMany({
      where: {
        lead_id: lead.id
      },
      orderBy: {
        criado_em: 'asc'
      }
    })

    const historico: Message[] = historicoBanco.map(msg => {
      return { role: msg.autor === 'Lead' ? 'user' : 'assistant', content: msg.mensagem }
    })

    historico.push(...his);
    return historico;
  };

  function limparNumero(numero: string) {
    let numeroFormat = numero;
    if (numero.includes("@")) {
      numeroFormat = numero.split("@")[0];
    }
    return numeroFormat
  }

  async function mudarAtividadeIA(lead_id: number, atividade?: boolean) {

    try {
      const lead = await prisma.leads.findFirst({
        where: { id: lead_id },
        select: { ia_ativa: true }
      });

      if (lead) {
        await prisma.leads.update({
          where: {
            id: lead_id
          },
          data: {
            ia_ativa: atividade != null ? atividade : !lead.ia_ativa
          }
        })
      }
    } catch (error) {
      console.error("erro ao alterar atividade IA na lead!")
    }


  }

  async function insertHistorico(historico: Partial<Historico>) {
    await prisma.historico.create({
      data: {
        autor: historico.autor!,
        mensagem: historico.mensagem!,
        lead_id: historico.lead_id!,
        tokens_usados: historico.tokens_usados || 0
      }
    })

    return;
  };

  async function responderPergunta(mensagem: string, numeroOriginal: string, usuario_id: number, client?: any) {

    const numero = limparNumero(numeroOriginal);

    const promptBanco: string | null = await getPrompt(usuario_id);
    const lead = await prisma.leads.findFirst({
      where: { numero: numero, cliente_id: usuario_id },
      select: { id: true, interesse: true, qualidade: true }
    })

    const temperatura = lead?.qualidade || 'fria';
    let superPropt = configurePrompt(promptBanco, temperatura);

    const atividade = await getAtividade(usuario_id, numero);
    if (!atividade) return;

    let historico = await getHistorico(usuario_id, numero, mensagem);
    superPropt.unshift(...historico);
    historico = superPropt;


    await atualizarInteresse(historico, lead).catch(err => console.error("Erro ao atualizar interesse:", err));
    if (lead?.interesse) {
      historico.push({ role: 'system', content: `interesse atual do usuario:${lead.interesse}` });
    }

    const res = await chatgpt.chat.completions.create({
      model: 'o4-mini',
      messages: historico
    })

    const resposta = res.choices[0].message.content;

    if (lead && resposta) {
      await insertHistorico({
        autor: 'Lead',
        mensagem: mensagem,
        lead_id: lead ? lead.id : 0,
        tokens_usados: mensagem.length
      });

      await insertHistorico({
        autor: 'Assistant',
        mensagem: resposta,
        lead_id: lead ? lead.id : 0,
        tokens_usados: resposta.length
      });
    }

    return resposta || '';
  };

  async function atualizarInteresse(historico: Message[], lead: any) {
    const historicoFiltrado = historico.filter(msg => msg.role !== 'system');

    let mensagensParaAnalise = historicoFiltrado.slice(-10);
    mensagensParaAnalise.unshift({ role: 'system', content: promptColombo });
    if ((historicoFiltrado.length > 2 && historicoFiltrado.length < 4) || (Number.isInteger((mensagensParaAnalise.length / 5)))) {

      const res = await chatgpt.chat.completions.create({
        model: 'o4-mini',
        messages: mensagensParaAnalise
      })

      const resposta = res.choices[0].message.content;

      let parsed;

      try {
        if (!resposta) return;
        if (resposta.trim().startsWith('{')) {
          parsed = JSON.parse(resposta);
        }
      } catch (e) {
        console.error("JSON inválido retornado pelo Colombo:", resposta);
        return;
      }

      if (parsed.interesse == "falar_com_atendente") {
        await mudarAtividadeIA(lead?.id);
      }

      // console.log("Interesse analisado pelo Colombo:", parsed);
      await prisma.leads.update({
        where: { id: lead?.id },
        data: { interesse: parsed.interesse || "nenhum_interesse", qualidade: (parsed.temperatura).toUpperCase() || "FRIA" }
      });
    }
  };

  async function converterAudioEmTexto(audioPath: string) {
    const transcription = await chatgpt.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: "gpt-4o-transcribe"
    });

    fs.unlinkSync(audioPath);

    return transcription.text;
  };

  return {
    responderPergunta,
    getAtividade,
    converterAudioEmTexto,
    mudarAtividadeIA,
    getLead,
    organizerUsuarios
  };
}

export { organizerUsuarios }