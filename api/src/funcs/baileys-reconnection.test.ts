import assert from "node:assert/strict";
import test from "node:test";
import {
  BAILEYS_CONNECTION_STABILITY_MS,
  MAX_BAILEYS_RECONNECTION_ATTEMPTS,
  getBotPhoneNumber,
  getReconnectionDecision,
} from "./baileys-reconnection.js";

test("exige janela de estabilidade antes de zerar as tentativas", () => {
  assert.equal(BAILEYS_CONNECTION_STABILITY_MS, 30_000);
});

test("mantem cinco reconexoes e desconecta depois da quinta falha", () => {
  for (
    let completedAttempts = 0;
    completedAttempts < MAX_BAILEYS_RECONNECTION_ATTEMPTS;
    completedAttempts += 1
  ) {
    assert.deepEqual(
      getReconnectionDecision(completedAttempts, true, true),
      { action: "reconnect", attempt: completedAttempts + 1 },
    );
  }

  assert.deepEqual(
    getReconnectionDecision(5, true, true),
    { action: "notify-and-disconnect", completedAttempts: 5 },
  );
});

test("nao reconecta quando houve logout ou o cliente foi desativado", () => {
  assert.deepEqual(
    getReconnectionDecision(0, false, true),
    { action: "stop" },
  );
  assert.deepEqual(
    getReconnectionDecision(0, true, false),
    { action: "stop" },
  );
});

test("extrai sempre o numero do proprio bot das credenciais do Baileys", () => {
  assert.equal(
    getBotPhoneNumber("5517997419297:12@s.whatsapp.net"),
    "5517997419297",
  );
  assert.equal(
    getBotPhoneNumber(undefined, "5511999999999@s.whatsapp.net"),
    "5511999999999",
  );
  assert.equal(getBotPhoneNumber("id-invalido"), null);
});
