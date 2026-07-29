import assert from "node:assert/strict";
import test from "node:test";
import {
  isTestMessageAllowed,
  normalizeTestPhoneNumber
} from "./test-mode.js";

test("normaliza numero de teste para somente digitos", () => {
  assert.equal(
    normalizeTestPhoneNumber("+55 (11) 99999-9999"),
    "5511999999999"
  );
});

test("modo normal aceita qualquer numero", () => {
  assert.equal(isTestMessageAllowed(false, false), true);
});

test("modo teste aceita somente numero cadastrado", () => {
  assert.equal(isTestMessageAllowed(true, true), true);
  assert.equal(isTestMessageAllowed(true, false), false);
});
