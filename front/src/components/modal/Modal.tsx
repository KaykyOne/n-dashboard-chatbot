'use client'

import React, { useEffect, useState } from 'react'
import {
    adicionarNumeroTeste, atualizarModoTeste, atualizarPrompt,
    getIaAtividade, getModoTeste, listarNumerosTeste, pegarPrompt,
    melhorarPrompt, removerNumeroTeste, useQrCode, atualizarAtividadeIa,
    type NumeroTeste
} from '../../hooks/useConfiguracoes'
import QRCode from 'react-qr-code'
import InternalLoading from '../InternalLoading'
import { toast } from 'react-toastify'

type ModalProps = {
    setModalOpen: (open: boolean) => void;
};

export default function Modal({ setModalOpen }: ModalProps) {
    const [loading, setLoading] = useState(true)
    const {
        conectado,
        conectar,
        connectionError,
        desconectar,
        gerarCodigoPareamento,
        getQrCode,
        inicializado,
        pairingCode,
        qrCode,
        status
    } = useQrCode()
    const [promptAntesAtt, setPromptAntesAtt] = useState('')
    const [prompt, setPrompt] = useState('')
    const [instrucaoMelhoria, setInstrucaoMelhoria] = useState('')
    const [melhorandoPrompt, setMelhorandoPrompt] = useState(false)
    const [iaAtiva, setIaAtiva] = useState(false)
    const [modoTeste, setModoTeste] = useState(false)
    const [numerosTeste, setNumerosTeste] = useState<NumeroTeste[]>([])
    const [novoNumeroTeste, setNovoNumeroTeste] = useState('')
    const [atualizandoModoTeste, setAtualizandoModoTeste] = useState(false)
    const [salvandoNumeroTeste, setSalvandoNumeroTeste] = useState(false)
    const [connectionMode, setConnectionMode] = useState<'qr' | 'code'>('qr')
    const [phoneNumber, setPhoneNumber] = useState('')
    const [requestingPairingCode, setRequestingPairingCode] = useState(false)

    useEffect(() => {
        let active = true

        const fetchConfig = async () => {
            setLoading(true)
            try {
                const [atividade, savedPrompt, testMode, testNumbers] = await Promise.all([
                    getIaAtividade(),
                    pegarPrompt(),
                    getModoTeste(),
                    listarNumerosTeste()
                ])

                if (!active) return

                setIaAtiva(atividade)
                setPromptAntesAtt(savedPrompt || '')
                setPrompt(savedPrompt || '')
                setModoTeste(testMode)
                setNumerosTeste(testNumbers)
            } finally {
                if (active) {
                    setLoading(false)
                }
            }
        }

        void fetchConfig()

        return () => {
            active = false
        }
    }, [])

    useEffect(() => {
        let active = true

        const initializeConnection = async () => {
            const currentState = await getQrCode()

            if (!active || currentState?.connected) return

            if (!currentState?.initialized) {
                await conectar()
            }

            if (active) {
                await getQrCode()
            }
        }

        void initializeConnection()

        return () => {
            active = false
        }
    }, [conectar, getQrCode])

    useEffect(() => {
        if (conectado) return

        const intervalId = window.setInterval(() => {
            void getQrCode()
        }, 5000)

        return () => {
            window.clearInterval(intervalId)
        }
    }, [conectado, getQrCode])

    const attPrompt = async () => {
        setLoading(true)
        await atualizarPrompt(prompt)
        setPromptAntesAtt(prompt)
        setLoading(false)
    }

    const solicitarMelhoriaPrompt = async () => {
        if (!prompt.trim()) {
            toast.error('Escreva o prompt atual antes de pedir uma melhoria.')
            return
        }

        setMelhorandoPrompt(true)
        const promptMelhorado = await melhorarPrompt(prompt, instrucaoMelhoria)

        if (promptMelhorado) {
            setPrompt(promptMelhorado)
            setInstrucaoMelhoria('')
            toast.success('Prompt melhorado. Revise o texto antes de salvar.')
        }

        setMelhorandoPrompt(false)
    }

    const alterarIaAtiva = async (check: boolean) => {
        await atualizarAtividadeIa(check)
        setIaAtiva(check)
    }

    const alterarModoTeste = async (ativo: boolean) => {
        setAtualizandoModoTeste(true)
        const atualizado = await atualizarModoTeste(ativo)

        if (atualizado) {
            setModoTeste(ativo)
        }

        setAtualizandoModoTeste(false)
    }

    const cadastrarNumeroTeste = async () => {
        if (!novoNumeroTeste) {
            toast.error('Informe o numero com DDI. Exemplo: 5511999999999')
            return
        }

        setSalvandoNumeroTeste(true)
        const numeroCadastrado = await adicionarNumeroTeste(novoNumeroTeste)

        if (numeroCadastrado) {
            setNumerosTeste((numerosAtuais) => [...numerosAtuais, numeroCadastrado])
            setNovoNumeroTeste('')
        }

        setSalvandoNumeroTeste(false)
    }

    const excluirNumeroTeste = async (id: number) => {
        const removido = await removerNumeroTeste(id)

        if (removido) {
            setNumerosTeste((numerosAtuais) =>
                numerosAtuais.filter((numero) => numero.id !== id)
            )
        }
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(prompt)
        toast.success('Prompt copiado!')
    }

    const requestPairingCode = async () => {
        if (phoneNumber.length < 8) {
            toast.error('Informe o numero com DDI. Exemplo: 5511999999999')
            return
        }

        setRequestingPairingCode(true)
        await gerarCodigoPareamento(phoneNumber)
        setRequestingPairingCode(false)
    }

    const reconnect = async () => {
        const started = await conectar()

        if (started) {
            await getQrCode()
        }
    }

    const formattedPairingCode = pairingCode
        ? pairingCode.replace(/[^a-zA-Z0-9]/g, '').match(/.{1,4}/g)?.join('-')
        : null

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
                        <div className="flex items-end justify-between gap-4">
                            <div className="space-y-1">
                                <h2 className="text-sm uppercase tracking-wider text-[#a09d98]">
                                    Ambiente de teste
                                </h2>
                                <p className="text-xs leading-5 text-[#6f6c68]">
                                    Restrinja as respostas do bot aos numeros autorizados abaixo.
                                </p>
                            </div>

                            <span className={`rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${
                                modoTeste
                                    ? 'border-amber-300/20 bg-amber-300/8 text-amber-200'
                                    : 'border-white/8 bg-[#171717] text-[#6f6c68]'
                            }`}>
                                {modoTeste ? 'Teste ativo' : 'Producao'}
                            </span>
                        </div>

                        <div className={`overflow-hidden rounded-2xl border transition duration-200 ${
                            modoTeste
                                ? 'border-amber-300/20 bg-amber-300/[0.035]'
                                : 'border-white/8 bg-[#171717]'
                        }`}>
                            <div className="flex items-center justify-between gap-5 p-6">
                                <div className="flex min-w-0 items-start gap-4">
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                        modoTeste
                                            ? 'bg-amber-300/10 text-amber-200'
                                            : 'bg-[#222222] text-[#77736f]'
                                    }`}>
                                        <span className="material-symbols-outlined text-xl">
                                            science
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-[#f0ede8]">
                                            Modo de teste
                                        </p>
                                        <p className="mt-1 max-w-lg text-xs leading-5 text-[#8a8782]">
                                            Quando ativo, mensagens de qualquer numero fora desta lista sao ignoradas pelo bot.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={modoTeste}
                                    aria-label="Ativar modo de teste"
                                    disabled={atualizandoModoTeste}
                                    onClick={() => void alterarModoTeste(!modoTeste)}
                                    className={`flex h-7 w-14 shrink-0 items-center rounded-full px-1 transition duration-200 disabled:cursor-wait disabled:opacity-60 ${
                                        modoTeste
                                            ? 'justify-end bg-amber-500'
                                            : 'justify-start bg-[#2a2a2a]'
                                    }`}
                                >
                                    <span className="h-5 w-5 rounded-full bg-[#f0ede8] shadow-sm" />
                                </button>
                            </div>

                            {modoTeste && numerosTeste.length === 0 ? (
                                <div className="mx-6 mb-5 flex items-start gap-3 rounded-xl border border-red-400/15 bg-red-400/5 px-4 py-3">
                                    <span className="material-symbols-outlined mt-0.5 text-base text-red-300">
                                        warning
                                    </span>
                                    <p className="text-xs leading-5 text-red-200">
                                        Nenhum numero autorizado. Enquanto a lista estiver vazia, todas as mensagens recebidas serao ignoradas.
                                    </p>
                                </div>
                            ) : null}

                            <div className="border-t border-white/6 p-6">
                                <label
                                    htmlFor="numero-teste"
                                    className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#77736f]"
                                >
                                    Novo numero autorizado
                                </label>

                                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                                    <div className="relative min-w-0 flex-1">
                                        <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-[#5a5754]">
                                            call
                                        </span>
                                        <input
                                            id="numero-teste"
                                            type="tel"
                                            inputMode="numeric"
                                            autoComplete="tel"
                                            value={novoNumeroTeste}
                                            onChange={(event) =>
                                                setNovoNumeroTeste(
                                                    event.target.value.replace(/\D/g, '').slice(0, 15)
                                                )
                                            }
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter') {
                                                    event.preventDefault()
                                                    void cadastrarNumeroTeste()
                                                }
                                            }}
                                            placeholder="5511999999999"
                                            className="w-full rounded-xl border border-white/8 bg-[#111111] py-3 pl-11 pr-4 text-sm text-[#f0ede8] outline-none transition placeholder:text-[#4f4c49] focus:border-amber-400/50"
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        disabled={salvandoNumeroTeste}
                                        onClick={() => void cadastrarNumeroTeste()}
                                        className="rounded-xl bg-[#f0ede8] px-5 py-3 text-sm font-medium text-[#171717] transition hover:bg-white disabled:cursor-wait disabled:opacity-60"
                                    >
                                        {salvandoNumeroTeste ? 'Adicionando...' : 'Adicionar numero'}
                                    </button>
                                </div>

                                <p className="mt-2 text-[11px] text-[#5f5b57]">
                                    Use somente digitos, incluindo o DDI e o DDD.
                                </p>

                                {numerosTeste.length > 0 ? (
                                    <div className="mt-5 space-y-2">
                                        {numerosTeste.map((numeroTeste) => (
                                            <div
                                                key={numeroTeste.id}
                                                className="group flex items-center justify-between gap-4 rounded-xl border border-white/6 bg-[#141414] px-4 py-3"
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-400/8">
                                                        <span className="material-symbols-outlined text-base text-green-300">
                                                            verified
                                                        </span>
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="truncate font-mono text-sm text-[#e2dfda]">
                                                            +{numeroTeste.numero}
                                                        </p>
                                                        <p className="text-[10px] uppercase tracking-[0.12em] text-[#5f5b57]">
                                                            Autorizado
                                                        </p>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    aria-label={`Remover numero ${numeroTeste.numero}`}
                                                    onClick={() => void excluirNumeroTeste(numeroTeste.id)}
                                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#6f6c68] transition hover:bg-red-400/8 hover:text-red-300"
                                                >
                                                    <span className="material-symbols-outlined text-lg">
                                                        delete
                                                    </span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mt-5 rounded-xl border border-dashed border-white/8 px-4 py-5 text-center">
                                        <p className="text-xs text-[#6f6c68]">
                                            Nenhum numero cadastrado.
                                        </p>
                                    </div>
                                )}
                            </div>
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

                        <div className="space-y-3 rounded-2xl border border-white/8 bg-[#171717] p-4">
                            <div className="flex items-center gap-2 text-xs text-[#a09d98]">
                                <span className="material-symbols-outlined text-base text-[#c96442]">
                                    auto_awesome
                                </span>
                                Diga o que voce quer melhorar
                            </div>

                            <div className="space-y-3">
                                <textarea
                                    value={instrucaoMelhoria}
                                    onChange={(event) => setInstrucaoMelhoria(event.target.value)}
                                    placeholder="Ex.: deixe mais claro, organize as regras e melhore o tom comercial"
                                    className="min-h-[180px] w-full resize-y rounded-2xl border border-white/8 bg-[#121212] p-5 text-sm leading-relaxed text-[#f0ede8] outline-none transition duration-200 placeholder:text-[#5a5754] focus:border-[#c96442]"
                                />

                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => void solicitarMelhoriaPrompt()}
                                        disabled={melhorandoPrompt || !prompt.trim()}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f0ede8] px-5 py-3 text-sm font-medium text-[#171717] transition duration-200 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                                        aria-label="Melhorar prompt com inteligencia artificial"
                                    >
                                        {melhorandoPrompt ? (
                                            <>
                                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#171717]/30 border-t-[#171717]" />
                                                Melhorando...
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-lg">
                                                    auto_awesome
                                                </span>
                                                Melhorar com IA
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <p className="text-xs leading-relaxed text-[#5a5754]">
                                A melhoria substitui apenas o texto acima. Revise o resultado e clique em salvar alteracoes para aplicar.
                            </p>
                        </div>

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
                        <div className="flex items-center justify-between gap-4">
                            <h2 className="text-sm uppercase tracking-wider text-[#a09d98]">
                                Conexao e seguranca
                            </h2>

                            <div className="flex items-center gap-2 rounded-full border border-white/8 bg-[#171717] px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-[#8a8782]">
                                <span className={`h-2 w-2 rounded-full ${conectado ? 'bg-green-400' : status === 'CONNECTING' ? 'animate-pulse bg-amber-300' : 'bg-[#5a5754]'}`} />
                                {conectado ? 'Online' : status === 'CONNECTING' ? 'Aguardando' : 'Offline'}
                            </div>
                        </div>

                        <div className="flex flex-col gap-5 rounded-2xl border border-white/8 bg-[#171717] p-6">
                            {conectado ? (
                                <div className="flex flex-col items-center gap-4 py-2">
                                    <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/15">
                                        <div className="absolute inset-0 animate-ping rounded-2xl bg-green-400/5" />
                                        <span className="material-symbols-outlined relative text-3xl text-green-300">
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
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/8 bg-[#111111] p-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setConnectionMode('qr')}
                                            className={`rounded-xl px-4 py-2.5 text-sm transition ${connectionMode === 'qr' ? 'bg-[#c96442] text-white' : 'text-[#8a8782] hover:text-[#f0ede8]'}`}
                                        >
                                            QR Code
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setConnectionMode('code')}
                                            className={`rounded-xl px-4 py-2.5 text-sm transition ${connectionMode === 'code' ? 'bg-[#c96442] text-white' : 'text-[#8a8782] hover:text-[#f0ede8]'}`}
                                        >
                                            Codigo pelo telefone
                                        </button>
                                    </div>

                                    {connectionMode === 'qr' ? (
                                        <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/10 bg-[#141414] p-6">
                                            {qrCode ? (
                                                <>
                                                    <div className="rounded-2xl bg-white p-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
                                                        <QRCode value={qrCode} size={200} />
                                                    </div>
                                                    <div className="max-w-sm space-y-1 text-center">
                                                        <p className="text-sm font-medium text-[#f0ede8]">
                                                            Escaneie com o WhatsApp
                                                        </p>
                                                        <p className="text-xs leading-5 text-[#a09d98]">
                                                            Abra Aparelhos conectados no celular e escaneie o codigo. Esta tela busca um QR novo na API a cada 5 segundos.
                                                        </p>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/15 bg-amber-300/8">
                                                        <span className="material-symbols-outlined animate-pulse text-2xl text-amber-200">
                                                            qr_code_2
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1 text-center">
                                                        <p className="text-sm font-medium text-[#f0ede8]">
                                                            {inicializado ? 'Aguardando um QR Code valido' : 'Bot ainda nao inicializado'}
                                                        </p>
                                                        <p className="text-xs text-[#8a8782]">
                                                            O status sera atualizado automaticamente.
                                                        </p>
                                                    </div>
                                                    {!inicializado || status === 'OFFLINE' ? (
                                                        <button
                                                            type="button"
                                                            onClick={reconnect}
                                                            className="rounded-full border border-white/8 bg-[#1c1c1c] px-4 py-2 text-sm text-[#f0ede8] transition hover:border-[#c96442]/50"
                                                        >
                                                            Iniciar conexao
                                                        </button>
                                                    ) : null}
                                                </>
                                            )}
                                        </div>
                                    ) : formattedPairingCode ? (
                                        <div className="space-y-5 rounded-2xl border border-[#c96442]/20 bg-[#c96442]/6 p-6">
                                            <div>
                                                <p className="text-[11px] uppercase tracking-[0.16em] text-[#c98b76]">
                                                    Codigo de pareamento
                                                </p>
                                                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                                    <p className="font-mono text-3xl tracking-[0.16em] text-[#f0ede8]">
                                                        {formattedPairingCode}
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            void navigator.clipboard.writeText(pairingCode || '')
                                                            toast.success('Codigo copiado!')
                                                        }}
                                                        className="rounded-full border border-white/10 px-3 py-2 text-xs text-[#f0ede8] transition hover:border-white/20"
                                                    >
                                                        Copiar
                                                    </button>
                                                </div>
                                            </div>

                                            <ol className="space-y-2 text-xs leading-5 text-[#a09d98]">
                                                <li>1. No WhatsApp, abra Aparelhos conectados.</li>
                                                <li>2. Toque em Conectar um aparelho e depois em Conectar com numero de telefone.</li>
                                                <li>3. Digite este codigo no WhatsApp. O painel reconhecera a conexao automaticamente.</li>
                                            </ol>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 rounded-2xl border border-dashed border-white/10 bg-[#141414] p-6">
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium text-[#f0ede8]">
                                                    Conectar sem camera
                                                </p>
                                                <p className="text-xs leading-5 text-[#8a8782]">
                                                    Informe o numero completo com DDI, somente digitos. O codigo gerado aqui sera digitado no WhatsApp.
                                                </p>
                                            </div>

                                            <div className="flex flex-col gap-3 sm:flex-row">
                                                <input
                                                    type="tel"
                                                    inputMode="numeric"
                                                    autoComplete="tel"
                                                    value={phoneNumber}
                                                    onChange={(event) => setPhoneNumber(event.target.value.replace(/\D/g, '').slice(0, 15))}
                                                    placeholder="5511999999999"
                                                    className="min-w-0 flex-1 rounded-xl border border-white/8 bg-[#1a1a1a] px-4 py-3 text-sm text-[#f0ede8] outline-none transition placeholder:text-[#5a5754] focus:border-[#c96442]"
                                                />
                                                <button
                                                    type="button"
                                                    disabled={requestingPairingCode}
                                                    onClick={requestPairingCode}
                                                    className="rounded-xl bg-[#c96442] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#d4714f] disabled:cursor-wait disabled:opacity-60"
                                                >
                                                    {requestingPairingCode ? 'Gerando...' : 'Gerar codigo'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {connectionError ? (
                                        <div className="flex items-start gap-3 rounded-xl border border-red-400/15 bg-red-400/5 px-4 py-3 text-xs leading-5 text-red-200">
                                            <span className="material-symbols-outlined mt-0.5 text-base">error</span>
                                            <span>{connectionError}</span>
                                        </div>
                                    ) : null}
                                </>
                            )}
                        </div>
                    </section>
                </div>

                {loading && <InternalLoading />}
            </div>
        </div>
    )
}
