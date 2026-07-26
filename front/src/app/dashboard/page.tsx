import React from 'react'

export default function DashboardPage() {
  return (
    <main className="hidden md:flex flex-1 border-l border-white/6">
      <div className="flex w-full items-center justify-center px-10">
        <div className="max-w-md space-y-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#5a5754]">
            Painel Operacional
          </p>
          <h1 className="text-3xl font-medium text-[#f0ede8]">
            Selecione uma conversa para operar o bot.
          </h1>
          <p className="text-sm leading-6 text-[#a09d98]">
            A coluna lateral concentra os leads. As configuracoes do bot, conexao do WhatsApp e controles sensiveis continuam disponiveis no menu de ajustes.
          </p>
        </div>
      </div>
    </main>
  )
}
