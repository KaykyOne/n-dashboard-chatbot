import assert from "node:assert/strict";
import test from "node:test";
import {
  WhatsAppNotificationError,
  sendWhatsAppApiMessage,
} from "../services/whatsapp-notification.service.js";

test("envia alerta com bearer e body padrao para a API configurada", async () => {
  let receivedUrl = "";
  let receivedInit: RequestInit | undefined;
  const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
    receivedUrl = String(url);
    receivedInit = init;
    return new Response(null, { status: 204 });
  };

  await sendWhatsAppApiMessage(
    {
      text: "teste webhook",
      phone: "+55 (17) 99741-9297",
    },
    {
      fetcher: fetcher as typeof fetch,
      token: "token-de-teste",
      url: "https://example.com/whatsapp",
    },
  );

  assert.equal(receivedUrl, "https://example.com/whatsapp");
  assert.deepEqual(receivedInit?.headers, {
    Authorization: "Bearer token-de-teste",
    "Content-Type": "application/json",
  });
  assert.deepEqual(JSON.parse(String(receivedInit?.body)), {
    text: "teste webhook",
    phone: "5517997419297",
  });
});

test("falha de forma controlada quando URL ou token nao estao configurados", async () => {
  await assert.rejects(
    () => sendWhatsAppApiMessage(
      { text: "alerta", phone: "5517997419297" },
      { token: "", url: "" },
    ),
    (error: unknown) => error instanceof WhatsAppNotificationError,
  );
});
