import React from 'react'

export default function Card({ val, tipo }) {

    const cards = [
        (
            <div className='flex flex-col p-5 bg-gradient-to-l from-[#011C00] to-[#045900] justify-center items-center gap-2 rounded-2xl border border-[#0DFF00] text-[#0DFF00] aparecer hover:-translate-y-2 transition-all duration-600 cursor-pointer group h-fit shadow-green-500 hover:shadow-2xl'>
                <div className='bg-[#0DFF00] flex rounded-full h-[80px] w-[80px]  justify-center items-center text-center'>
                    <span className="material-symbols-outlined text-[#011C00] !text-5xl">
                        check
                    </span>
                </div>
                <h1 className='text-3xl font-bold'>Leads Finalizados</h1>
                <p>Você ganhou tudo isso!💵</p>
                <h1 className='text-9xl font-black'>{val}</h1>
                <div className='w-1/2 h-1 bg-[#0DFF00]'></div>
                <div className='flex gap-2'>
                    <span className="material-symbols-outlined">
                        star
                    </span>
                    <span className="material-symbols-outlined">
                        star
                    </span>
                    <span className="material-symbols-outlined">
                        star
                    </span>
                </div>
                <div className="max-h-0 overflow-hidden transition-all duration-500 group-hover:max-h-40">
                    <p className="mt-2">
                        Nesse caso, são pessoas que entraram em contato e mostraram algum interesse, e a venda foi finalizada!
                    </p>
                </div>
            </div>
        ),
        
        (
            <div className='flex flex-col p-5 bg-gradient-to-l from-[#422100] to-[#663200] justify-center items-center gap-2 rounded-2xl border border-[#FF7E00] text-[#FF7E00] aparecer hover:-translate-y-2 transition-all duration-600 cursor-pointer group h-fit shadow-amber-500 hover:shadow-2xl'>
                <div className='bg-[#FF7E00] flex rounded-full h-[80px] w-[80px]  justify-center items-center text-center'>
                    <span className="material-symbols-outlined text-[#422100] !text-5xl">
                        local_fire_department
                    </span>
                </div>
                <h1 className='text-3xl font-bold'>Leads Quentes</h1>
                <p>Só ta começando!🔥</p>
                <h1 className='text-9xl font-black'>{val}</h1>
                <div className='w-1/2 h-1 bg-[#FF7E00]'></div>
                <div className='flex gap-2'>
                    <span className="material-symbols-outlined">
                        star
                    </span>
                    <span className="material-symbols-outlined">
                        star
                    </span>
                </div>
                <div className="max-h-0 overflow-hidden transition-all duration-500 group-hover:max-h-40">
                    <p className="mt-2">
                        São pessoas que já entraram em contato e demonstraram bastante interesse. Estão quase fechando — é só dar o empurrão final!
                    </p>
                </div>
            </div>
        ),

        (
            <div className='flex flex-col p-5 bg-gradient-to-l from-[#060041] to-[#030020] justify-center items-center gap-2 rounded-2xl border border-[#0066FF] text-[#0066FF] aparecer hover:-translate-y-2 transition-all duration-600 cursor-pointer group h-fit shadow-sky-500 hover:shadow-2xl'>
                <div className='bg-[#0066FF] flex rounded-full h-[80px] w-[80px]  justify-center items-center text-center'>
                    <span className="material-symbols-outlined text-[#060041] !text-5xl">
                        mode_cool
                    </span>
                </div>
                <h1 className='text-3xl font-bold'>Leads Frios</h1>
                <p>Tá um clima gelado ❄️</p>
                <h1 className='text-9xl font-black'>{val}</h1>
                <div className='w-1/2 h-1 bg-[#0066FF]'></div>
                <div className='flex gap-2'>
                    <span className="material-symbols-outlined">
                        star
                    </span>
                </div>
                <div className="max-h-0 overflow-hidden transition-all duration-500 group-hover:max-h-40">
                    <p className="mt-2">
                        Nesse caso, são pessoas que entraram em contato e mostraram algum interesse, sem grandes avanços!
                    </p>
                </div>
            </div>
        )
    ]

    return (
        <>
            {cards[tipo]}
        </>
    )
}
