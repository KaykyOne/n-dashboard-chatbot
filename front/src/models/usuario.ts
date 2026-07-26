import type { WhatsappInstance } from "./whatsappInstance";
import type { Lead } from "./lead";
import type { Mensagem } from "./mensagem";

export interface Usuario {
  id: number;
  created_at: Date;
  email: string;
  senha: string;
  plano?: string | null;
  limite_atendimentos: number;
  ativo: boolean;
  ia_ativa: boolean;
  prompt?: string | null;
  whatsappInstances?: WhatsappInstance[];
  leads?: Lead[];
  mensagens?: Mensagem[];
}

export default Usuario;
