import assert from "node:assert/strict";
import test from "node:test";
import {
  getPhoneNumberVariants,
  resolvePhoneNumber
} from "./whatsapp-address.js";

test("prioriza o PN alternativo quando o identificador principal e LID", async () => {
  const number = await resolvePhoneNumber({
    fromMe: false,
    participant: "123456789012345@lid",
    participantAlt: "5511999999999@s.whatsapp.net",
    remoteJid: "123456789012345@lid"
  });

  assert.equal(number, "5511999999999");
});

test("resolve LID pelo mapeamento do socket quando o PN alternativo nao veio", async () => {
  const number = await resolvePhoneNumber(
    {
      fromMe: false,
      remoteJid: "123456789012345@lid"
    },
    {
      getPhoneJidForLid: async (lid) => {
        assert.equal(lid, "123456789012345@lid");
        return "5511888888888@s.whatsapp.net";
      }
    }
  );

  assert.equal(number, "5511888888888");
});

test("mensagem enviada pela empresa identifica o destinatario, nao o proprio bot", async () => {
  const number = await resolvePhoneNumber({
    fromMe: true,
    remoteJid: "5511777777777@s.whatsapp.net"
  });

  assert.equal(number, "5511777777777");
});

test("compara numeros brasileiros com e sem o nono digito", () => {
  assert.deepEqual(
    getPhoneNumberVariants("5511999999999"),
    ["5511999999999", "551199999999"]
  );
  assert.deepEqual(
    getPhoneNumberVariants("551199999999"),
    ["551199999999", "5511999999999"]
  );
});
