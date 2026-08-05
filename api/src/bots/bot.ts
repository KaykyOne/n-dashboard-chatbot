import { Usuarios } from "../../generated/prisma/client";
import Funcoes from "../funcs/useUsuario";
import {
    getBotRuntimes,
    startBot as startManagedBot
} from "../services/bot.service";
import { createLogger } from "../utils/logger";

let iniciado = false;
const logger = createLogger({ module: "bot-bootstrap" });

const startBot = async () => {
    const search: Usuarios[] = await Funcoes().getAllUsers();
    const scopedLogger = createLogger({ module: "bot-bootstrap", provider: "BAILEYS" });

    if (search.length <= 0) {
        scopedLogger.warn("Nenhum bot encontrado para iniciar");
        return;
    }

    const resultados = await Promise.allSettled(
        search.map(async (usuario) => {
            scopedLogger.info({ usuarioId: usuario.id }, "Iniciando cliente do usuario");
            return startManagedBot(usuario.id);
        })
    );

    resultados.forEach((resultado, index) => {
        const usuario = search[index];

        if (resultado.status === "fulfilled") {
            scopedLogger.info({ usuarioId: usuario?.id }, "Cliente inicializado");
            return;
        }

        scopedLogger.error({ usuarioId: usuario?.id, err: resultado.reason }, "Falha ao inicializar cliente");
    });

    scopedLogger.info({ totalUsuarios: search.length }, "Rotina global de inicializacao concluida");
    iniciado = true;
};

setInterval(() => {
    if (!iniciado) return;

    const runtimes = getBotRuntimes();
    const ativos = runtimes.filter((user) => user.ativado === true);

    if (ativos.length === 0) {
        logger.error("Todos os usuarios foram desligados");
    } else {
        logger.debug(
            { ativos: ativos.length, registrados: runtimes.length },
            "Resumo periodico de runtimes"
        );
    }
}, 10000);

export default startBot;
