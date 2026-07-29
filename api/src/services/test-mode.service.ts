import prisma from "../../prisma/prisma.js";
import { normalizeTestPhoneNumber } from "../funcs/test-mode.js";

class TestModeServiceError extends Error {
    constructor(
        message: string,
        readonly statusCode: number
    ) {
        super(message);
        this.name = "TestModeServiceError";
    }
}

async function ensureUserExists(userId: number) {
    const user = await prisma.usuarios.findUnique({
        where: { id: userId },
        select: { id: true }
    });

    if (!user) {
        throw new TestModeServiceError("Usuario nao encontrado.", 404);
    }
}

async function getTestMode(userId: number) {
    const user = await prisma.usuarios.findUnique({
        where: { id: userId },
        select: { modo_teste: true }
    });

    if (!user) {
        throw new TestModeServiceError("Usuario nao encontrado.", 404);
    }

    return user.modo_teste;
}

async function updateTestMode(userId: number, enabled: boolean) {
    await ensureUserExists(userId);

    const user = await prisma.usuarios.update({
        where: { id: userId },
        data: { modo_teste: enabled },
        select: { modo_teste: true }
    });

    return user.modo_teste;
}

async function listTestNumbers(userId: number) {
    await ensureUserExists(userId);

    return prisma.numerosTeste.findMany({
        where: { cliente_id: userId },
        select: {
            id: true,
            numero: true,
            created_at: true
        },
        orderBy: { created_at: "asc" }
    });
}

async function addTestNumber(userId: number, phoneNumber: string) {
    const number = normalizeTestPhoneNumber(phoneNumber);

    if (number.length < 8 || number.length > 15) {
        throw new TestModeServiceError(
            "Numero invalido. Informe DDI e telefone usando somente digitos.",
            400
        );
    }

    await ensureUserExists(userId);

    try {
        return await prisma.numerosTeste.create({
            data: {
                cliente_id: userId,
                numero: number
            },
            select: {
                id: true,
                numero: true,
                created_at: true
            }
        });
    } catch (error) {
        if ((error as { code?: string }).code === "P2002") {
            throw new TestModeServiceError("Este numero ja esta cadastrado.", 409);
        }

        throw error;
    }
}

async function removeTestNumber(userId: number, testNumberId: number) {
    const result = await prisma.numerosTeste.deleteMany({
        where: {
            id: testNumberId,
            cliente_id: userId
        }
    });

    if (result.count === 0) {
        throw new TestModeServiceError("Numero de teste nao encontrado.", 404);
    }
}

export {
    TestModeServiceError,
    addTestNumber,
    getTestMode,
    listTestNumbers,
    removeTestNumber,
    updateTestMode
};
