import React from 'react'
import { Lead } from '../../models'
import { formatNumber } from '../../utils/formats'
import { format, subDays } from 'date-fns'

function getQualityLabel(qualidade: string | null | undefined) {
    if (!qualidade) return 'sem triagem'
    return qualidade
}

export default function RenderContact({ lead, active = false }: { lead: Lead, active?: boolean }) {
    function getQualityStyle(qualidade: string | null | undefined) {
        if (!qualidade) return 'bg-[#2a2a2a] text-[#a09d98]'

        switch ((qualidade || '').toLowerCase()) {
            case 'fria':
                return 'bg-blue-500/15 text-blue-300'
            case 'quente':
                return 'bg-[#c96442]/18 text-[#f0b39c]'
            case 'finalizada':
                return 'bg-green-500/15 text-green-300'
            default:
                return 'bg-[#2a2a2a] text-[#a09d98]'
        }
    }

    function formatUpdateAt(date: Date) {
        const ontem = subDays(new Date(), 1)
        const anteontem = subDays(new Date(), 2)
        if (Number.isNaN(date.getTime())) return 'Data invalida'
        if (date > ontem) return format(date, 'HH:mm')
        if (date > anteontem) return format(date, 'dd/MM/yyyy HH:mm')
        return format(date, 'dd/MM/yyyy')
    }

    const updatedAt = formatUpdateAt(new Date(lead.updated_at))

    return (
        <div className={`w-full border-b border-white/6 px-6 py-4 transition duration-200 ${active ? 'bg-[#181411]' : 'hover:bg-[#171717]'}`}>
            <div className="flex items-center gap-4">
                <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-sm font-medium ${getQualityStyle(lead.qualidade)}`}>
                    {lead.numero?.slice(-2)}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-4">
                        <p className="truncate text-sm font-medium text-[#f0ede8]">
                            {formatNumber(lead.numero)}
                        </p>
                        <span className="flex-shrink-0 text-xs text-[#5a5754]">
                            {updatedAt}
                        </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-[#a09d98]">
                        {lead.interesse || 'Sem interesse definido'}
                    </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <span className="rounded-full border border-white/8 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[#a09d98]">
                        {getQualityLabel(lead.qualidade)}
                    </span>
                    <span className={`text-[11px] ${lead.ativo ? 'text-green-300' : 'text-[#5a5754]'}`}>
                        {lead.ativo ? 'ativo' : 'inativo'}
                    </span>
                </div>
            </div>
        </div>
    )
}
