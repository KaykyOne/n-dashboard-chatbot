import assert from "node:assert/strict";
import test from "node:test";
import type { Usuario } from "../types/usuario.js";
import { BotRuntimeManager } from "../services/bot-runtime-manager.js";

const createRuntime = (id: number): Usuario => ({
    id,
    ativado: true,
    cliente: null,
    provider: "BAILEYS",
    qrCode: null,
    status: "CONNECTING"
});

test("mantem um runtime independente para cada usuario", () => {
    const manager = new BotRuntimeManager();
    const firstRuntime = createRuntime(1);
    const secondRuntime = createRuntime(2);

    manager.register(firstRuntime);
    manager.register(secondRuntime);
    manager.remove(1, firstRuntime);

    assert.equal(manager.get(1), undefined);
    assert.equal(manager.get(2), secondRuntime);
    assert.deepEqual(manager.list(), [secondRuntime]);
});

test("serializa start e disconnect do mesmo usuario sem bloquear os demais", async () => {
    const manager = new BotRuntimeManager();
    const events: string[] = [];
    let releaseFirstOperation: (() => void) | undefined;

    const firstOperation = manager.runExclusive(1, async () => {
        events.push("start-1");
        await new Promise<void>((resolve) => {
            releaseFirstOperation = resolve;
        });
        events.push("end-1");
    });
    const queuedOperation = manager.runExclusive(1, async () => {
        events.push("start-2");
    });
    const otherUserOperation = manager.runExclusive(2, async () => {
        events.push("other-user");
    });

    await otherUserOperation;
    assert.deepEqual(events, ["start-1", "other-user"]);

    releaseFirstOperation?.();
    await Promise.all([firstOperation, queuedOperation]);

    assert.deepEqual(events, ["start-1", "other-user", "end-1", "start-2"]);
});
