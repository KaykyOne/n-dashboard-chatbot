'use client'

type AdmBotControlsProps = {
  refreshing: boolean
  onRefresh: () => void
  onStartAllBots: () => void
}

export default function AdmBotControls({ refreshing, onRefresh, onStartAllBots }: AdmBotControlsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={onStartAllBots}
        disabled={refreshing}
        className="inline-flex items-center justify-center rounded-2xl bg-[#c96442] px-5 py-3 text-sm font-medium text-white transition duration-200 hover:bg-[#d4714f] disabled:cursor-not-allowed disabled:opacity-60"
      >
        Ligar bot
      </button>

      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="inline-flex items-center justify-center rounded-2xl border border-white/8 bg-[#171717] px-5 py-3 text-sm font-medium text-[#f0ede8] transition duration-200 hover:border-white/14 hover:bg-[#1b1b1b] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {refreshing ? 'Atualizando...' : 'Atualizar painel'}
      </button>
    </div>
  )
}