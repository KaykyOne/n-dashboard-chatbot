import fs from 'fs/promises';
import prisma from '../../prisma/prisma.js';

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

        console.log("teste do usuario")
        console.log(test);

        
        return test;
    }

    async function getAllUsers() {
        const users = await prisma.usuarios.findMany({
            where: { ia_ativa: true, ativo: true }
        });
        return users;
    }

    return {
        getAtividade,
        getAllUsers
    };
}
