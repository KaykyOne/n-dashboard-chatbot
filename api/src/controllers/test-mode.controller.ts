import type { Request, Response } from "express";
import {
    TestModeServiceError,
    addTestNumber,
    getTestMode,
    listTestNumbers,
    removeTestNumber,
    updateTestMode
} from "../services/test-mode.service.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger({ module: "test-mode-controller" });

const getPositiveInteger = (value: unknown) => {
    if (Array.isArray(value)) {
        return null;
    }

    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const sendError = (
    res: Response,
    error: unknown,
    fallbackMessage: string
) => {
    if (error instanceof TestModeServiceError) {
        res.status(error.statusCode).send({ message: error.message });
        return;
    }

    res.status(500).send({ message: fallbackMessage });
};

const logRequestFailure = (
    context: Record<string, unknown>,
    error: unknown,
    message: string
) => {
    if (error instanceof TestModeServiceError) {
        logger.warn(
            { ...context, statusCode: error.statusCode },
            message
        );
        return;
    }

    logger.error({ ...context, error }, message);
};

async function testModeStatus(req: Request, res: Response) {
    const id = getPositiveInteger(req.params.id);

    if (!id) {
        res.status(400).send({ message: "Id de usuario invalido!" });
        return;
    }

    try {
        res.status(200).send({ enabled: await getTestMode(id) });
    } catch (error) {
        logRequestFailure({ usuarioId: id }, error, "Falha ao consultar modo teste");
        sendError(res, error, "Erro ao consultar o modo teste.");
    }
}

async function changeTestMode(req: Request, res: Response) {
    const id = getPositiveInteger(req.params.id);
    const enabled = req.body?.enabled;

    if (!id) {
        res.status(400).send({ message: "Id de usuario invalido!" });
        return;
    }

    if (typeof enabled !== "boolean") {
        res.status(400).send({ message: "O campo enabled deve ser booleano." });
        return;
    }

    try {
        res.status(200).send({ enabled: await updateTestMode(id, enabled) });
    } catch (error) {
        logRequestFailure({ usuarioId: id }, error, "Falha ao atualizar modo teste");
        sendError(res, error, "Erro ao atualizar o modo teste.");
    }
}

async function getTestNumbers(req: Request, res: Response) {
    const id = getPositiveInteger(req.params.id);

    if (!id) {
        res.status(400).send({ message: "Id de usuario invalido!" });
        return;
    }

    try {
        res.status(200).send({ numbers: await listTestNumbers(id) });
    } catch (error) {
        logRequestFailure({ usuarioId: id }, error, "Falha ao listar numeros de teste");
        sendError(res, error, "Erro ao listar numeros de teste.");
    }
}

async function createTestNumber(req: Request, res: Response) {
    const id = getPositiveInteger(req.params.id);
    const phoneNumber = String(req.body?.phoneNumber ?? "");

    if (!id) {
        res.status(400).send({ message: "Id de usuario invalido!" });
        return;
    }

    try {
        const number = await addTestNumber(id, phoneNumber);
        res.status(201).send({ number });
    } catch (error) {
        logRequestFailure({ usuarioId: id }, error, "Falha ao cadastrar numero de teste");
        sendError(res, error, "Erro ao cadastrar numero de teste.");
    }
}

async function deleteTestNumber(req: Request, res: Response) {
    const id = getPositiveInteger(req.params.id);
    const numberId = getPositiveInteger(req.params.numberId);

    if (!id || !numberId) {
        res.status(400).send({ message: "Id invalido!" });
        return;
    }

    try {
        await removeTestNumber(id, numberId);
        res.status(200).send({ message: "Numero de teste removido." });
    } catch (error) {
        logRequestFailure(
            { usuarioId: id, numeroTesteId: numberId },
            error,
            "Erro ao remover numero de teste"
        );
        sendError(res, error, "Erro ao remover numero de teste.");
    }
}

export {
    changeTestMode,
    createTestNumber,
    deleteTestNumber,
    getTestNumbers,
    testModeStatus
};
