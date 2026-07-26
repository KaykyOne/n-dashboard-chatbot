import React from 'react'

export default function InternalLoading() {
    return (
        <div className='absolute z-50 flex h-full w-full items-center justify-center gap-3 bg-black/60 backdrop-blur-sm'>
            <div className='h-4 w-2 animate-bounce rounded-full bg-[#c96442]' />
            <div className='h-6 w-2 animate-bounce rounded-full bg-[#c96442]' />
            <div className='h-8 w-2 animate-bounce rounded-full bg-[#c96442]' />
        </div>
    )
}
