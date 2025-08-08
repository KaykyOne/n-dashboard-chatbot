'use client'
import React, { useState, useEffect } from 'react'
import Card from '@/components/Card'
import { selectAllLeads } from '@/app/hooks/hook'

export default function page() {
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    const buscar = async () => {
      const data = await selectAllLeads();
      setLeads(data || []);
      console.log(leads);
    }
    buscar();
  }, [])

  const finalizadas = leads.filter(item => item.qualidade == 'finalizada').length
  const frias = leads.filter(item => item.qualidade == 'fria').length
  const quentes = leads.filter(item => item.qualidade == 'quente').length


  return (
    <div className='w-full h-full p-3 flex flex-col'>
      <div className='flex flex-col '>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-5 w-full p-5'>
          <Card tipo={0} val={finalizadas} />
          <div className='hidden peer-hover:block'>a</div>
          <Card tipo={1} val={quentes} />
          <Card tipo={2} val={frias} />
        </div>
        <div className='flex flex-col p-5'>
          <div className='grid grid-cols-1 lg:grid-cols-3 w-full'>
            <button className='bg-[#1B1B1B] rounded-t-2xl p-3 border border-border-color hover:bg-neutral-700 transition duration-500 cursor-pointer'>
              Finalizados 💵
            </button>
            <button className='bg-[#1B1B1B] rounded-t-2xl p-3 border border-border-color hover:bg-neutral-700 transition duration-500 cursor-pointer'>
              Quentes 🔥
            </button>
            <button className='bg-[#1B1B1B] rounded-t-2xl p-3 border border-border-color hover:bg-neutral-700 transition duration-500 cursor-pointer'>
              Frios ❄️
            </button>
          </div>
          <div className="w-full flex flex-col bg-[#1B1B1B]  rounded-b-2xl border border-border-color px-10 py-4 text-left">
            {/* Cabeçalho da tabela */}
            <div className="grid grid-cols-6 gap-2 py-3 font-bold text-gray-300 border-b border-border-color">
              <p>Telefone</p>
              <p>Número de mensagens</p>
              <p>Data Contato</p>
              <p>Qualidade</p>
              <p className="text-center">Contato</p>
              <p className="text-center">Finalizar</p>
            </div>

            {/* Linhas com dados */}
            {leads.map((lead, i) => (
              <div
                key={i}
                className="grid grid-cols-6 gap-2 py-3 text-sm text-gray-200 border-b border-border-color last:border-none hover:bg-[#2b2b2b] transition-colors"
              >
                <p>{lead.numero}</p>
                <p>{lead.num_mensagens} {+lead.num_mensagens > 1 ? "mensagens" : "mensagem"} </p>
                <p>{lead.data_contato}</p>
                <p>{lead.qualidade}</p>

                {/* Contato */}
                <a
                  className="text-blue-500 font-medium flex items-center justify-center gap-1 hover:underline cursor-pointer"
                  href="#"
                  title="Entrar em contato"
                >
                  Contato
                  <span className="material-symbols-outlined">3p</span>
                </a>

                {/* Finalizar */}
                <a
                  className="text-green-400 font-medium flex items-center justify-center gap-1 hover:underline cursor-pointer"
                  href="#"
                  title="Finalizar lead"
                >
                  Finalizar
                  <span className="material-symbols-outlined">check_circle</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
