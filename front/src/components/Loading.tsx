import React from 'react'

export default function Loading() {
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="flex gap-3">
                <div className="h-8 w-2 animate-pulse rounded-full bg-[#c96442]" />
                <div className="h-10 w-2 animate-pulse rounded-full bg-[#c96442]" style={{ animationDelay: '0.2s' }} />
                <div className="h-12 w-2 animate-pulse rounded-full bg-[#c96442]" style={{ animationDelay: '0.4s' }} />
            </div>
        </div>
    )
}
