"use client"

import React, { useEffect } from 'react'
import { getCredentials } from '../utils/credentials'
import { login } from '../hooks/useLogin'

export default function AuthContext({ children }: { children: React.ReactNode }) {

  useEffect(() => {
    const { email, password, isAdmin } = getCredentials()
    if (!email || !password) {
      window.location.href = '/login'
    }

    login(email!, password!, true).then((data) => {
      if (!data) {
        window.location.href = '/login'
      }
    })

    console.log('isAdmin:', isAdmin)
    if(isAdmin) {
      window.location.href = '/adm'
    }

  }, [])

  return (
    <div>
      {children}
    </div>
  )
}
