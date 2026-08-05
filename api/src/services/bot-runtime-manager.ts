import type { Usuario } from "../types/usuario.js";

class BotRuntimeManager {
    private readonly runtimes = new Map<number, Usuario>();
    private readonly operations = new Map<number, Promise<unknown>>();

    get(usuarioId: number) {
        return this.runtimes.get(usuarioId);
    }

    list() {
        return [...this.runtimes.values()];
    }

    register(runtime: Usuario) {
        this.runtimes.set(runtime.id, runtime);
        return runtime;
    }

    remove(usuarioId: number, expectedRuntime?: Usuario) {
        if (
            expectedRuntime
            && this.runtimes.get(usuarioId) !== expectedRuntime
        ) {
            return false;
        }

        return this.runtimes.delete(usuarioId);
    }

    async runExclusive<T>(
        usuarioId: number,
        operation: () => Promise<T>
    ): Promise<T> {
        const previousOperation = this.operations.get(usuarioId)
            ?? Promise.resolve();
        const currentOperation = previousOperation
            .catch(() => undefined)
            .then(operation);

        this.operations.set(usuarioId, currentOperation);

        try {
            return await currentOperation;
        } finally {
            if (this.operations.get(usuarioId) === currentOperation) {
                this.operations.delete(usuarioId);
            }
        }
    }
}

const botRuntimeManager = new BotRuntimeManager();

export { BotRuntimeManager, botRuntimeManager };
