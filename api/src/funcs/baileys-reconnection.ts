const MAX_BAILEYS_RECONNECTION_ATTEMPTS = 5;
const BAILEYS_CONNECTION_STABILITY_MS = 30_000;

type ReconnectionDecision =
  | { action: "stop" }
  | { action: "notify-and-disconnect"; completedAttempts: number }
  | { action: "reconnect"; attempt: number };

function getReconnectionDecision(
  completedAttempts: number | undefined,
  shouldReconnect: boolean,
  active: boolean,
): ReconnectionDecision {
  if (!active || !shouldReconnect) {
    return { action: "stop" };
  }

  const attempts = completedAttempts ?? 0;

  if (attempts >= MAX_BAILEYS_RECONNECTION_ATTEMPTS) {
    return {
      action: "notify-and-disconnect",
      completedAttempts: attempts,
    };
  }

  return {
    action: "reconnect",
    attempt: attempts + 1,
  };
}

function getBotPhoneNumber(...candidates: Array<string | null | undefined>) {
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const phone = candidate.split(":")[0].replace(/\D/g, "");

    if (phone.length >= 8 && phone.length <= 15) {
      return phone;
    }
  }

  return null;
}

export {
  BAILEYS_CONNECTION_STABILITY_MS,
  MAX_BAILEYS_RECONNECTION_ATTEMPTS,
  getBotPhoneNumber,
  getReconnectionDecision,
  type ReconnectionDecision,
};
