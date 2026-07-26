import type { WhatsAppProvider } from "../../generated/prisma/enums.js";
import { WASocket } from "@whiskeysockets/baileys";
import { Client } from "whatsapp-web.js";

type Usuario = {
    id: number,
    cliente: WASocket | Client | null,
    qrCode: string | null,
    tentativasReconexao?: number,
    ativado: boolean,
    provider: WhatsAppProvider,
}

export { type Usuario }

