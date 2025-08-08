"use client"
import React, { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function Page() {
  const router = useRouter()
  const [loading, setLoading] = useState();
  const [showPassword, setShowPassword] = useState(false);

  async function handleClick() {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    router.push('/dashboard');
  }


  return (
    <div className='grid grid-cols-1 lg:grid-cols-3 lg:overflow-hidden'>
      <div className='flex w-full col-span-2 bg-white h-screen p-50'>
        <Image
          src={'/imgLogin.svg'}
          width={500}
          height={300}
          className="w-full h-auto"
          alt='img-login'
        />
      </div>
      <div className='flex flex-col justify-center items-center p-10 w-full gap-5 aparecer'>
        <div className='w-full text-center mb-5'>
          <h1 className='text-5xl lg:text-7xl font-bold'>Bem-Vindo</h1>
          <p>Gerenciamento de Leads da NovusTech</p>
        </div>
        <input className="input" placeholder="Email" type='email' />
        <div className='w-full flex gap-2'>
          <input
            className="input"
            placeholder="Senha"
            type={showPassword ? 'text' : 'password'}
          />
          <button
            className='flex justify-center items-center cursor-pointer px-4 rounded'
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
            type="button"
          >
            <span className="material-symbols-outlined">
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        </div>
        <button className='button group' onClick={handleClick} disabled={loading}>
          {!loading ? (
            <>
              <p>Acessar</p>
              < span className="material-symbols-outlined !text-2xl">
                play_arrow
              </span>
            </>
          ) : (
            <div className="animate-spin h-8 w-8 border-4 border-t-transparent border-white rounded-full"></div>
          )}

        </button>
        <div className='transition duration-600 rounded-2xl p-2 group'>
          <a className='cursor-pointer'>Esqueceu a senha? clique aqui!</a>
          <div className='w-0 h-1 group-hover:w-full bg-primary transition-all duration-300 rounded-full'></div>
        </div>
      </div>
    </div >
  )
}
