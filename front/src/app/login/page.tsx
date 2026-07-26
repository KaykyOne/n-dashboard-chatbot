"use client"
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '../../hooks/useLogin'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saveDados, setSalvarDados] = useState(false)

  async function handleClick() {
    if (!email || !password) return
    setLoading(true)
    const ok = await login(email, password, saveDados)
    if (ok) router.push('/dashboard')
    setLoading(false)
  }

  useEffect(() => {
    const savedEmail = localStorage.getItem('email')
    const savedPassword = localStorage.getItem('senha')
    if (savedEmail && savedPassword) {
      setEmail(savedEmail)
      setPassword(savedPassword)
      setSalvarDados(true)
    }
  }, [])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0d0d0d] px-6">
      <div className="relative w-full max-w-md px-6">
        <div className="space-y-8 rounded-3xl border border-white/8 bg-[#121212] p-8">
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#5a5754]">
              Acesso Seguro
            </p>
            <h1 className="mb-2 text-2xl font-medium text-[#f0ede8]">
              Entre para gerenciar o bot
            </h1>
            <p className="text-sm text-[#a09d98]">
              Login direto, sem camadas de marketing no caminho.
            </p>
          </div>

          <div className="space-y-5">
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#5a5754] transition group-focus-within:text-[#c96442]">
                mail
              </span>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-white/8 bg-[#171717] py-3 pl-12 pr-4 text-sm text-[#f0ede8] outline-none transition duration-200 placeholder:text-[#5a5754] focus:border-[#c96442]"
              />
            </div>

            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#5a5754] transition group-focus-within:text-[#c96442]">
                lock
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-white/8 bg-[#171717] py-3 pl-12 pr-12 text-sm text-[#f0ede8] outline-none transition duration-200 placeholder:text-[#5a5754] focus:border-[#c96442]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5a5754] transition hover:text-[#f0ede8]"
              >
                <span className="material-symbols-outlined text-lg">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-[#a09d98]">
                <input
                  type="checkbox"
                  checked={saveDados}
                  onChange={(e) => setSalvarDados(e.target.checked)}
                  className="accent-[#c96442]"
                />
                Lembrar dados
              </label>
            </div>
          </div>

          <button
            onClick={handleClick}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#c96442] py-3 font-medium text-white transition duration-200 hover:bg-[#d4714f] disabled:opacity-50"
          >
            {!loading ? (
              <>
                Entrar
                <span className="material-symbols-outlined text-lg">
                  arrow_forward
                </span>
              </>
            ) : (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-[#5a5754]">
          (c) 2026 NovusTech
        </p>
      </div>
    </div>
  )
}
