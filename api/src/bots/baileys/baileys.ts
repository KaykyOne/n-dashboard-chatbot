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
import { createLogger } from "../../logger";
import type { Usuario } from "../../types/usuario";

const mensagensPendentes: Record<string, string> = {};
const timeouts: Record<string, NodeJS.Timeout> = {};
const TEMPO_ESPERA = 15000;

const { version } = await fetchLatestBaileysVersion();

function juntarMensagens(numero: string, texto: string) {
    mensagensPendentes[numero] = mensagensPendentes[numero]
        ? `${mensagensPendentes[numero]}\n${texto}`
        : texto;

    if (timeouts[numero]) {
        clearTimeout(timeouts[numero]);
    }
}

const testTentativasDeReconexao = (tentativa: number) => tentativa <= 5;

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

function extractNumero(msg: any, sock: WASocket): string | null {
    const raw = msg.key.fromMe
        ? sock.user?.id
        : msg.key.participant
        || msg.key.participantAlt
        || msg.key.remoteJidAlt
        || msg.message?.extendedTextMessage?.contextInfo?.participant
        || msg.key.remoteJid;

    if (!raw) return null;

    const numero = raw.split("@")[0].replace(/\D/g, "");

    if (!numero.startsWith("55")) return null;

    return numero;
}

async function startBot(usuario: Usuario) {


    const baseLogger = createLogger({ module: "baileys", provider: "BAILEYS" });

    baseLogger.info({ version }, "Versao do Baileys obtida");

    if (!usuario.id) {
        baseLogger.warn("Tentativa de iniciar bot sem id de usuario");
        return;
    }

    const usuarioId = usuario.id;
    const authPath = `./src/bots/baileys/sessions/bot-baileys-${usuarioId}`;
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

        if (qr) {
            usuario.qrCode = qr;
            usuario.ativado = true;
            await funcoes.atualizarQrCode(qr, usuarioId, "BAILEYS");
            botLogger.info({ qrLength: qr.length }, "QR code atualizado");
        }

        if (connection === "open") {
            usuario.tentativasReconexao = 0;
            await funcoes.atualizarConecao(usuarioId, "ONLINE", "BAILEYS");
            botLogger.info("Cliente online");
        }

        if (connection === "close") {
            const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            usuario.cliente = null;
            usuario.qrCode = null;
            await funcoes.atualizarConecao(usuarioId, "OFFLINE", "BAILEYS");
            botLogger.warn({ statusCode, shouldReconnect }, "Cliente desconectado");

            if (!usuario.ativado || !shouldReconnect) {
                return;
            }

            if (usuario.tentativasReconexao) {
                usuario.tentativasReconexao += 1;

                if (!testTentativasDeReconexao(usuario.tentativasReconexao)) {
                    botLogger.error(
                        { tentativa: usuario.tentativasReconexao },
                        "Limite de reconexoes atingido"
                    );
                    return;
                }

                botLogger.warn(
                    { tentativa: usuario.tentativasReconexao },
                    "Tentando reconectar cliente"
                );
                startBot(usuario);
                return;
            }

            usuario.tentativasReconexao = 1;
            await funcoes.atualizarQrCode("", usuarioId, "BAILEYS");
            botLogger.warn({ tentativa: usuario.tentativasReconexao }, "Primeira tentativa de reconexao");
            startBot(usuario);
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

        const numero = extractNumero(msg, sock);
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

        if (agora - timestamp > 10) {
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
            juntarMensagens(numero, texto);

            timeouts[numero] = setTimeout(async () => {
                botLogger.debug({ numero }, "Processando fila de mensagens");

                const mensagens = mensagensPendentes[numero];

                delete mensagensPendentes[numero];
                delete timeouts[numero];

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

                const partes = resposta.includes("(SEPARAR)")
                    ? resposta.split("(SEPARAR)")
                    : [resposta];

                botLogger.debug({ totalPartes: partes.length }, "Resposta dividida");

                for (const parte of partes) {
                    botLogger.debug({ parte }, "Enviando parte da resposta");

                    await sock.sendPresenceUpdate("composing", remoteJid);
                    await new Promise((resolve) => setTimeout(resolve, 4000));

                    await sock.sendMessage(remoteJid, {
                        text: `*BOT IDEALZINHO:*\n${parte}`,
                    });

                    await sock.sendPresenceUpdate("paused", remoteJid);
                    await new Promise((resolve) => setTimeout(resolve, 20000));
                }

                botLogger.debug({ numero }, "Resposta finalizada");
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

async function disconnectBot(usuario: Usuario) {
    if (!usuario || !usuario.cliente) return;

    const botLogger = createLogger({
        module: "baileys",
        provider: "BAILEYS",
        usuarioId: usuario.id
    });

    try {
        const sock = usuario.cliente as WASocket;

        if (!("ev" in sock)) {
            botLogger.warn("Socket nao e uma instancia valida de WASocket");
            return;
        }

        usuario.ativado = false;

        Object.keys(timeouts).forEach((numero) => {
            clearTimeout(timeouts[numero]);
            delete timeouts[numero];
        });

        Object.keys(mensagensPendentes).forEach((numero) => {
            delete mensagensPendentes[numero];
        });

        (sock.ev as any).removeAllListeners();
        sock.end(undefined);

        usuario.cliente = null;
        usuario.qrCode = null;

        botLogger.info("Cliente desconectado com sucesso");
    } catch (err) {
        botLogger.error({ err }, "Erro ao desconectar cliente");
        usuario.cliente = null;
        usuario.ativado = false;
    }
}

export { disconnectBot, startBot };
