'use client'

import type { AdmLead, AdmUser, AdmWhatsappInstance } from './types'

type AdmUserListProps = {
  users: AdmUser[]
  leadsByUser: Record<number, AdmLead[]>
  instancesByUser: Record<number, AdmWhatsappInstance[]>
  expandedUserId: number | null
  onToggleUser: (userId: number) => void
  onStartBot: (user: AdmUser) => void
  onStopBot: (user: AdmUser) => void
  busyUserId: number | null
}

function getPrimaryInstance(instances: AdmWhatsappInstance[] | undefined) {
  if (!instances || instances.length === 0) {
    return undefined
  }

  return instances.find((instance) => instance.status === 'ONLINE') ?? instances[0]
}

function getStatusLabel(instance?: AdmWhatsappInstance) {
  if (!instance) {
    return { label: 'Sem instancia', tone: 'border-white/8 bg-[#181818] text-[#a09d98]' }
  }

  const tones: Record<string, string> = {
    ONLINE: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    CONNECTING: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    ERROR: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
    OFFLINE: 'border-white/8 bg-[#181818] text-[#a09d98]',
  }

  return {
    label: instance.status,
    tone: tones[instance.status] ?? tones.OFFLINE,
  }
}

export default function AdmUserList({
  users,
  leadsByUser,
  instancesByUser,
  expandedUserId,
  onToggleUser,
  onStartBot,
  onStopBot,
  busyUserId,
}: AdmUserListProps) {
  if (users.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {users.map((user) => {
        const userLeads = leadsByUser[user.id] ?? []
        const userInstance = getPrimaryInstance(instancesByUser[user.id])
        const status = getStatusLabel(userInstance)
        const isExpanded = expandedUserId === user.id
        const isBusy = busyUserId === user.id

        return (
          <article key={user.id} className="overflow-hidden rounded-3xl border border-white/8 bg-[#141414]">
            <button
              type="button"
              onClick={() => onToggleUser(user.id)}
              className="flex w-full items-start justify-between gap-4 px-5 py-5 text-left transition duration-200 hover:bg-white/[0.02] lg:px-6"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-medium text-[#f0ede8]">{user.email}</h3>
                  <span className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] ${status.tone}`}>
                    {status.label}
                  </span>
                  <span className="rounded-full border border-white/8 bg-[#181818] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[#a09d98]">
                    {user.plano || 'sem plano'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 text-sm text-[#a09d98]">
                  <span>{userLeads.length} leads</span>
                  <span>•</span>
                  <span>{user.limite_atendimentos} limite</span>
                  <span>•</span>
                  <span>{user.ia_ativa ? 'IA ligada' : 'IA desligada'}</span>
                  <span>•</span>
                  <span>{user.ativo ? 'usuario ativo' : 'usuario inativo'}</span>
                </div>
              </div>

              <span className="rounded-full border border-white/8 bg-[#181818] px-3 py-2 text-xs text-[#a09d98]">
                {isExpanded ? 'Recolher' : 'Ver leads'}
              </span>
            </button>

            <div className="border-t border-white/8 px-5 py-5 lg:px-6">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => onStartBot(user)}
                  disabled={isBusy}
                  className="rounded-2xl bg-[#c96442] px-4 py-2 text-sm font-medium text-white transition duration-200 hover:bg-[#d4714f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Ligar bot
                </button>
                <button
                  type="button"
                  onClick={() => onStopBot(user)}
                  disabled={isBusy}
                  className="rounded-2xl border border-white/8 bg-[#171717] px-4 py-2 text-sm font-medium text-[#f0ede8] transition duration-200 hover:border-white/14 hover:bg-[#1b1b1b] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Desligar bot
                </button>
              </div>

              {isExpanded ? (
                <div className="mt-5 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <InfoCard label="Id" value={user.id} />
                    <InfoCard label="Criado em" value={formatDate(user.created_at)} />
                    <InfoCard label="Instancia" value={userInstance ? userInstance.provider : 'sem instancia'} />
                    <InfoCard label="Status" value={userInstance ? userInstance.status : 'offline'} />
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-[#111111] p-4">
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <h4 className="text-sm font-medium uppercase tracking-[0.16em] text-[#8a8782]">
                        Leads do usuario
                      </h4>
                      <span className="rounded-full border border-white/8 bg-[#181818] px-3 py-1 text-xs text-[#a09d98]">
                        {userLeads.length} registros
                      </span>
                    </div>

                    {userLeads.length > 0 ? (
                      <div className="space-y-2">
                        {userLeads.map((lead) => (
                          <div
                            key={lead.id}
                            className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-[#171717] px-4 py-3 text-sm text-[#f0ede8] md:flex-row md:items-center md:justify-between"
                          >
                            <div>
                              <div className="font-medium">{lead.numero}</div>
                              <div className="text-xs text-[#a09d98]">
                                {lead.qualidade || 'sem qualidade'} • {lead.ia_ativa ? 'IA ativa' : 'IA inativa'} • {lead.ativo ? 'ativo' : 'inativo'}
                              </div>
                            </div>
                            <span className="rounded-full border border-white/8 bg-[#181818] px-3 py-1 text-xs text-[#a09d98]">
                              #{lead.id}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-[#141414] px-4 py-6 text-sm text-[#5a5754]">
                        Nenhum lead registrado para este usuario.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#171717] px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8a8782]">{label}</div>
      <div className="mt-2 text-sm text-[#f0ede8]">{value}</div>
    </div>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}