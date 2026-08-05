import { InstanceStatus, WhatsAppProvider } from "../../generated/prisma/enums.js";
import prisma from "../../prisma/prisma.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger({ module: "useMensagem" });

export default function useMensagem() {
    async function atualizarRuntime(
        usuarioId: number,
        provider: WhatsAppProvider,
        runtime: {
            enabled: boolean;
            status: InstanceStatus;
            qrCode: string | null;
            sessionPath: string | null;
        }
    ) {
        await prisma.whatsappInstances.upsert({
            where: {
                cliente_id_provider: {
                    cliente_id: usuarioId,
                    provider
                }
            },
            create: {
                cliente_id: usuarioId,
                provider,
                enabled: runtime.enabled,
                status: runtime.status,
                qr_code: runtime.qrCode,
                session_path: runtime.sessionPath
            },
            update: {
                enabled: runtime.enabled,
                status: runtime.status,
                qr_code: runtime.qrCode,
                session_path: runtime.sessionPath
            }
        });

        logger.info(
            {
                usuarioId,
                provider,
                enabled: runtime.enabled,
                status: runtime.status
            },
            "Estado desejado do runtime atualizado"
        );
    }

    async function atualizarQrCode(qr: string, usuario_id: number, provider: WhatsAppProvider) {
        const scopedLogger = logger.child({ usuarioId: usuario_id, provider });

        await prisma.whatsappInstances.upsert({
            where: {
                cliente_id_provider: {
                    cliente_id: usuario_id,
                    provider
                }
            },
            create: {
                cliente_id: usuario_id,
                provider,
                enabled: true,
                qr_code: qr,
                status: "CONNECTING",
                session_path: `bot-baileys-${usuario_id}`
            },
            update: {
                enabled: true,
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

    async function marcarRuntimeComErro(
        usuarioId: number,
        provider: WhatsAppProvider
    ) {
        const runtimeAtualizado = await prisma.whatsappInstances.updateMany({
            where: {
                cliente_id: usuarioId,
                provider
            },
            data: {
                enabled: false,
                qr_code: null,
                session_path: null,
                status: "ERROR"
            }
        });

        logger.warn(
            {
                usuarioId,
                provider,
                runtimeAtualizado: runtimeAtualizado.count > 0
            },
            "Runtime desativado apos falhas de reconexao"
        );

        return runtimeAtualizado.count > 0;
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
        atualizarRuntime,
        atualizarQrCode,
        atualizarConecao,
        marcarRuntimeComErro,
        testMensagem,
        marcarEnviada,
        buscarMensagensPendentes
    };
}
