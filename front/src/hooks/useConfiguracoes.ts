'use client'
import { useCallback, useState } from "react";
import { supabase } from "./supabase";
import { toast } from "react-toastify";

type ConnectionStatus = "OFFLINE" | "CONNECTING" | "ONLINE" | "ERROR";

type NumeroTeste = {
  id: number;
  numero: string;
  created_at: string;
};

type ConnectionState = {
  connected: boolean;
  initialized: boolean;
  provider: "BAILEYS";
  qrCode: string | null;
  status: ConnectionStatus;
};

const getBotApiUrl = () => {
  const apiUrl = (process.env.NEXT_PUBLIC_URL || "").replace(/\/$/, "");

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_URL nao configurada.");
  }

  return apiUrl.endsWith("/bot") ? apiUrl : `${apiUrl}/bot`;
};

const getUsuarioId = () => {
  const usuarioId = localStorage.getItem("id_do_usuario");

  if (!usuarioId) {
    throw new Error("Usuario nao identificado.");
  }

  return usuarioId;
};

const getResponseBody = async (response: Response) => {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.message || "Erro ao comunicar com a API do bot.");
  }

  return body;
};

const useQrCode = () => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [conectado, setConectado] = useState<boolean>(false);
  const [status, setStatus] = useState<ConnectionStatus>("OFFLINE");
  const [inicializado, setInicializado] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const applyConnectionState = useCallback((state: ConnectionState) => {
    setConectado(state.connected);
    setInicializado(state.initialized);
    setStatus(state.status);
    setQrCode(state.connected ? null : state.qrCode);

    if (state.connected) {
      setPairingCode(null);
    }
  }, []);

  const getQrCode = useCallback(async () => {
    try {
      const usuarioId = getUsuarioId();
      const response = await fetch(`${getBotApiUrl()}/qrcode/${usuarioId}`, {
        cache: "no-store"
      });
      const data = await getResponseBody(response) as ConnectionState;

      applyConnectionState(data);
      setConnectionError(null);
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao consultar conexao.";
      setConnectionError(message);
      console.error("Erro ao buscar QR Code na API:", error);
      return null;
    }
  }, [applyConnectionState]);

  const conectar = useCallback(async () => {
    try {
      const usuarioId = getUsuarioId();
      const response = await fetch(`${getBotApiUrl()}/start/${usuarioId}`);
      await getResponseBody(response);
      setInicializado(true);
      setStatus("CONNECTING");
      setConnectionError(null);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao iniciar conexao.";
      setConnectionError(message);
      console.error("Erro ao iniciar conexao do WhatsApp:", error);
      return false;
    }
  }, []);

  const desconectar = useCallback(async () => {
    toast.info("Desconectando, aguarde um momento...");

    try {
      const usuarioId = getUsuarioId();
      const response = await fetch(`${getBotApiUrl()}/disconnect/${usuarioId}`);
      const data = await getResponseBody(response);

      setConectado(false);
      setInicializado(false);
      setStatus("OFFLINE");
      setQrCode(null);
      setPairingCode(null);
      setConnectionError(null);
      toast.success(data.message);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao desconectar.";
      setConnectionError(message);
      toast.error(message);
      return false;
    }
  }, []);

  const gerarCodigoPareamento = useCallback(async (phoneNumber: string) => {
    try {
      const usuarioId = getUsuarioId();
      const response = await fetch(`${getBotApiUrl()}/pairing-code/${usuarioId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ phoneNumber })
      });
      const data = await getResponseBody(response);

      setPairingCode(data.pairingCode);
      setInicializado(true);
      setStatus("CONNECTING");
      setConnectionError(null);
      return data.pairingCode as string;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao gerar codigo.";
      setConnectionError(message);
      toast.error(message);
      return null;
    }
  }, []);

  return {
    conectado,
    conectar,
    connectionError,
    desconectar,
    gerarCodigoPareamento,
    getQrCode,
    inicializado,
    pairingCode,
    qrCode,
    status
  };
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

const getModoTeste = async () => {
  try {
    const usuarioId = getUsuarioId();
    const response = await fetch(`${getBotApiUrl()}/test-mode/${usuarioId}`, {
      cache: "no-store"
    });
    const data = await getResponseBody(response);

    return Boolean(data.enabled);
  } catch (error) {
    console.error("Erro ao buscar modo teste:", error);
    toast.error("Erro ao carregar o modo teste");
    return false;
  }
};

const atualizarModoTeste = async (ativo: boolean) => {
  try {
    const usuarioId = getUsuarioId();
    const response = await fetch(`${getBotApiUrl()}/test-mode/${usuarioId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ enabled: ativo })
    });
    await getResponseBody(response);

    toast.success(ativo ? "Modo teste ativado" : "Modo teste desativado");
    return true;
  } catch (error) {
    console.error("Erro ao atualizar modo teste:", error);
    toast.error(error instanceof Error ? error.message : "Erro ao atualizar o modo teste");
    return false;
  }
};

const listarNumerosTeste = async (): Promise<NumeroTeste[]> => {
  try {
    const usuarioId = getUsuarioId();
    const response = await fetch(`${getBotApiUrl()}/test-numbers/${usuarioId}`, {
      cache: "no-store"
    });
    const data = await getResponseBody(response);

    return (data.numbers || []) as NumeroTeste[];
  } catch (error) {
    console.error("Erro ao listar numeros de teste:", error);
    toast.error(error instanceof Error ? error.message : "Erro ao carregar numeros de teste");
    return [];
  }
};

const adicionarNumeroTeste = async (phoneNumber: string) => {
  const numero = phoneNumber.replace(/\D/g, "");

  if (numero.length < 8 || numero.length > 15) {
    toast.error("Informe o numero com DDI. Exemplo: 5511999999999");
    return null;
  }

  try {
    const usuarioId = getUsuarioId();
    const response = await fetch(`${getBotApiUrl()}/test-numbers/${usuarioId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ phoneNumber: numero })
    });
    const data = await getResponseBody(response);

    toast.success("Numero de teste adicionado");
    return data.number as NumeroTeste;
  } catch (error) {
    console.error("Erro ao adicionar numero de teste:", error);
    toast.error(error instanceof Error ? error.message : "Erro ao cadastrar numero de teste");
    return null;
  }
};

const removerNumeroTeste = async (id: number) => {
  try {
    const usuarioId = getUsuarioId();
    const response = await fetch(
      `${getBotApiUrl()}/test-numbers/${usuarioId}/${id}`,
      { method: "DELETE" }
    );
    await getResponseBody(response);

    toast.success("Numero de teste removido");
    return true;
  } catch (error) {
    console.error("Erro ao remover numero de teste:", error);
    toast.error(error instanceof Error ? error.message : "Erro ao remover numero de teste");
    return false;
  }
};

export {
  useQrCode,
  pegarHistorico,
  pegarPrompt,
  atualizarPrompt,
  getIaAtividade,
  atualizarAtividadeIa,
  adicionarNumeroTeste,
  atualizarModoTeste,
  getModoTeste,
  listarNumerosTeste,
  removerNumeroTeste,
  type NumeroTeste,
};
