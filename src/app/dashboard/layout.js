import React from 'react'
import Siderbar from '@/components/Siderbar'

export default function layout({ children }) {
    return (
        <div>
            <Siderbar />
            <div className='ml-[300px]'>
                {children}
            </div>
        </div>
    )
}
