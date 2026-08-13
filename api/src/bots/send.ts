import type { WASocket } from "@whiskeysockets/baileys";
import { sendWhatsAppApiMessage } from "../services/whatsapp-notification.service.js";
import type { createLogger } from "../utils/logger";
import { baileysConfig } from "./context.js";

type BotLogger = ReturnType<typeof createLogger>;

export const BOT_MESSAGE_PREFIX = "*BOT IDEALZINHO:*";

const RECONNECTION_FAILURE_MESSAGE =
    "O WhatsApp deste bot foi desconectado automaticamente apos 5 tentativas de reconexao sem sucesso.";

function sleep(delayMs: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, delayMs));
}

export function isBotGeneratedMessage(text: string) {
    return text.includes(BOT_MESSAGE_PREFIX);
}

interface SendBotResponseOptions {
    sock: WASocket;
    remoteJid: string;
    numero: string;
    response: string;
    botLogger: BotLogger;
}

export async function sendBotResponse({
    sock,
    remoteJid,
    numero,
    response,
    botLogger
}: SendBotResponseOptions) {
    const parts = response
        .split("(SEPARAR)")
        .map((part) => part.trim())
        .filter(Boolean);

    botLogger.debug({ totalPartes: parts.length }, "Resposta dividida");

    for (const [index, part] of parts.entries()) {
        botLogger.debug({ parte: part, index }, "Enviando parte da resposta");

        await sock.sendPresenceUpdate("composing", remoteJid);

        if (baileysConfig.typingDelayMs > 0) {
            await sleep(baileysConfig.typingDelayMs);
        }

        await sock.sendMessage(remoteJid, {
            text: `${BOT_MESSAGE_PREFIX}\n${part}`
        });

        await sock.sendPresenceUpdate("paused", remoteJid);

        const hasNextPart = index < parts.length - 1;

        if (hasNextPart && baileysConfig.partDelayMs > 0) {
            await sleep(baileysConfig.partDelayMs);
        }
    }

    botLogger.debug({ numero }, "Resposta finalizada");
}

export async function sendReconnectionFailureNotification(
    botPhone: string,
    botLogger: BotLogger
) {
    try {
        await sendWhatsAppApiMessage({
            text: RECONNECTION_FAILURE_MESSAGE,
            phone: botPhone
        });

        botLogger.info(
            { phoneSuffix: botPhone.slice(-4) },
            "Alerta de falha de reconexao enviado"
        );
    } catch (err) {
        botLogger.error(
            { err, phoneSuffix: botPhone.slice(-4) },
            "Falha ao enviar alerta de reconexao"
        );
    }
}