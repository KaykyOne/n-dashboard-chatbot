import { InstanceStatus, WhatsAppProvider } from "../../generated/prisma/enums.js";
import prisma from "../../prisma/prisma.js";
import { createLogger } from "../utils/logger.js";

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
            data: {
                qr_code: qr,
                status: "CONNECTING"
            }
        });

        scopedLogger.info({ qrLength: qr.length }, "QR code atualizado");
    }

    async function atualizarConecao(id_usuario: number, status: InstanceStatus, provider: WhatsAppProvider) {
        await prisma.whatsappInstances.updateMany({
            where: { cliente_id: id_usuario, provider },
            data: {
                status,
                ...(status === "ONLINE" ? { qr_code: null } : {})
            }
        });

        logger.info({ usuarioId: id_usuario, provider, status }, "Status da conexao atualizado");
    }

    async function desativarBotPermanentemente(
        usuarioId: number,
        provider: WhatsAppProvider
    ) {
        const [usuarioAtualizado] = await prisma.$transaction([
            prisma.usuarios.updateMany({
                where: {
                    id: usuarioId,
                    ia_ativa: true
                },
                data: {
                    ia_ativa: false
                }
            }),
            prisma.whatsappInstances.updateMany({
                where: {
                    cliente_id: usuarioId,
                    provider
                },
                data: {
                    qr_code: null,
                    session_path: null,
                    status: "ERROR"
                }
            })
        ]);

        logger.warn(
            {
                usuarioId,
                provider,
                desativadoAgora: usuarioAtualizado.count > 0
            },
            "Bot desativado permanentemente apos falhas de reconexao"
        );

        return usuarioAtualizado.count > 0;
    }

    async function testMensagem(msg: any, numero: string, client: any) {
        if (numero === "status@broadcast" || numero.endsWith("@g.us")) return false;
        if (msg.fromMe || msg.key?.fromMe) return false;
        return true;
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

    return {
        atualizarQrCode,
        atualizarConecao,
        desativarBotPermanentemente,
        testMensagem,
        marcarEnviada,
        buscarMensagensPendentes
    };
}
