import React from 'react'
import Image from 'next/image'

export default function Siderbar() {
  return (
    <div className='fixed left-0 h-full w-[300px] bg-gradient-to-l from-[#1E1E1E] to-[#141414] p-7 border-r border-border-color'>
      <div className='flex flex-col gap-2 justify-center items-center'>

        <div className='flex w-full gap-2 justify-center items-center'>
          <Image src={'/logoNovusTech.png'} height={50} width={50} alt='logo novusTech' className='rounded-3xl' />
          <h1 className='text-xl font-bold'>NovusTech</h1>
        </div>

        <button className='fixed bottom-4 flex gap-2 border-2 border-border-color rounded-2xl p-3 items-center hover:border-white hover:bg-white cursor-pointer transition duration-500 hover:text-black'>
          <div className='flex flex-col justify-center items-start  '>    
            <h1 className='font-bold text-lg'>Configurações</h1>
            <h2 className='font-light text-sm'>Caso precisar mudar algo</h2>
          </div>
          <span className="material-symbols-outlined !text-5xl">
            settings
          </span>
        </button>
      </div>
    </div>
  )
}
