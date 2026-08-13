import {
    downloadContentFromMessage,
    type WAMessage,
    type WASocket
} from "@whiskeysockets/baileys";
import fs from "fs";
import path from "path";
import type useBot from "../funcs/useBot";
import type useMensagem from "../funcs/useMensagem";
import { resolvePhoneNumber } from "../funcs/whatsapp-address.js";
import type { createLogger } from "../utils/logger";
import { baileysConfig, baileysContext } from "./context.js";
import {
    isBotGeneratedMessage,
    sendBotResponse
} from "./send.js";

type BotLogger = ReturnType<typeof createLogger>;
type BotFunctions = ReturnType<typeof useBot>;
type MessageFunctions = ReturnType<typeof useMensagem>;

interface RegisterMessageReceiverOptions {
    sock: WASocket;
    usuarioId: number;
    botLogger: BotLogger;
    botFuncs: BotFunctions;
    messageFuncs: MessageFunctions;
}

async function downloadAudio(msg: WAMessage, filePath: string) {
    const audioMessage = msg.message?.audioMessage;

    if (!audioMessage) return null;

    const stream = await downloadContentFromMessage(audioMessage, "audio");
    const chunks: Uint8Array[] = [];

    for await (const chunk of stream) {
        chunks.push(chunk);
    }

    const file = Buffer.concat(chunks);

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file);

    return file;
}

async function extractPhoneNumber(msg: WAMessage, sock: WASocket) {
    return resolvePhoneNumber(msg.key, {
        contextParticipant:
            msg.message?.extendedTextMessage?.contextInfo?.participant,
        getPhoneJidForLid: (lid) =>
            sock.signalRepository.lidMapping.getPNForLID(lid)
    });
}

export function registerMessageReceiver({
    sock,
    usuarioId,
    botLogger,
    botFuncs,
    messageFuncs
}: RegisterMessageReceiverOptions) {
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        botLogger.debug(
            { type, totalMessages: messages.length },
            "Evento recebido"
        );

        if (type !== "notify") {
            botLogger.debug("Ignorado: tipo diferente de notify");
            return;
        }

        const msg = messages[0];

        if (!msg) {
            botLogger.debug("Ignorado: evento sem mensagens");
            return;
        }

        botLogger.debug({ msgKey: msg.key }, "Mensagem capturada");

        if (msg.key.remoteJid?.endsWith("@g.us")) {
            botLogger.debug({ jid: msg.key.remoteJid }, "Ignorado: grupo");
            return;
        }

        if (!msg.message) {
            botLogger.debug("Ignorado: mensagem vazia");
            return;
        }

        const textMessage =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            "";

        const numero = await extractPhoneNumber(msg, sock);
        const remoteJid = msg.key.remoteJid;

        botLogger.debug({ numero, remoteJid }, "Dados extraídos");

        if (!numero || !remoteJid) {
            botLogger.warn("Ignorado: numero ou remoteJid inválido");
            return;
        }

        if (msg.key.fromMe && !isBotGeneratedMessage(textMessage)) {
            botLogger.debug(
                { numero },
                "Mensagem enviada por mim (fora do padrão bot)"
            );

            const lead = await botFuncs.getLead(numero, usuarioId);

            if (!lead?.id) {
                botLogger.warn({ numero }, "Lead não encontrado");
                return;
            }

            botLogger.debug(
                { leadId: lead.id },
                "Lead encontrado, desativando IA"
            );
            await botFuncs.mudarAtividadeIA(lead.id, false);
        }

        if (msg.key.fromMe) {
            botLogger.debug("Ignorado: mensagem enviada por mim");
            return;
        }

        const botNumber = sock.user?.id
            ? sock.user.id.split(":")[0].replace(/\D/g, "")
            : undefined;

        if (numero === botNumber) {
            botLogger.debug("Ignorado: mensagem do próprio bot");
            return;
        }

        try {
            const allowedNumber = await botFuncs.podeReceberMensagem(
                usuarioId,
                numero
            );

            if (!allowedNumber) {
                botLogger.info(
                    { numero },
                    "Mensagem ignorada: numero nao autorizado pelo modo teste"
                );
                return;
            }
        } catch (err) {
            botLogger.error(
                { err, numero },
                "Mensagem bloqueada: nao foi possivel validar o modo teste"
            );
            return;
        }

        let text = "";

        if (textMessage) {
            text = textMessage;
            botLogger.debug(
                { tamanho: text.length },
                "Mensagem de texto recebida"
            );
        } else if (msg.message.audioMessage) {
            const audioPath = `./src/bots/baileys/audios/${numero}.ogg`;

            botLogger.debug({ path: audioPath }, "Baixando áudio");
            await downloadAudio(msg, audioPath);

            text = (await botFuncs.converterAudioEmTexto(audioPath)) || "";

            botLogger.debug(
                { from: remoteJid, transcriptLength: text.length },
                "Áudio transcrito"
            );
        }

        const timestamp = Number(msg.messageTimestamp);
        const now = Math.floor(Date.now() / 1000);

        if (now - timestamp > baileysConfig.maxMessageAgeSeconds) {
            botLogger.debug(
                { timestamp, agora: now },
                "Ignorado: mensagem antiga"
            );
            return;
        }

        try {
            botLogger.debug({ numero }, "Validando se pode responder");

            const canRespond = await messageFuncs.testMensagem(
                msg,
                numero,
                sock
            );

            if (!canRespond) {
                botLogger.debug("Bloqueado por regra de negócio");
                return;
            }

            botLogger.debug({ numero, texto: text }, "Adicionando à fila");

            const queueKey = `${usuarioId}:${numero}`;
            baileysContext.appendPendingMessage(queueKey, text);

            baileysContext.schedulePendingMessage(queueKey, () => {
                void processPendingMessages({
                    queueKey,
                    numero,
                    remoteJid,
                    usuarioId,
                    sock,
                    botLogger,
                    botFuncs
                });
            });

            botLogger.debug(
                { numero, tempo: baileysConfig.messageDebounceMs },
                "Timeout agendado"
            );
        } catch (err) {
            botLogger.error(
                { err, from: remoteJid, numero },
                "Erro ao processar mensagem recebida"
            );
        }
    });
}

interface ProcessPendingMessagesOptions {
    queueKey: string;
    numero: string;
    remoteJid: string;
    usuarioId: number;
    sock: WASocket;
    botLogger: BotLogger;
    botFuncs: BotFunctions;
}

async function processPendingMessages({
    queueKey,
    numero,
    remoteJid,
    usuarioId,
    sock,
    botLogger,
    botFuncs
}: ProcessPendingMessagesOptions) {
    botLogger.debug({ numero }, "Processando fila de mensagens");

    const messages = baileysContext.consumePendingMessages(queueKey);

    if (!messages) {
        botLogger.debug({ numero }, "Fila vazia ou removida");
        return;
    }

    try {
        botLogger.debug({ mensagens: messages }, "Mensagens agrupadas");

        const response = await botFuncs.responderPergunta(
            messages,
            numero,
            usuarioId,
            sock
        );

        if (!response) {
            botLogger.warn({ numero }, "Sem resposta da IA");
            return;
        }

        await sendBotResponse({
            sock,
            remoteJid,
            numero,
            response,
            botLogger
        });
    } catch (err) {
        botLogger.error(
            { err, from: remoteJid, numero },
            "Erro ao gerar ou enviar resposta"
        );
    }
}