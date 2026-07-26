'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { supabase } from '../../hooks/supabase'
import AdmBotControls from './_components/AdmBotControls'
import AdmSummary from './_components/AdmSummary'
import AdmUserForm from './_components/AdmUserForm'
import AdmUserList from './_components/AdmUserList'
import type {
  AdmLead,
  AdmUser,
  AdmWhatsappInstance,
  NewAdmUserPayload,
} from './_components/types'

const BOT_API_URL = (process.env.NEXT_PUBLIC_URL || '').replace(/\/$/, '')

export default function Page() {
  const [users, setUsers] = useState<AdmUser[]>([])
  const [leads, setLeads] = useState<AdmLead[]>([])
  const [instances, setInstances] = useState<AdmWhatsappInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [savingUser, setSavingUser] = useState(false)
  const [busyUserId, setBusyUserId] = useState<number | null>(null)
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null)

  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users])

  const leadsByUser = useMemo(() => {
    return leads.reduce<Record<number, AdmLead[]>>((accumulator, lead) => {
      if (!accumulator[lead.cliente_id]) {
        accumulator[lead.cliente_id] = []
      }

      accumulator[lead.cliente_id].push(lead)
      return accumulator
    }, {})
  }, [leads])

  const instancesByUser = useMemo(() => {
    return instances.reduce<Record<number, AdmWhatsappInstance[]>>((accumulator, instance) => {
      if (!accumulator[instance.cliente_id]) {
        accumulator[instance.cliente_id] = []
      }

      accumulator[instance.cliente_id].push(instance)
      return accumulator
    }, {})
  }, [instances])

  const totalLeads = leads.length
  const activeUsers = users.filter((user) => user.ativo).length
  const onlineBots = instances.filter((instance) => instance.status === 'ONLINE').length

  useEffect(() => {
    void loadAdminData()
  }, [])

  useEffect(() => {
    if (!expandedUserId && users.length > 0) {
      setExpandedUserId(users[0].id)
    }
  }, [expandedUserId, users])

  async function loadAdminData() {
    setLoading(true)

    try {
      const [usersResult, leadsResult, instancesResult] = await Promise.all([
        supabase
          .from('Usuarios')
          .select('id, created_at, email, senha, plano, limite_atendimentos, ativo, ia_ativa, prompt')
          .order('created_at', { ascending: false }),
        supabase
          .from('Leads')
          .select('id, cliente_id, numero, qualidade, ativo, ia_ativa, created_at, updated_at')
          .order('updated_at', { ascending: false }),
        supabase
          .from('WhatsappInstances')
          .select('id, cliente_id, provider, status, created_at, updated_at')
          .order('updated_at', { ascending: false }),
      ])

      if (usersResult.error) {
        toast.error('Erro ao carregar usuarios')
        console.error(usersResult.error)
      }

      if (leadsResult.error) {
        toast.error('Erro ao carregar leads')
        console.error(leadsResult.error)
      }

      if (instancesResult.error) {
        toast.error('Erro ao carregar instancias do WhatsApp')
        console.error(instancesResult.error)
      }

      setUsers((usersResult.data ?? []) as AdmUser[])
      setLeads((leadsResult.data ?? []) as AdmLead[])
      setInstances((instancesResult.data ?? []) as AdmWhatsappInstance[])
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await loadAdminData()
      toast.success('Painel atualizado')
    } finally {
      setRefreshing(false)
    }
  }

  async function handleStartAllBots() {
    if (!BOT_API_URL) {
      toast.error('NEXT_PUBLIC_URL nao configurada')
      return
    }

    try {
      setRefreshing(true)
      const response = await fetch(`${BOT_API_URL}/start-bot`)

      if (!response.ok) {
        throw new Error('Falha ao iniciar a rotina global')
      }

      toast.success('Rotina global do bot iniciada')
      await loadAdminData()
    } catch (error) {
      console.error(error)
      toast.error('Nao foi possivel iniciar o bot')
    } finally {
      setRefreshing(false)
    }
  }

  async function handleStartBot(user: AdmUser) {
    if (!BOT_API_URL) {
      toast.error('NEXT_PUBLIC_URL nao configurada')
      return
    }

    const primaryInstance = instancesByUser[user.id]?.[0]
    const provider = primaryInstance?.provider ? `?provider=${primaryInstance.provider}` : ''

    try {
      setBusyUserId(user.id)
      const response = await fetch(`${BOT_API_URL}/start/${user.id}`)
      console.log('Response do start bot:', response)

      if (!response.ok) {
        throw new Error('Falha ao ligar o bot')
      }

      toast.success(`Bot ligado para ${user.email}`)
      await loadAdminData()
    } catch (error) {
      console.error(error)
      toast.error('Nao foi possivel ligar o bot')
    } finally {
      setBusyUserId(null)
    }
  }

  async function handleStopBot(user: AdmUser) {
    if (!BOT_API_URL) {
      toast.error('NEXT_PUBLIC_URL nao configurada')
      return
    }

    try {
      setBusyUserId(user.id)
      const response = await fetch(`${BOT_API_URL}/disconnect/${user.id}`)

      if (!response.ok) {
        throw new Error('Falha ao desligar o bot')
      }

      toast.success(`Bot desligado para ${user.email}`)
      await loadAdminData()
    } catch (error) {
      console.error(error)
      toast.error('Nao foi possivel desligar o bot')
    } finally {
      setBusyUserId(null)
    }
  }

  async function handleCreateUser(payload: NewAdmUserPayload) {
    setSavingUser(true)

    const { error } = await supabase.from('Usuarios').insert([
      {
        email: payload.email,
        senha: payload.senha,
        plano: payload.plano || null,
        limite_atendimentos: payload.limiteAtendimentos,
        ativo: payload.ativo,
        ia_ativa: payload.iaAtiva,
        prompt: payload.prompt || null,
      },
    ])

    setSavingUser(false)

    if (error) {
      console.error(error)
      toast.error('Erro ao cadastrar usuario')
      return false
    }

    toast.success('Usuario cadastrado com sucesso')
    await loadAdminData()
    return true
  }

  const selectedUser = expandedUserId ? usersById.get(expandedUserId) : undefined

  return (
    <main className="min-h-screen bg-[#0d0d0d] px-6 py-8 text-[#f0ede8] lg:px-8">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
        <header className="rounded-3xl border border-white/8 bg-[#111111] px-6 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] lg:px-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8a8782]">
            Painel de Administracao
          </p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <h1 className="text-3xl font-medium text-[#f0ede8] lg:text-4xl">
                Controle de bots, usuarios e leads em um unico lugar.
              </h1>
              <p className="max-w-xl text-sm leading-6 text-[#a09d98]">
                Ligue e desligue as sessoes do WhatsApp, cadastre novos usuarios e acompanhe os leads de cada conta sem sair do painel.
              </p>
            </div>

            <AdmBotControls
              refreshing={refreshing}
              onRefresh={handleRefresh}
              onStartAllBots={handleStartAllBots}
            />
          </div>
        </header>

        <AdmSummary
          totalUsers={users.length}
          activeUsers={activeUsers}
          totalLeads={totalLeads}
          onlineBots={onlineBots}
        />

        <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <AdmUserForm onSubmit={handleCreateUser} submitting={savingUser} />

          <div className="rounded-3xl border border-white/8 bg-[#111111] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] lg:p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8a8782]">
                  Usuarios e leads
                </p>
                <h2 className="mt-2 text-2xl font-medium text-[#f0ede8]">
                  Visualizacao por usuario
                </h2>
              </div>

              <div className="rounded-2xl border border-white/8 bg-[#171717] px-4 py-3 text-sm text-[#a09d98]">
                {selectedUser ? (
                  <>
                    Usuario selecionado: <span className="text-[#f0ede8]">{selectedUser.email}</span>
                  </>
                ) : (
                  'Selecione um usuario para detalhar os leads.'
                )}
              </div>
            </div>

            <AdmUserList
              users={users}
              leadsByUser={leadsByUser}
              instancesByUser={instancesByUser}
              expandedUserId={expandedUserId}
              onToggleUser={(userId) => setExpandedUserId((current) => (current === userId ? null : userId))}
              onStartBot={handleStartBot}
              onStopBot={handleStopBot}
              busyUserId={busyUserId}
            />

            {users.length === 0 && !loading ? (
              <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#141414] text-sm text-[#5a5754]">
                Nenhum usuario encontrado.
              </div>
            ) : null}

          </div>
        </section>
      </div>
    </main>
  )
}
