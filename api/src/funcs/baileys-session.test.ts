import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  getBaileysSessionPath,
  removeBaileysSessionDirectory,
} from "./baileys-session.js";

test("remove somente a pasta de sessao pertencente ao usuario", () => {
  const sessionsRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "botchat-baileys-sessions-"),
  );

  try {
    const userSession = getBaileysSessionPath(2, sessionsRoot);
    fs.mkdirSync(userSession, { recursive: true });
    fs.writeFileSync(path.join(userSession, "creds.json"), "{}");

    assert.equal(
      removeBaileysSessionDirectory(2, userSession, sessionsRoot),
      true,
    );
    assert.equal(fs.existsSync(userSession), false);
    assert.equal(
      removeBaileysSessionDirectory(2, userSession, sessionsRoot),
      false,
    );
  } finally {
    fs.rmSync(sessionsRoot, { recursive: true, force: true });
  }
});

test("recusa apagar outra pasta ou a raiz de sessoes", () => {
  const sessionsRoot = path.resolve(os.tmpdir(), "botchat-safe-session-root");

  assert.throws(
    () => removeBaileysSessionDirectory(2, sessionsRoot, sessionsRoot),
    /fora do diretorio permitido/,
  );
  assert.throws(
    () => removeBaileysSessionDirectory(
      2,
      path.resolve(sessionsRoot, "bot-baileys-3"),
      sessionsRoot,
    ),
    /fora do diretorio permitido/,
  );
});
