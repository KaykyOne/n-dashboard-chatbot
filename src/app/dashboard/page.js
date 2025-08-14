'use client'
import React, { useState, useEffect } from 'react'
import Card from '@/components/Card'
import { selectAllLeads, updateLead } from '@/app/hooks/useLead'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

export default function Page() {
  const router = useRouter()
  const [leads, setLeads] = useState([]);
  const [filtro, setFiltro] = useState('fria');

  useEffect(() => {
    const buscar = async () => {
      const data = await selectAllLeads();
      setLeads(data || []);
    }
    buscar();
  }, [])

  const cssFrio = 'bg-[#060041] text-white capitalize w-full h-full p-3 rounded-lg';
  const cssQuente = 'bg-[#FF7E00] text-white capitalize w-full h-full p-3 rounded-lg';
  const cssFinalizado = 'bg-[#045900] text-white capitalize w-full h-full p-3 rounded-lg';

  const css = {
    fria: cssFrio,
    quente: cssQuente,
    finalizada: cssFinalizado
  }

  async function alterar(valor, id) {
    await updateLead(id, valor);
    const data = await selectAllLeads();
    setLeads(data || []);
  }


  const finalizadas = leads.filter(item => item.qualidade == 'finalizada').length
  const frias = leads.filter(item => item.qualidade == 'fria').length
  const quentes = leads.filter(item => item.qualidade == 'quente').length

  const leadsFiltrados = leads.filter(item => item.qualidade == filtro);

  return (
    <div className='w-full h-full p-3 flex flex-col'>
      <div className='flex flex-col '>
        <div className='p-5 flex w-full justify-between items-center'>
          <div>
            <h1 className='text-7xl font-bold '>Dashboard</h1>
            <h2 className='ml-1 text-xl font-semibold flex justify-start items-center gap-2'>Gerenciamento total do seu bot!
              <span className="material-symbols-outlined">
                smart_toy
              </span>
            </h2>
          </div>

          <div className='flex gap-2'>
            <button className='bg-neutral-800 h-fit p-1 pl-3 pr-3 flex items-center rounded-full group transition-all duration-300 justify-end shadow-md hover:shadow-white/20 cursor-pointer hover:bg-neutral-900'>
              <h1 className='text-xl ml-3 mr-4'>Configurações</h1>
              <span className="material-symbols-outlined !text-4xl">
                settings
              </span>
            </button>
            <button className='bg-red-800 h-fit p-1 pl-3 pr-1 flex items-center rounded-full group transition-all duration-300 justify-end shadow-md hover:shadow-red-400/20 cursor-pointer hover:bg-red-900' onClick={() => router.push('/')}>
              <h1 className='text-xl ml-3 mr-4'>Sair</h1>
              <span className="material-symbols-outlined !text-4xl">
                logout
              </span>
            </button>
          </div>


        </div>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-5 w-full p-5 h-[500px]'>
          <Card tipo={0} val={finalizadas} />
          <div className='hidden peer-hover:block'>a</div>
          <Card tipo={1} val={quentes} />
          <Card tipo={2} val={frias} />
        </div>
        <div className='flex flex-col p-5'>
          <div className='grid grid-cols-1 lg:grid-cols-3 w-full'>
            <button className='bg-[#1B1B1B] rounded-t-2xl p-3 border border-border-color hover:bg-neutral-700 transition duration-500 cursor-pointer' onClick={() => setFiltro('finalizada')}>
              Finalizados 💵
            </button>
            <button className='bg-[#1B1B1B] rounded-t-2xl p-3 border border-border-color hover:bg-neutral-700 transition duration-500 cursor-pointer' onClick={() => setFiltro('quente')}>
              Quentes 🔥
            </button>
            <button className='bg-[#1B1B1B] rounded-t-2xl p-3 border border-border-color hover:bg-neutral-700 transition duration-500 cursor-pointer' onClick={() => setFiltro('fria')}>
              Frios ❄️
            </button>
          </div>
          <div className="w-full flex flex-col bg-[#1B1B1B]  rounded-b-2xl border border-border-color px-10 py-4 text-left">
            {/* Cabeçalho da tabela */}
            <div className="grid grid-cols-5 gap-2 py-3 font-bold text-gray-300 border-b border-border-color">
              <p>Telefone</p>
              <p>Número de mensagens</p>
              <p>Data Contato</p>
              <p>Qualidade</p>
              <p className="text-center">Contato</p>
            </div>

            {/* Linhas com dados */}
            {leadsFiltrados.map((lead, i) => (
              <div
                key={i}
                className="grid grid-cols-5 gap-2 py-3 text-sm text-gray-200 border-b border-border-color last:border-none hover:bg-[#2b2b2b] transition-colors p-1 items-center group"
              >
                <p>{lead.numero}</p>
                <p>{lead.num_mensagens} {+lead.num_mensagens > 1 ? "mensagens" : "mensagem"} </p>
                <p>{format(lead.data_contato, 'dd/MM/yyyy')}</p>
                <select className={css[filtro]} value={lead.qualidade} onChange={(e) => alterar(e.target.value, lead.id)}>
                  <option value={'fria'}>fria ❄️</option>
                  <option value={'quente'}>quente 🔥</option>
                  <option value={'finalizada'}>Finalizada 💵</option>
                </select>

                {/* Contato */}
                <a
                  className="text-blue-500 font-medium flex items-center justify-center gap-1 hover:underline cursor-pointer"
                  href={`https://wa.me/55${lead.numero}`}
                  target="_blank"
                  title="Entrar em contato"
                >
                  Contato
                  <span className="material-symbols-outlined">3p</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
