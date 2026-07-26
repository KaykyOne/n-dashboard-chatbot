'use client'
import { useState } from "react";
import { supabase } from "./supabase";
import { toast } from "react-toastify";

const useQrCode = () => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [conectado, setConectado] = useState<boolean>(false);

  const getQrCode = async (tipo: string) => {
    const usuario_id = localStorage.getItem('id_do_usuario');

    const { data, error } = await supabase
      .from('WhatsappInstances')
      .select('qr_code, status')
      .eq('cliente_id', usuario_id)
      .eq('provider', tipo.toUpperCase())
      .single();

    if (!data) {
      await verificarConexao();
      return;
    }

    if (error) {
      console.error('Erro ao buscar QR Code:', error);
      return;
    }

    const qr_code = data?.qr_code || null;
    const test = data.status == "ONLINE" ? true : false
    setConectado(test);
    setQrCode(qr_code);
  };

  const verificarConexao = async () => {
    const usuario_id = localStorage.getItem('id_do_usuario');

    const { data, error } = await supabase
      .from('WhatsappInstances')
      .select('qr_code')
      .eq('cliente_id', usuario_id)
      .eq('status', 'ONLINE')
      .single();

    if (error) {
      console.error('Erro ao verificar conexao:', error);
      return;
    }

    setConectado(!!data);
  }

  return { qrCode, conectado, getQrCode };
}

const desconectar = async () => {
  toast.info("Desconectando, aguarde um momento...");
  const usuario_id = localStorage.getItem('id_do_usuario');

  const res = await fetch(`${process.env.NEXT_PUBLIC_URL}/disconnect/${usuario_id}`);
  const response = await res.json();
  if (!res.ok) {
    toast.error("Erro ao desconectar!");
    return;
  }

  toast.success(response.message);
}

const conectar = async () => {
  const usuario_id = localStorage.getItem('id_do_usuario');

  const res = await fetch(`${process.env.NEXT_PUBLIC_URL}/start/${usuario_id}`);
  const response = await res.json();
  if (!res.ok) {
    toast.error("Erro ao solicitar nova conexao!");
    return;
  }

  toast.success(response.message);
}

const pegarHistorico = async (lead_id: number) => {
  const { data, error } = await supabase
    .from('Historico')
    .select('*')
    .eq('lead_id', lead_id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao buscar historico:', error);
    toast.error('Erro ao buscar historico');
    return [];
  }
  return data;
}

const pegarPrompt = async () => {
  const usuario_id = localStorage.getItem('id_do_usuario');

  const { data, error } = await supabase
    .from('Usuarios')
    .select('prompt')
    .eq('id', usuario_id)
    .single();

  if (error) {
    console.error('Erro ao buscar prompt:', error);
    toast.error('Erro ao buscar prompt');
    return null;
  }
  return data?.prompt || null;
}

const atualizarPrompt = async (prompt: string) => {
  const usuario_id = localStorage.getItem('id_do_usuario');

  const { data, error } = await supabase
    .from('Usuarios')
    .update({ prompt })
    .eq('id', usuario_id);
  if (error) {
    console.error('Erro ao atualizar prompt:', error);
    toast.error('Erro ao atualizar prompt');
    return null;
  }
  return data;
}

const atualizarAtividadeIa = async (ativo: boolean) => {
  const usuario_id = localStorage.getItem('id_do_usuario');

  const { data, error } = await supabase
    .from('Usuarios')
    .update({ ia_ativa: ativo })
    .eq('id', usuario_id);
  if (error) {
    console.error('Erro ao atualizar atividade da IA:', error);
    toast.error('Erro ao atualizar atividade da IA');
    return null;
  }
  toast.success('Atividade da IA atualizada com sucesso');
  return data;
}

const getIaAtividade = async () => {
  const usuario_id = localStorage.getItem('id_do_usuario');

  const { data } = await supabase
    .from('Usuarios')
    .select('ia_ativa')
    .eq('id', usuario_id)
    .single();

  return data?.ia_ativa || false;
}

export {
  useQrCode,
  pegarHistorico,
  pegarPrompt,
  atualizarPrompt,
  getIaAtividade,
  atualizarAtividadeIa,
  desconectar,
  conectar
};
