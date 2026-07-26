import type { Usuario } from "./usuario";
import type { Lead } from "./lead";

export interface Mensagem {
  id: number;
  origem?: Usuario;
  origem_id: number;
  destino?: Lead;
  destino_id: number;
  conteudo: string;
  enviado_por_ia: boolean;
  criado_em: Date;
}

export default Mensagem;
