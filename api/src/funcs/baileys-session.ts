import fs from "fs";
import path from "path";

const DEFAULT_BAILEYS_SESSIONS_ROOT = path.resolve(
  process.cwd(),
  "src",
  "bots",
  "baileys",
  "sessions",
);

function getBaileysSessionPath(
  usuarioId: number,
  sessionsRoot = DEFAULT_BAILEYS_SESSIONS_ROOT,
) {
  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    throw new Error("Id de usuario invalido para sessao do Baileys.");
  }

  return path.resolve(sessionsRoot, `bot-baileys-${usuarioId}`);
}

function removeBaileysSessionDirectory(
  usuarioId: number,
  sessionPath: string,
  sessionsRoot = DEFAULT_BAILEYS_SESSIONS_ROOT,
) {
  const resolvedRoot = path.resolve(sessionsRoot);
  const expectedPath = getBaileysSessionPath(usuarioId, resolvedRoot);
  const resolvedSessionPath = path.resolve(sessionPath);

  if (
    resolvedSessionPath !== expectedPath
    || !resolvedSessionPath.startsWith(`${resolvedRoot}${path.sep}`)
  ) {
    throw new Error("Caminho de sessao do Baileys fora do diretorio permitido.");
  }

  if (!fs.existsSync(resolvedSessionPath)) {
    return false;
  }

  fs.rmSync(resolvedSessionPath, { recursive: true, force: true });
  return true;
}

export {
  DEFAULT_BAILEYS_SESSIONS_ROOT,
  getBaileysSessionPath,
  removeBaileysSessionDirectory,
};
