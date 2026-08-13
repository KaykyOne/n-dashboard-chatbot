import { serverEnv } from "../env.js";

export const baileysConfig = {
    messageDebounceMs: serverEnv.BOT_MESSAGE_DEBOUNCE_MS,
    typingDelayMs: serverEnv.BOT_TYPING_DELAY_MS,
    partDelayMs: serverEnv.BOT_PART_DELAY_MS,
    maxMessageAgeSeconds: serverEnv.BOT_MAX_MESSAGE_AGE_SECONDS
} as const;

class BaileysContext {
    private readonly pendingMessages = new Map<string, string>();
    private readonly pendingMessageTimeouts = new Map<string, NodeJS.Timeout>();
    private readonly connectionStabilityTimeouts = new Map<number, NodeJS.Timeout>();

    appendPendingMessage(queueKey: string, text: string) {
        const currentMessage = this.pendingMessages.get(queueKey);

        this.pendingMessages.set(
            queueKey,
            currentMessage ? `${currentMessage}\n${text}` : text
        );

        this.clearPendingMessageTimeout(queueKey);
    }

    schedulePendingMessage(
        queueKey: string,
        callback: () => void,
        delayMs = baileysConfig.messageDebounceMs
    ) {
        this.clearPendingMessageTimeout(queueKey);

        const timeout = setTimeout(callback, delayMs);
        this.pendingMessageTimeouts.set(queueKey, timeout);
    }

    consumePendingMessages(queueKey: string) {
        const messages = this.pendingMessages.get(queueKey);

        this.pendingMessages.delete(queueKey);
        this.pendingMessageTimeouts.delete(queueKey);

        return messages;
    }

    clearPendingMessagesForUser(usuarioId: number) {
        const queuePrefix = `${usuarioId}:`;

        for (const queueKey of this.pendingMessageTimeouts.keys()) {
            if (!queueKey.startsWith(queuePrefix)) continue;

            this.clearPendingMessageTimeout(queueKey);
        }

        for (const queueKey of this.pendingMessages.keys()) {
            if (queueKey.startsWith(queuePrefix)) {
                this.pendingMessages.delete(queueKey);
            }
        }
    }

    scheduleConnectionStabilityCheck(
        usuarioId: number,
        callback: () => void,
        delayMs: number
    ) {
        this.clearConnectionStabilityTimeout(usuarioId);

        const timeout = setTimeout(() => {
            this.connectionStabilityTimeouts.delete(usuarioId);
            callback();
        }, delayMs);

        this.connectionStabilityTimeouts.set(usuarioId, timeout);
    }

    clearConnectionStabilityTimeout(usuarioId: number) {
        const timeout = this.connectionStabilityTimeouts.get(usuarioId);

        if (!timeout) return;

        clearTimeout(timeout);
        this.connectionStabilityTimeouts.delete(usuarioId);
    }

    private clearPendingMessageTimeout(queueKey: string) {
        const timeout = this.pendingMessageTimeouts.get(queueKey);

        if (!timeout) return;

        clearTimeout(timeout);
        this.pendingMessageTimeouts.delete(queueKey);
    }
}

export const baileysContext = new BaileysContext();