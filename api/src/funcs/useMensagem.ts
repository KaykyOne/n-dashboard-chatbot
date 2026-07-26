import fs from "fs/promises";
import { InstanceStatus, WhatsAppProvider } from "../../generated/prisma/enums.js";
import prisma from "../../prisma/prisma.js";
import { createLogger } from "../logger.js";

const logger = createLogger({ module: "useMensagem" });

export default function useMensagem() {
    async function atualizarQrCode(qr: string, usuario_id: number, provider: WhatsAppProvider) {
        const scopedLogger = logger.child({ usuarioId: usuario_id, provider });

        const instance = await prisma.whatsappInstances.findFirst({
            where: { cliente_id: usuario_id, provider }
        });

        if (!instance) {
            await prisma.whatsappInstances.create({
                data: {
                    cliente_id: usuario_id,
                    provider,
                    qr_code: qr,
                    status: "CONNECTING",
                    session_path: `session-bot-${usuario_id}`
                }
            });

            scopedLogger.info({ qrLength: qr.length }, "Instancia criada e QR code persistido");
            return;
        }

        await prisma.whatsappInstances.updateMany({
            where: { cliente_id: usuario_id, provider },
            data: { qr_code: qr }
        });

        scopedLogger.info({ qrLength: qr.length }, "QR code atualizado");
    }

    async function atualizarConecao(id_usuario: number, status: InstanceStatus, provider: WhatsAppProvider) {
        await prisma.whatsappInstances.updateMany({
            where: { cliente_id: id_usuario, provider },
            data: { status }
        });

        logger.info({ usuarioId: id_usuario, provider, status }, "Status da conexao atualizado");
    }

    async function testMensagem(msg: any, numero: string, client: any) {
        if (numero === "status@broadcast" || numero.endsWith("@g.us")) return false;
        if (msg.fromMe || msg.key?.fromMe) return false;
        return true;
    }

    async function formatarNumero(numero: string, client: any) {
        if (!client) {
            return numero;
        }

        if (numero.endsWith("@lid")) {
            const jidReal = await client.getContactById(numero);
            if (jidReal) numero = jidReal;
        } else {
            numero = numero.split("@")[0];
        }

        return numero;
    }

    async function marcarEnviada(id: number) {
        try {
            await prisma.mensagens.update({
                where: { id },
                data: { enviado_por_ia: true }
            });

            logger.info({ mensagemId: id }, "Mensagem marcada como enviada");
        } catch (err) {
            logger.error({ mensagemId: id, err }, "Erro ao atualizar status da mensagem");
        }
    }

    async function buscarMensagensPendentes(usuario_id: number) {
        const mensagens = await prisma.mensagens.findMany({
            where: {
                origem_id: usuario_id,
                enviado_por_ia: false
            },
            include: {
                destino: true
            }
        });

        logger.debug({ usuarioId: usuario_id, total: mensagens.length }, "Mensagens pendentes consultadas");
        return mensagens;
    }

    async function iniciarPollingMensagens(usuario_id: number, funct: any, intervalo: number = 5000) {
        setInterval(async () => {
            const mensagens = await buscarMensagensPendentes(usuario_id);

            for (const msg of mensagens) {
                const numeroFormatado = msg.destino.numero.includes("@c.us")
                    ? msg.destino.numero
                    : `${msg.destino.numero}@c.us`;

                funct(msg.conteudo, numeroFormatado);
                await marcarEnviada(msg.id);
            }
        }, intervalo);
    }

    async function deleteFolder(folderPath: string) {
        try {
            await fs.rm(folderPath, { recursive: true, force: true });
            logger.info({ folderPath }, "Pasta removida com sucesso");
        } catch (err) {
            logger.error({ folderPath, err }, "Erro ao apagar pasta");
        }
    }

    async function escutarQrCode(client: any, usuario_id: number, intervalo: number = 5000) {
        logger.info({ usuarioId: usuario_id, intervalo }, "Escutando atualizacoes de QR code via polling");

        let ultimoQrCode: string | null = null;

        setInterval(async () => {
            try {
                const instance = await prisma.whatsappInstances.findFirst({
                    where: { cliente_id: usuario_id },
                    select: { qr_code: true }
                });

                if (instance && instance.qr_code !== ultimoQrCode) {
                    ultimoQrCode = instance.qr_code;

                    if (instance.qr_code === "" || instance.qr_code === null) {
                        logger.warn({ usuarioId: usuario_id }, "QR code limpo; reiniciando cliente e limpando autenticao local");
                        await client.destroy();
                        await new Promise((res) => setTimeout(res, 5000));
                        await deleteFolder(".wwebjs_auth");
                        await deleteFolder(".wwebjs_cache");
                        client.initialize();
                    }
                }
            } catch (err) {
                logger.error({ usuarioId: usuario_id, err }, "Erro ao verificar QR code");
            }
        }, intervalo);
    }

    return {
        atualizarQrCode,
        atualizarConecao,
        testMensagem,
        formatarNumero,
        marcarEnviada,
        buscarMensagensPendentes,
        iniciarPollingMensagens,
        deleteFolder,
        escutarQrCode
    };
}
