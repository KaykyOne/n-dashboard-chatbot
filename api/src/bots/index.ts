import makeWASocket, {
    DisconnectReason,
    type WASocket,
    fetchLatestBaileysVersion,
    useMultiFileAuthState
} from "@whiskeysockets/baileys";
import pino from "pino";
import useBot from "../funcs/useBot";
import useMensagem from "../funcs/useMensagem";
import {
    BAILEYS_CONNECTION_STABILITY_MS,
    MAX_BAILEYS_RECONNECTION_ATTEMPTS,
    getBotPhoneNumber,
    getReconnectionDecision
} from "../funcs/baileys-reconnection.js";
import {
    getBaileysSessionPath,
    removeBaileysSessionDirectory
} from "../funcs/baileys-session.js";
import type { Usuario } from "../types/usuario";
import { createLogger } from "../utils/logger";
import { baileysContext } from "./context.js";
import { registerMessageReceiver } from "./receive.js";
import { sendReconnectionFailureNotification } from "./send.js";

const BAILEYS_LOGOUT_TIMEOUT_MS = 5_000;
const { version } = await fetchLatestBaileysVersion();

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
                        () => reject(
                            new Error("Timeout ao desconectar do WhatsApp.")
                        ),
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

async function startBot(usuario: Usuario) {
    const baseLogger = createLogger({
        module: "baileys",
        provider: "BAILEYS"
    });

    baseLogger.info({ version }, "Versao do Baileys obtida");

    if (!usuario.id) {
        baseLogger.warn("Tentativa de iniciar bot sem id de usuario");
        return;
    }

    const usuarioId = usuario.id;
    const authPath = getBaileysSessionPath(usuarioId);
    const botLogger = baseLogger.child({ usuarioId, authPath });
    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    const messageFuncs = useMensagem();
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

            await messageFuncs
                .atualizarQrCode(qr, usuarioId, "BAILEYS")
                .catch((err) => {
                    botLogger.warn(
                        { err },
                        "Nao foi possivel persistir o QR code"
                    );
                });

            botLogger.info({ qrLength: qr.length }, "QR code atualizado");
        }

        if (connection === "open") {
            usuario.ativado = true;
            usuario.status = "ONLINE";
            usuario.qrCode = null;

            baileysContext.scheduleConnectionStabilityCheck(
                usuarioId,
                () => {
                    if (
                        usuario.cliente !== sock ||
                        usuario.status !== "ONLINE" ||
                        !usuario.ativado
                    ) {
                        return;
                    }

                    usuario.tentativasReconexao = 0;
                    botLogger.info(
                        { stabilityMs: BAILEYS_CONNECTION_STABILITY_MS },
                        "Conexao permaneceu estavel; contador de reconexoes zerado"
                    );
                },
                BAILEYS_CONNECTION_STABILITY_MS
            );

            await messageFuncs
                .atualizarConecao(usuarioId, "ONLINE", "BAILEYS")
                .catch((err) => {
                    botLogger.warn(
                        { err },
                        "Nao foi possivel persistir o status online"
                    );
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
            baileysContext.clearConnectionStabilityTimeout(usuarioId);

            const statusCode = (lastDisconnect?.error as any)?.output
                ?.statusCode;
            const shouldReconnect =
                statusCode !== DisconnectReason.loggedOut;
            const reconnectDecision = getReconnectionDecision(
                usuario.tentativasReconexao,
                shouldReconnect,
                usuario.ativado
            );

            usuario.cliente = null;
            usuario.qrCode = null;
            usuario.status = "OFFLINE";
            (sock.ev as any).removeAllListeners();

            await messageFuncs
                .atualizarConecao(usuarioId, "OFFLINE", "BAILEYS")
                .catch((err) => {
                    botLogger.warn(
                        { err },
                        "Nao foi possivel persistir o status offline"
                    );
                });

            botLogger.warn(
                { statusCode, shouldReconnect },
                "Cliente desconectado"
            );

            if (reconnectDecision.action === "stop") {
                return;
            }

            if (reconnectDecision.action === "notify-and-disconnect") {
                usuario.ativado = false;
                usuario.tentativasReconexao =
                    MAX_BAILEYS_RECONNECTION_ATTEMPTS;

                baileysContext.clearConnectionStabilityTimeout(usuarioId);
                baileysContext.clearPendingMessagesForUser(usuarioId);

                const botPhone = getBotPhoneNumber(
                    sock.user?.id,
                    state.creds.me?.id
                );

                const runtimeDesativado = await messageFuncs
                    .marcarRuntimeComErro(
                        usuarioId,
                        "BAILEYS",
                        `A conexao com o WhatsApp falhou apos ${reconnectDecision.completedAttempts} tentativas (codigo ${statusCode ?? "desconhecido"}).`
                    )
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

                await sendReconnectionFailureNotification(
                    botPhone,
                    botLogger
                );
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

    registerMessageReceiver({
        sock,
        usuarioId,
        botLogger,
        botFuncs,
        messageFuncs
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
        baileysContext.clearConnectionStabilityTimeout(usuario.id);
        baileysContext.clearPendingMessagesForUser(usuario.id);

        await closeBaileysSocket(
            sock,
            Boolean(options?.logout),
            botLogger
        );

        usuario.cliente = null;
        usuario.qrCode = null;
        usuario.status = "OFFLINE";

        await useMensagem()
            .atualizarConecao(usuario.id, "OFFLINE", "BAILEYS")
            .catch((err) => {
                botLogger.warn(
                    { err },
                    "Nao foi possivel persistir o status offline"
                );
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
