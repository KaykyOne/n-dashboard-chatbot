import type { Lead } from "./lead";
import { Autor } from "./enums";

export interface Historico {
  id: number;
  lead?: Lead;
  lead_id: number;
  mensagem: string;
  autor: Autor;
  tokens_usados?: number | null;
  criado_em: Date;
}

export default Historico;
