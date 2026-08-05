import makeWASocket, {
    DisconnectReason,
    WASocket,
    downloadContentFromMessage,
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";
import fs from "fs";
import path from "path";
import pino from "pino";
import useBot from "../../funcs/useBot";
import useMensagem from "../../funcs/useMensagem";
import {
    BAILEYS_CONNECTION_STABILITY_MS,
    MAX_BAILEYS_RECONNECTION_ATTEMPTS,
    getBotPhoneNumber,
    getReconnectionDecision
} from "../../funcs/baileys-reconnection.js";
import {
    getBaileysSessionPath,
    removeBaileysSessionDirectory
} from "../../funcs/baileys-session.js";
import { resolvePhoneNumber } from "../../funcs/whatsapp-address.js";
import { serverEnv } from "../../env.js";
import { sendWhatsAppApiMessage } from "../../services/whatsapp-notification.service.js";
import { createLogger } from "../../utils/logger";
import type { Usuario } from "../../types/usuario";

const mensagensPendentes: Record<string, string> = {};
const timeouts: Record<string, NodeJS.Timeout> = {};
const connectionStabilityTimeouts = new Map<number, NodeJS.Timeout>();
const TEMPO_ESPERA = serverEnv.BOT_MESSAGE_DEBOUNCE_MS;
const TEMPO_DIGITANDO = serverEnv.BOT_TYPING_DELAY_MS;
const TEMPO_ENTRE_PARTES = serverEnv.BOT_PART_DELAY_MS;
const IDADE_MAXIMA_MENSAGEM = serverEnv.BOT_MAX_MESSAGE_AGE_SECONDS;
const RECONNECTION_FAILURE_MESSAGE =
    "O WhatsApp deste bot foi desconectado automaticamente apos 5 tentativas de reconexao sem sucesso.";
const BAILEYS_LOGOUT_TIMEOUT_MS = 5_000;

const { version } = await fetchLatestBaileysVersion();

function juntarMensagens(numero: string, texto: string) {
    mensagensPendentes[numero] = mensagensPendentes[numero]
        ? `${mensagensPendentes[numero]}\n${texto}`
        : texto;

    if (timeouts[numero]) {
        clearTimeout(timeouts[numero]);
    }
}

function clearPendingMessagesForUser(usuarioId: number) {
    const queuePrefix = `${usuarioId}:`;

    Object.keys(timeouts)
        .filter((queueKey) => queueKey.startsWith(queuePrefix))
        .forEach((queueKey) => {
            clearTimeout(timeouts[queueKey]);
            delete timeouts[queueKey];
        });

    Object.keys(mensagensPendentes)
        .filter((queueKey) => queueKey.startsWith(queuePrefix))
        .forEach((queueKey) => {
            delete mensagensPendentes[queueKey];
        });
}

function clearConnectionStabilityTimeout(usuarioId: number) {
    const stabilityTimeout = connectionStabilityTimeouts.get(usuarioId);

    if (stabilityTimeout) {
        clearTimeout(stabilityTimeout);
        connectionStabilityTimeouts.delete(usuarioId);
    }
}

async function closeBaileysSocket(
    sock: WASocket,
    requestLogout: boolean,
    botLogger: ReturnType<typeof createLogger>
) {
    (sock.ev as any).removeAllListeners();
    let logoutSucceeded = false;

    if (requestLogout) {
        let logoutTimeout: NodeJS.Timeout | undefined;

        try {
            await Promise.race([
                sock.logout(
                    "Sessao encerrada apos limite de falhas de reconexao"
                ),
                new Promise<never>((_, reject) => {
                    logoutTimeout = setTimeout(
                        () => reject(new Error("Timeout ao desconectar do WhatsApp.")),
                        BAILEYS_LOGOUT_TIMEOUT_MS
                    );
                })
            ]);
            logoutSucceeded = true;
        } catch (err) {
            botLogger.warn(
                { err },
                "Logout remoto nao foi confirmado; encerrando socket local"
            );
        } finally {
            if (logoutTimeout) {
                clearTimeout(logoutTimeout);
            }
        }
    }

    await sock.end(undefined).catch((err) => {
        botLogger.debug({ err }, "Socket ja estava encerrado");
    });

    return logoutSucceeded;
}

async function baixarAudio(msg: any, caminho: string) {
    if (!msg.message?.audioMessage && !msg.message?.ptt) return null;

    const stream = await downloadContentFromMessage(msg.message.audioMessage || msg.message.ptt, "audio");
    const buffer: Buffer[] = [];

    for await (const chunk of stream) {
        buffer.push(chunk);
    }

    const arquivo = Buffer.concat(buffer);
    fs.mkdirSync(path.dirname(caminho), { recursive: true });
    fs.writeFileSync(caminho, arquivo);
    return arquivo;
}

async function extractNumero(msg: any, sock: WASocket) {
    return resolvePhoneNumber(msg.key, {
        contextParticipant:
            msg.message?.extendedTextMessage?.contextInfo?.participant,
        getPhoneJidForLid: (lid) =>
            sock.signalRepository.lidMapping.getPNForLID(lid)
    });
}

async function startBot(usuario: Usuario) {


    const baseLogger = createLogger({ module: "baileys", provider: "BAILEYS" });

    baseLogger.info({ version }, "Versao do Baileys obtida");

    if (!usuario.id) {
        baseLogger.warn("Tentativa de iniciar bot sem id de usuario");
        return;
    }

    const usuarioId = usuario.id;
    const authPath = getBaileysSessionPath(usuarioId);
    const botLogger = baseLogger.child({ usuarioId, authPath });
    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    const funcoes = useMensagem();
    const botFuncs = useBot();

    botLogger.info("Iniciando cliente do Baileys");

    const sock = makeWASocket({
        version,
        logger: pino({ level: "error" }),
        auth: state,
        printQRInTerminal: false
    });

    usuario.cliente = sock;
    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (usuario.cliente !== sock) {
            botLogger.debug(
                { connection },
                "Evento ignorado: socket antigo nao e mais o cliente ativo"
            );
            return;
        }

        if (qr) {
            usuario.qrCode = qr;
            usuario.ativado = true;
            usuario.status = "CONNECTING";
            await funcoes.atualizarQrCode(qr, usuarioId, "BAILEYS").catch((err) => {
                botLogger.warn({ err }, "Nao foi possivel persistir o QR code");
            });
            botLogger.info({ qrLength: qr.length }, "QR code atualizado");
        }

        if (connection === "open") {
            usuario.ativado = true;
            usuario.status = "ONLINE";
            usuario.qrCode = null;
            clearConnectionStabilityTimeout(usuarioId);
            connectionStabilityTimeouts.set(
                usuarioId,
                setTimeout(() => {
                    connectionStabilityTimeouts.delete(usuarioId);

                    if (
                        usuario.cliente !== sock
                        || usuario.status !== "ONLINE"
                        || !usuario.ativado
                    ) {
                        return;
                    }

                    usuario.tentativasReconexao = 0;
                    botLogger.info(
                        { stabilityMs: BAILEYS_CONNECTION_STABILITY_MS },
                        "Conexao permaneceu estavel; contador de reconexoes zerado"
                    );
                }, BAILEYS_CONNECTION_STABILITY_MS)
            );
            await funcoes.atualizarConecao(usuarioId, "ONLINE", "BAILEYS").catch((err) => {
                botLogger.warn({ err }, "Nao foi possivel persistir o status online");
            });
            botLogger.info(
                {
                    tentativaAtual: usuario.tentativasReconexao ?? 0,
                    stabilityMs: BAILEYS_CONNECTION_STABILITY_MS
                },
                "Cliente online aguardando janela de estabilidade"
            );
        }

        if (connection === "close") {
            clearConnectionStabilityTimeout(usuarioId);
            const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            const reconnectDecision = getReconnectionDecision(
                usuario.tentativasReconexao,
                shouldReconnect,
                usuario.ativado
            );

            usuario.cliente = null;
            usuario.qrCode = null;
            usuario.status = "OFFLINE";
            (sock.ev as any).removeAllListeners();
            await funcoes.atualizarConecao(usuarioId, "OFFLINE", "BAILEYS").catch((err) => {
                botLogger.warn({ err }, "Nao foi possivel persistir o status offline");
            });
            botLogger.warn({ statusCode, shouldReconnect }, "Cliente desconectado");

            if (reconnectDecision.action === "stop") {
                return;
            }

            if (reconnectDecision.action === "notify-and-disconnect") {
                usuario.ativado = false;
                usuario.tentativasReconexao =
                    MAX_BAILEYS_RECONNECTION_ATTEMPTS;
                clearConnectionStabilityTimeout(usuarioId);
                clearPendingMessagesForUser(usuarioId);

                const botPhone = getBotPhoneNumber(
                    sock.user?.id,
                    state.creds.me?.id
                );
                const runtimeDesativado = await funcoes
                    .marcarRuntimeComErro(usuarioId, "BAILEYS")
                    .catch((err) => {
                        botLogger.error(
                            { err },
                            "Falha ao persistir erro do runtime"
                        );
                        return true;
                    });
                const logoutSucceeded = await closeBaileysSocket(
                    sock,
                    true,
                    botLogger
                );
                let sessionRemoved = false;

                try {
                    sessionRemoved = removeBaileysSessionDirectory(
                        usuarioId,
                        authPath
                    );
                } catch (err) {
                    botLogger.error(
                        { err, authPath },
                        "Falha ao remover pasta de sessao do Baileys"
                    );
                }

                botLogger.error(
                    {
                        logoutSucceeded,
                        sessionRemoved,
                        tentativas: reconnectDecision.completedAttempts
                    },
                    "Limite de reconexoes atingido; sessao removida e cliente desativado"
                );

                if (!runtimeDesativado) {
                    botLogger.info(
                        "Alerta ignorado: runtime ja estava desligado"
                    );
                    return;
                }

                if (!botPhone) {
                    botLogger.error(
                        "Nao foi possivel identificar o numero do bot para enviar o alerta"
                    );
                    return;
                }

                await sendWhatsAppApiMessage({
                    text: RECONNECTION_FAILURE_MESSAGE,
                    phone: botPhone
                }).then(() => {
                    botLogger.info(
                        { phoneSuffix: botPhone.slice(-4) },
                        "Alerta de falha de reconexao enviado"
                    );
                }).catch((err) => {
                    botLogger.error(
                        { err, phoneSuffix: botPhone.slice(-4) },
                        "Falha ao enviar alerta de reconexao"
                    );
                });
                return;
            }

            usuario.tentativasReconexao = reconnectDecision.attempt;
            usuario.status = "CONNECTING";
            botLogger.warn(
                { tentativa: reconnectDecision.attempt },
                reconnectDecision.attempt === 1
                    ? "Primeira tentativa de reconexao pelo fluxo padrao do Baileys"
                    : "Tentando reconectar cliente"
            );
            void startBot(usuario).catch((err) => {
                botLogger.error(
                    { err, tentativa: reconnectDecision.attempt },
                    "Falha ao preparar tentativa de reconexao"
                );
            });
        }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        botLogger.debug({ type, totalMessages: messages.length }, "Evento recebido");

        if (type !== "notify") {
            botLogger.debug("Ignorado: tipo diferente de notify");
            return;
        }

        const msg = messages[0];
        botLogger.debug({ msgKey: msg?.key }, "Mensagem capturada");

        if (msg.key.remoteJid?.endsWith("@g.us")) {
            botLogger.debug({ jid: msg.key.remoteJid }, "Ignorado: grupo");
            return;
        }

        if (!msg.message) {
            botLogger.debug("Ignorado: mensagem vazia");
            return;
        }

        const textoMensagem =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            "";

        const numero = await extractNumero(msg, sock);
        const remoteJid = msg.key.remoteJid;

        botLogger.debug({ numero, remoteJid }, "Dados extraídos");

        if (!numero || !remoteJid) {
            botLogger.warn("Ignorado: numero ou remoteJid inválido");
            return;
        }

        if (msg.key.fromMe && !textoMensagem.includes("*BOT IDEALZINHO:*")) {
            botLogger.debug({ numero }, "Mensagem enviada por mim (fora do padrão bot)");

            const lead = await botFuncs.getLead(numero, usuarioId);

            if (lead?.id) {
                botLogger.debug({ leadId: lead.id }, "Lead encontrado, desativando IA");
                await botFuncs.mudarAtividadeIA(lead.id, false);
            } else {
                botLogger.warn({ numero }, "Lead não encontrado");
                return;
            }
        }

        if (msg.key.fromMe) {
            botLogger.debug("Ignorado: mensagem enviada por mim");
            return;
        }

        const me = sock.user?.id
            ? sock.user.id.split(":")[0].replace(/\D/g, "")
            : undefined;

        if (numero === me) {
            botLogger.debug("Ignorado: mensagem do próprio bot");
            return;
        }

        try {
            const numeroPermitido = await botFuncs.podeReceberMensagem(usuarioId, numero);

            if (!numeroPermitido) {
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

        // if (
        //     numero.includes("5517997437646") ||
        //     numero.includes("5567981368080") ||
        //     numero.includes("556781368080") ||
        //     numero.includes("5517997572900")
        // ) {
        //     botLogger.debug({ numero }, "Ignorado: número bloqueado");
        //     return;
        // }

        let texto = "";

        if (textoMensagem) {
            texto = textoMensagem;
            botLogger.debug({ tamanho: texto.length }, "Mensagem de texto recebida");
        } else if (msg.message.audioMessage) {
            const path = `./src/bots/baileys/audios/${numero}.ogg`;

            botLogger.debug({ path }, "Baixando áudio");
            await baixarAudio(msg, path);

            texto = (await botFuncs.converterAudioEmTexto(path)) || "";

            botLogger.debug(
                { from: remoteJid, transcriptLength: texto.length },
                "Áudio transcrito"
            );
        }

        const timestamp = Number(msg.messageTimestamp);
        const agora = Math.floor(Date.now() / 1000);

        if (agora - timestamp > IDADE_MAXIMA_MENSAGEM) {
            botLogger.debug({ timestamp, agora }, "Ignorado: mensagem antiga");
            return;
        }

        try {
            botLogger.debug({ numero }, "Validando se pode responder");

            const podeResponder = await funcoes.testMensagem(msg, numero, sock);

            if (!podeResponder) {
                botLogger.debug("Bloqueado por regra de negócio");
                return;
            }

            botLogger.debug({ numero, texto }, "Adicionando à fila");
            const queueKey = `${usuarioId}:${numero}`;
            juntarMensagens(queueKey, texto);

            timeouts[queueKey] = setTimeout(() => {
                void (async () => {
                botLogger.debug({ numero }, "Processando fila de mensagens");

                const mensagens = mensagensPendentes[queueKey];

                delete mensagensPendentes[queueKey];
                delete timeouts[queueKey];

                try {
                    botLogger.debug({ mensagens }, "Mensagens agrupadas");

                    const resposta = await botFuncs.responderPergunta(
                        mensagens,
                        numero,
                        usuarioId,
                        sock
                    );

                    if (!resposta) {
                        botLogger.warn({ numero }, "Sem resposta da IA");
                        return;
                    }

                    const partes = resposta
                        .split("(SEPARAR)")
                        .map((parte) => parte.trim())
                        .filter(Boolean);

                    botLogger.debug({ totalPartes: partes.length }, "Resposta dividida");

                    for (const [index, parte] of partes.entries()) {
                        botLogger.debug({ parte, index }, "Enviando parte da resposta");

                        await sock.sendPresenceUpdate("composing", remoteJid);

                        if (TEMPO_DIGITANDO > 0) {
                            await new Promise((resolve) =>
                                setTimeout(resolve, TEMPO_DIGITANDO)
                            );
                        }

                        await sock.sendMessage(remoteJid, {
                            text: `*BOT IDEALZINHO:*\n${parte}`,
                        });

                        await sock.sendPresenceUpdate("paused", remoteJid);

                        if (index < partes.length - 1 && TEMPO_ENTRE_PARTES > 0) {
                            await new Promise((resolve) =>
                                setTimeout(resolve, TEMPO_ENTRE_PARTES)
                            );
                        }
                    }

                    botLogger.debug({ numero }, "Resposta finalizada");
                } catch (err) {
                    botLogger.error(
                        { err, from: remoteJid, numero },
                        "Erro ao gerar ou enviar resposta"
                    );
                }
                })();
            }, TEMPO_ESPERA);

            botLogger.debug({ numero, tempo: TEMPO_ESPERA }, "Timeout agendado");
        } catch (err) {
            botLogger.error(
                { err, from: remoteJid, numero },
                "Erro ao processar mensagem recebida"
            );
        }
    });

    return usuario;
}

async function disconnectBot(
    usuario: Usuario,
    options?: { logout?: boolean }
) {
    if (!usuario) return;

    const botLogger = createLogger({
        module: "baileys",
        provider: "BAILEYS",
        usuarioId: usuario.id
    });

    try {
        const sock = usuario.cliente as WASocket | null;

        if (!sock || !("ev" in sock)) {
            botLogger.warn("Socket nao e uma instancia valida de WASocket");
            usuario.ativado = false;
            usuario.cliente = null;
            usuario.qrCode = null;
            usuario.status = "OFFLINE";
            return;
        }

        usuario.ativado = false;
        clearConnectionStabilityTimeout(usuario.id);

        clearPendingMessagesForUser(usuario.id);

        await closeBaileysSocket(sock, Boolean(options?.logout), botLogger);

        usuario.cliente = null;
        usuario.qrCode = null;
        usuario.status = "OFFLINE";
        await useMensagem()
            .atualizarConecao(usuario.id, "OFFLINE", "BAILEYS")
            .catch((err) => {
                botLogger.warn({ err }, "Nao foi possivel persistir o status offline");
            });

        botLogger.info("Cliente desconectado com sucesso");
    } catch (err) {
        botLogger.error({ err }, "Erro ao desconectar cliente");
        usuario.cliente = null;
        usuario.ativado = false;
        usuario.status = "OFFLINE";
    }
}

export { disconnectBot, startBot };
