import type { Usuario } from "./usuario";
import type { Historico } from "./historico";
import type { Mensagem } from "./mensagem";

export interface Lead {
  id: number;
  cliente?: Usuario;
  cliente_id: number;
  numero: string;
  qualidade?: string | null;
  ia_ativa: boolean;
  interesse?: string | null;
  ativo: boolean;
  created_at: Date;
  updated_at: Date;
  historicos?: Historico[];
  mensagens?: Mensagem[];
}

export default Lead;