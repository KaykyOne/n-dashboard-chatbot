import type { WhatsAppProvider } from "../../generated/prisma/enums.js";
import { WASocket } from "@whiskeysockets/baileys";

type Usuario = {
    id: number,
    cliente: WASocket | null,
    qrCode: string | null,
    tentativasReconexao?: number,
    ativado: boolean,
    provider: WhatsAppProvider,
}

export { type Usuario }

