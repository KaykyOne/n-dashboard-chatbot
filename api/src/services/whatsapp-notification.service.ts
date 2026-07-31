import { serverEnv } from "../env.js";

const WHATSAPP_NOTIFICATION_TIMEOUT_MS = 10_000;

type WhatsAppApiMessage = {
  text: string;
  phone: string;
};

type WhatsAppApiDependencies = {
  fetcher?: typeof fetch;
  token?: string;
  url?: string;
};

class WhatsAppNotificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WhatsAppNotificationError";
  }
}

const normalizePhoneNumber = (phone: string) => phone.replace(/\D/g, "");

async function sendWhatsAppApiMessage(
  message: WhatsAppApiMessage,
  dependencies: WhatsAppApiDependencies = {},
) {
  const url = dependencies.url ?? serverEnv.WHATSAPP_NOTIFICATION_API_URL;
  const token =
    dependencies.token ?? serverEnv.WHATSAPP_NOTIFICATION_API_TOKEN;
  const fetcher = dependencies.fetcher ?? fetch;
  const text = message.text.trim();
  const phone = normalizePhoneNumber(message.phone);

  if (!url || !token) {
    throw new WhatsAppNotificationError(
      "API de notificacao do WhatsApp nao configurada.",
    );
  }

  if (!text) {
    throw new WhatsAppNotificationError(
      "O texto da notificacao deve ser preenchido.",
    );
  }

  if (phone.length < 8 || phone.length > 15) {
    throw new WhatsAppNotificationError(
      "Numero do bot invalido para notificacao.",
    );
  }

  let response: Response;

  try {
    response = await fetcher(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, phone }),
      signal: AbortSignal.timeout(WHATSAPP_NOTIFICATION_TIMEOUT_MS),
    });
  } catch {
    throw new WhatsAppNotificationError(
      "Falha de rede ao enviar notificacao do WhatsApp.",
    );
  }

  if (!response.ok) {
    throw new WhatsAppNotificationError(
      `API de notificacao respondeu com status ${response.status}.`,
    );
  }
}

export {
  WHATSAPP_NOTIFICATION_TIMEOUT_MS,
  WhatsAppNotificationError,
  sendWhatsAppApiMessage,
  type WhatsAppApiMessage,
};
