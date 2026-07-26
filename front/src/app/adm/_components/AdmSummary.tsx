type AdmSummaryProps = {
  totalUsers: number
  activeUsers: number
  totalLeads: number
  onlineBots: number
}

function SummaryCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <article className="rounded-3xl border border-white/8 bg-[#111111] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8a8782]">{label}</p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <strong className="text-3xl font-medium text-[#f0ede8]">{value}</strong>
        <span className="rounded-full border border-white/8 bg-[#171717] px-3 py-2 text-xs text-[#a09d98]">
          {hint}
        </span>
      </div>
    </article>
  )
}

export default function AdmSummary({ totalUsers, activeUsers, totalLeads, onlineBots }: AdmSummaryProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SummaryCard label="Usuarios cadastrados" value={totalUsers} hint="Contas na base" />
      <SummaryCard label="Usuarios ativos" value={activeUsers} hint="Disponiveis para o bot" />
      <SummaryCard label="Leads totais" value={totalLeads} hint="Distribuidos por cliente" />
      <SummaryCard label="Bots online" value={onlineBots} hint="Instancias conectadas" />
    </section>
  )
}