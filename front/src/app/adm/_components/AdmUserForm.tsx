'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import type { NewAdmUserPayload } from './types'

type AdmUserFormProps = {
  onSubmit: (payload: NewAdmUserPayload) => Promise<boolean>
  submitting: boolean
}

const initialState = {
  email: '',
  senha: '',
  plano: '',
  limiteAtendimentos: '0',
  prompt: '',
  ativo: true,
  iaAtiva: true,
}

export default function AdmUserForm({ onSubmit, submitting }: AdmUserFormProps) {
  const [form, setForm] = useState(initialState)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const success = await onSubmit({
      email: form.email.trim(),
      senha: form.senha,
      plano: form.plano.trim(),
      limiteAtendimentos: Number(form.limiteAtendimentos) || 0,
      prompt: form.prompt.trim(),
      ativo: form.ativo,
      iaAtiva: form.iaAtiva,
    })

    if (success) {
      setForm(initialState)
    }
  }

  return (
    <section className="rounded-3xl border border-white/8 bg-[#111111] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] lg:p-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8a8782]">Cadastro rapido</p>
      <h2 className="mt-2 text-2xl font-medium text-[#f0ede8]">Novo usuario</h2>
      <p className="mt-2 text-sm leading-6 text-[#a09d98]">
        Crie uma conta para liberar o acesso ao painel e ao bot.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Email"
            value={form.email}
            onChange={(value) => setForm((current) => ({ ...current, email: value }))}
            placeholder="novo.usuario@empresa.com"
            type="email"
          />
          <Field
            label="Senha"
            value={form.senha}
            onChange={(value) => setForm((current) => ({ ...current, senha: value }))}
            placeholder="senha segura"
            type="password"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Plano"
            value={form.plano}
            onChange={(value) => setForm((current) => ({ ...current, plano: value }))}
            placeholder="pro, enterprise..."
          />
          <Field
            label="Limite de atendimentos"
            value={form.limiteAtendimentos}
            onChange={(value) => setForm((current) => ({ ...current, limiteAtendimentos: value }))}
            placeholder="0"
            type="number"
            min={0}
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-[#8a8782]">
            Prompt inicial
          </label>
          <textarea
            value={form.prompt}
            onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value }))}
            rows={5}
            placeholder="Instrucoes que o bot deve seguir para esse usuario"
            className="w-full rounded-2xl border border-white/8 bg-[#171717] px-4 py-3 text-sm text-[#f0ede8] outline-none transition duration-200 placeholder:text-[#5a5754] focus:border-[#c96442]"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            label="Usuario ativo"
            checked={form.ativo}
            onChange={(checked) => setForm((current) => ({ ...current, ativo: checked }))}
          />
          <Toggle
            label="IA ativa"
            checked={form.iaAtiva}
            onChange={(checked) => setForm((current) => ({ ...current, iaAtiva: checked }))}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-[#c96442] px-5 py-3 text-sm font-medium text-white transition duration-200 hover:bg-[#d4714f] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Cadastrando...' : 'Cadastrar usuario'}
        </button>
      </form>
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  min,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  type?: string
  min?: number
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-[#8a8782]">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        min={min}
        className="w-full rounded-2xl border border-white/8 bg-[#171717] px-4 py-3 text-sm text-[#f0ede8] outline-none transition duration-200 placeholder:text-[#5a5754] focus:border-[#c96442]"
      />
    </label>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-white/8 bg-[#171717] px-4 py-3 text-sm text-[#f0ede8]">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[#c96442]"
      />
    </label>
  )
}