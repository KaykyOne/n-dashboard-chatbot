export interface AdmLead {
  id: number
  cliente_id: number
  numero: string
  qualidade: string | null
  ativo: boolean
  ia_ativa: boolean
  created_at: string
  updated_at: string
}

export interface AdmWhatsappInstance {
  id: number
  cliente_id: number
  provider: string
  status: string
  created_at: string
  updated_at: string
}

export interface AdmUser {
  id: number
  created_at: string
  email: string
  senha: string
  plano: string | null
  limite_atendimentos: number
  ativo: boolean
  ia_ativa: boolean
  prompt: string | null
}

export interface NewAdmUserPayload {
  email: string
  senha: string
  plano: string
  limiteAtendimentos: number
  ativo: boolean
  iaAtiva: boolean
  prompt: string
}