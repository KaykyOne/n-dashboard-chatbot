type WhatsAppMessageKey = {
  fromMe?: boolean | null;
  participant?: string | null;
  participantAlt?: string | null;
  remoteJid?: string | null;
  remoteJidAlt?: string | null;
};

type ResolvePhoneNumberOptions = {
  contextParticipant?: string | null;
  getPhoneJidForLid?: (lid: string) => Promise<string | null>;
};

const PHONE_JID_SUFFIXES = ["@s.whatsapp.net", "@c.us"];

function phoneNumberFromJid(jid?: string | null) {
  if (!jid || !PHONE_JID_SUFFIXES.some((suffix) => jid.endsWith(suffix))) {
    return null;
  }

  const number = jid.split("@")[0].replace(/\D/g, "");
  return number.length >= 8 && number.length <= 15 ? number : null;
}

function getPhoneNumberVariants(phoneNumber: string) {
  const normalized = phoneNumber.replace(/\D/g, "");
  const variants = new Set([normalized]);

  if (normalized.startsWith("55")) {
    if (normalized.length === 13 && normalized[4] === "9") {
      variants.add(`${normalized.slice(0, 4)}${normalized.slice(5)}`);
    } else if (normalized.length === 12) {
      variants.add(`${normalized.slice(0, 4)}9${normalized.slice(4)}`);
    }
  }

  return [...variants].filter((number) => number.length >= 8 && number.length <= 15);
}

async function resolvePhoneNumber(
  key: WhatsAppMessageKey,
  options: ResolvePhoneNumberOptions = {}
) {
  const directCandidates = key.fromMe
    ? [key.remoteJidAlt, key.remoteJid]
    : [
        key.participantAlt,
        key.remoteJidAlt,
        options.contextParticipant,
        key.participant,
        key.remoteJid
      ];

  for (const candidate of directCandidates) {
    const phoneNumber = phoneNumberFromJid(candidate);

    if (phoneNumber) {
      return phoneNumber;
    }
  }

  if (!options.getPhoneJidForLid) {
    return null;
  }

  const lidCandidates = directCandidates.filter(
    (candidate): candidate is string => Boolean(candidate?.endsWith("@lid"))
  );

  for (const lid of lidCandidates) {
    const mappedPhoneJid = await options.getPhoneJidForLid(lid);
    const phoneNumber = phoneNumberFromJid(mappedPhoneJid);

    if (phoneNumber) {
      return phoneNumber;
    }
  }

  return null;
}

export {
  getPhoneNumberVariants,
  phoneNumberFromJid,
  resolvePhoneNumber,
  type ResolvePhoneNumberOptions,
  type WhatsAppMessageKey
};
