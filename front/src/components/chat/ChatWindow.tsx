'use client'
import React, { useState, useEffect } from 'react'
import { Lead } from '../../models/lead'
import { selectHistory } from '../../hooks/useLead'
import { motion } from 'framer-motion'
import { formatNumber } from '../../utils/formats'
import { Historico } from '../../models'

type ChatWindowProps = {
  lead: Lead
  onClose: () => void
}

export default function ChatWindow({ lead, onClose }: ChatWindowProps) {
  const [mensagens, setMensagens] = useState<Historico[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const historico: Historico[] = await selectHistory(lead.id)
      console.log(historico);
      setMensagens(historico || [])
      setLoading(false)
    }
    fetch()
  }, [lead.id])

  const formatMessageDate = (value?: string | Date) => {
    if (!value) return null

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-1 flex-col border-l border-white/6 bg-[#111111]"
    >
      <div className="flex items-center justify-between border-b border-white/6 px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#c96442]/18 text-sm font-medium text-[#f0ede8]">
            {lead.numero?.slice(-2)}
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-medium text-[#f0ede8]">
              {formatNumber(lead.numero)}
            </h2>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/8 px-2 py-1 text-[11px] text-[#a09d98]">
                {lead.interesse || 'Sem interesse definido'}
              </span>
              <span className={`rounded-full border px-2 py-1 text-[11px] ${lead.ativo ? 'border-green-500/20 text-green-300' : 'border-white/8 text-[#5a5754]'}`}>
                {lead.ativo ? 'Lead ativo' : 'Lead inativo'}
              </span>
              <span className={`rounded-full border px-2 py-1 text-[11px] ${lead.ia_ativa ? 'border-[#c96442]/30 text-[#f0b39c]' : 'border-white/8 text-[#5a5754]'}`}>
                {lead.ia_ativa ? 'IA ligada' : 'IA desligada'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="rounded-xl p-2 transition duration-200 hover:bg-[#181818]"
        >
          <span className="material-symbols-outlined text-[#a09d98]">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 no-scrollbar">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-[#5a5754]">
            Carregando conversa...
          </div>
        ) : mensagens.length > 0 ? (
          mensagens.map((msg, idx) => (
            <div className={`${(msg.autor).toLocaleLowerCase().includes('lead') ? 'justify-start' : 'justify-end'} w-full flex`} key={idx} >
              <article className="mb-4 rounded-2xl border max-w-[700px] border-white/6 bg-[#171717] p-4">
                <div className="mb-2 flex items-center justify-between gap-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#a09d98]">
                    {msg.autor}
                  </p>
                  {formatMessageDate(msg.criado_em) && (
                    <span className="text-xs text-[#5a5754]">
                      {formatMessageDate(msg.criado_em)}
                    </span>
                  )}
                </div>
                <div className="whitespace-pre-wrap text-sm leading-6 text-[#f0ede8]">
                  {msg.mensagem}
                </div>
              </article>
            </div>
          ))
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[#5a5754]">
            Nenhum historico encontrado para este lead.
          </div>
        )}
      </div>
    </motion.div>
  )
}
