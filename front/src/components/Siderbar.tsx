import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Lead } from '../models/lead'
import RenderContact from './chat/renderContact'
import { useRouter, usePathname } from 'next/navigation'

type SiderbarProps = {
  leads: Lead[];
  setLead: (lead: Lead | undefined) => void;
  setModalOpen: (open: boolean) => void;
  activeLeadId?: number;
}

export default function Siderbar({ leads, setLead, setModalOpen, activeLeadId }: SiderbarProps) {
  const [filtro, setFiltro] = useState(0)
  const [filtroNumero, setFiltroNumero] = useState('')
  const [expanded, setExpanded] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const filtros = ['todos', 'fria', 'quente', 'finalizada']

  let leadsFiltradas = filtro !== 0
    ? leads?.filter(item => (item.qualidade)?.toLocaleLowerCase() === filtros[filtro])
    : leads

  leadsFiltradas = filtroNumero
    ? leadsFiltradas.filter(item => item.numero.includes(filtroNumero))
    : leadsFiltradas

  const totalAtivos = leads.filter(item => item.ativo).length
  const dashboardAtivo = pathname === '/dashboard' || pathname === '/dashboard/'
  const railButtonBase = 'flex h-10 w-10 items-center justify-center rounded-xl border text-sm transition duration-200'

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="flex h-screen shrink-0"
    >
      <div className="flex flex-col items-center gap-4 border-r border-white/6 bg-[#101010] px-4 py-6">
        <button
          onClick={() => {
            setLead(undefined)
            router.push('/dashboard')
          }}
          className={`${railButtonBase} ${dashboardAtivo ? 'border-[#c96442]/40 bg-[#c96442]/12 text-[#f0ede8]' : 'border-white/8 bg-[#181818] text-[#a09d98] hover:border-white/14 hover:text-[#f0ede8]'}`}
          title="Conversas"
        >
          <span className="material-symbols-outlined text-[20px]">forum</span>
        </button>

        <button
          onClick={() => setModalOpen(true)}
          className={`${railButtonBase} border-white/8 bg-[#181818] text-[#a09d98] hover:border-white/14 hover:text-[#f0ede8]`}
          title="Configuracoes"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
        </button>

        <div className="mt-auto" />

        <button
          className={`${railButtonBase} border-white/8 bg-[#181818] text-[#a09d98] hover:border-[#c45c5c]/30 hover:text-[#c45c5c]`}
          onClick={() => router.push('/login')}
          title="Sair"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
        </button>
      </div>

      <motion.div
        animate={{ width: expanded ? 380 : 0, opacity: expanded ? 1 : 0 }}
        transition={{ duration: 0.28, ease: 'easeInOut' }}
        className="overflow-hidden border-r border-white/6 bg-[#121212]"
      >
        <div className="flex h-full w-[380px] flex-col">
          <div className="border-b border-white/6 px-6 py-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#5a5754]">
              Gestao do Bot
            </p>
            <div className="mt-3 space-y-1">
              <h1 className="text-[22px] font-medium text-[#f0ede8]">
                Conversas
              </h1>
              <p className="text-sm text-[#a09d98]">
                {totalAtivos} ativos de {leads.length} leads carregados
              </p>
            </div>
          </div>

          <div className="border-b border-white/6 px-6 py-5">
            <input
              type="text"
              placeholder="Filtrar por numero"
              value={filtroNumero}
              onChange={(e) => setFiltroNumero(e.target.value)}
              className="w-full rounded-xl border border-white/8 bg-[#181818] px-4 py-3 text-sm text-[#f0ede8] outline-none transition duration-200 placeholder:text-[#5a5754] hover:border-white/14 focus:border-[#c96442]"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto border-b border-white/6 px-6 py-4 no-scrollbar">
            {filtros.map((item, index) => (
              <button
                key={index}
                onClick={() => setFiltro(index)}
                className={`rounded-full border px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em] transition duration-200 ${filtro === index
                    ? 'border-[#c96442]/40 bg-[#c96442]/12 text-[#f0ede8]'
                    : 'border-white/8 bg-[#181818] text-[#a09d98] hover:border-white/14 hover:text-[#f0ede8]'
                  }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            {leadsFiltradas.length > 0 ? (
              leadsFiltradas.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setLead(item)}
                >
                  <RenderContact lead={item} active={activeLeadId === item.id} />
                </div>
              ))
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[#5a5754]">
                Nenhuma conversa encontrada com os filtros atuais.
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <div className='w-[30px] h-screen flex items-center justify-center'>
        <button
          onClick={() => setExpanded((value) => !value)}
          className={` text-[#a09d98] hover:border-white/14 h-full w-full hover:text-[#f0ede8] cursor-pointer`}
          title={expanded ? 'Retrair sidebar' : 'Expandir sidebar'}
          aria-label={expanded ? 'Retrair sidebar' : 'Expandir sidebar'}
        >
          <span className="material-symbols-outlined text-[20px]">
            {expanded ? 'keyboard_double_arrow_left' : 'keyboard_double_arrow_right'}
          </span>
        </button>
      </div>
    </motion.div>
  )
}
