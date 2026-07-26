'use client'

import React, { useEffect, useState } from 'react'
import {
    useQrCode, atualizarPrompt, pegarPrompt,
    getIaAtividade, atualizarAtividadeIa,
    desconectar
} from '../../hooks/useConfiguracoes'
import QRCode from 'react-qr-code'
import InternalLoading from '../InternalLoading'
import { toast } from 'react-toastify'

type ModalProps = {
    setModalOpen: any;
};

export default function Modal({ setModalOpen }: ModalProps) {
    const [loading, setLoading] = useState(true)
    const { qrCode, getQrCode, conectado } = useQrCode()
    const [promptAntesAtt, setPromptAntesAtt] = useState('')
    const [prompt, setPrompt] = useState('')
    const [iaAtiva, setIaAtiva] = useState(false)

    useEffect(() => {
        const fetch = async () => {
            setLoading(true)
            const atividade = await getIaAtividade()
            setIaAtiva(atividade)

            const res = await pegarPrompt()
            setPromptAntesAtt(res || '')
            setPrompt(res || '')

            await getQrCode('BAiLEYS')
            setLoading(false)
        }
        fetch()
    }, [])

    const attPrompt = async () => {
        setLoading(true)
        await atualizarPrompt(prompt)
        setPromptAntesAtt(prompt)
        setLoading(false)
    }

    const alterarIaAtiva = async (check: boolean) => {
        await atualizarAtividadeIa(check)
        setIaAtiva(check)
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(prompt)
        toast.success('Prompt copiado!')
    }

    return (
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/8 bg-[#111111]"
            >
                <div className="flex items-center justify-between border-b border-white/6 px-8 py-6">
                    <div className="space-y-1">
                        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#5a5754]">
                            Bot e seguranca
                        </p>
                        <h1 className="text-xl font-medium text-[#f0ede8]">
                            Configuracoes essenciais
                        </h1>
                    </div>

                    <button
                        onClick={() => setModalOpen(false)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl transition duration-200 hover:bg-[#181818]"
                    >
                        <span className="material-symbols-outlined text-[#a09d98]">
                            close
                        </span>
                    </button>
                </div>

                <div className="flex-1 space-y-8 overflow-y-auto p-8 no-scrollbar">
                    <section className="space-y-4">
                        <h2 className="text-sm uppercase tracking-wider text-[#a09d98]">
                            Automacao
                        </h2>

                        <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-[#171717] p-6">
                            <div>
                                <p className="text-sm font-medium text-[#f0ede8]">
                                    IA Ativa
                                </p>
                                <p className="text-xs text-[#a09d98]">
                                    Liga ou pausa as respostas automaticas do bot.
                                </p>
                            </div>

                            <button
                                onClick={() => alterarIaAtiva(!iaAtiva)}
                                className={`flex h-7 w-14 items-center rounded-full px-1 transition duration-200 ${iaAtiva ? 'justify-end bg-[#c96442]' : 'justify-start bg-[#2a2a2a]'}`}
                            >
                                <div className="h-5 w-5 rounded-full bg-[#f0ede8]"></div>
                            </button>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm uppercase tracking-wider text-[#a09d98]">
                                Prompt do bot
                            </h2>

                            <button
                                onClick={copyToClipboard}
                                className="rounded-full border border-white/8 bg-[#181818] px-3 py-2 text-xs text-[#f0ede8] transition duration-200 hover:border-white/14"
                            >
                                Copiar
                            </button>
                        </div>

                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="min-h-[250px] w-full rounded-2xl border border-white/8 bg-[#171717] p-5 text-sm text-[#f0ede8] outline-none transition duration-200 focus:border-[#c96442]"
                        />

                        {prompt !== promptAntesAtt && (
                            <button
                                onClick={attPrompt}
                                className="w-full rounded-2xl bg-[#c96442] py-3 font-medium text-white transition duration-200 hover:bg-[#d4714f]"
                            >
                                Salvar alteracoes
                            </button>
                        )}
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-sm uppercase tracking-wider text-[#a09d98]">
                            Conexao e seguranca
                        </h2>

                        <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/8 bg-[#171717] p-6">
                            {conectado ? (
                                <>
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/15">
                                        <span className="material-symbols-outlined text-3xl text-green-300">
                                            check_circle
                                        </span>
                                    </div>
                                    <p className="font-medium text-green-300">
                                        Conectado
                                    </p>
                                    <p className="text-center text-xs text-[#a09d98]">
                                        A instancia do WhatsApp esta online e apta para operacao.
                                    </p>
                                    <button
                                        onClick={async () => await desconectar()}
                                        className="rounded-full bg-[#c45c5c] px-4 py-2 text-sm text-white transition duration-200 hover:opacity-90"
                                    >
                                        Desconectar
                                    </button>
                                </>
                            ) : (
                                qrCode ? (
                                    <>
                                        <div className="rounded-2xl bg-white p-4">
                                            <QRCode value={qrCode} size={200} />
                                        </div>
                                        <p className="text-center text-xs text-[#a09d98]">
                                            Escaneie o QR Code para revalidar a conexao do bot.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-sm text-[#a09d98]">
                                            Gerando QR Code...
                                        </p>
                                        <button
                                            onClick={async () => await getQrCode('BAiLEYS')}
                                            className="rounded-full border border-white/8 bg-[#181818] px-4 py-2 text-sm text-[#f0ede8] transition duration-200 hover:border-white/14"
                                        >
                                            Atualizar status
                                        </button>
                                    </>
                                )
                            )}
                        </div>
                    </section>
                </div>

                {loading && <InternalLoading />}
            </div>
        </div>
    )
}
