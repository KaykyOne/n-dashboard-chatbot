import React from 'react'
import Siderbar from '@/components/Siderbar'

export default function layout({ children }) {
    return (
        <div>
            <div>
                {children}
            </div>
        </div>
    )
}
