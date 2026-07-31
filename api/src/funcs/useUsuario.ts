import prisma from '../../prisma/prisma.js';
import {
    isTestMessageAllowed,
    normalizeTestPhoneNumber
} from './test-mode.js';
import { getPhoneNumberVariants } from './whatsapp-address.js';

export default function useUsuario() {
    async function getAtividade(usuario_id?: number, telefone?: string, lead_id?: number) {

        // console.log('Verificando atividade para usuário:', usuario_id, 'e telefone:', telefone);

        if (!usuario_id || !telefone) return false;
        const testUsuario = await prisma.usuarios.findFirst({
            where: { id: usuario_id },
            select: { ia_ativa: true, ativo: true }
        });
        // console.log('Teste usuário:', testUsuario ? true : false);

        const testLead = await prisma.leads.findFirst({
            where: { numero: telefone, cliente_id: usuario_id },
            select: { ia_ativa: true }
        });

        // console.log(testLead?.ia_ativa);
        // console.log('Teste lead:', testLead ? true : false);
        let test = false;
        if(lead_id){
            test = (testLead?.ia_ativa && testUsuario?.ia_ativa && testUsuario?.ativo) || false;
        }else {
            test = (testUsuario?.ia_ativa && testUsuario?.ativo) || false;
        }

        return test;
    }

    async function getAllUsers() {
        const users = await prisma.usuarios.findMany({
            where: {
                ia_ativa: true,
                ativo: true
            }
        });
        return users;
    }

    async function podeReceberMensagem(usuarioId: number, telefone: string) {
        const numero = normalizeTestPhoneNumber(telefone);
        const configuracao = await prisma.usuarios.findUnique({
            where: { id: usuarioId },
            select: { modo_teste: true }
        });

        if (!configuracao) {
            return false;
        }

        if (!configuracao.modo_teste) {
            return isTestMessageAllowed(false, false);
        }

        const numeroCadastrado = await prisma.numerosTeste.findFirst({
            where: {
                cliente_id: usuarioId,
                numero: { in: getPhoneNumberVariants(numero) }
            },
            select: { id: true }
        });

        return isTestMessageAllowed(true, Boolean(numeroCadastrado));
    }

    return {
        getAtividade,
        getAllUsers,
        podeReceberMensagem
    };
}
