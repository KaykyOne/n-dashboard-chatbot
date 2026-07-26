"use client"

export const getCredentials = () => {
  const email = localStorage.getItem('email')
  const password = localStorage.getItem('senha')
  const isAdmin = localStorage.getItem('isAdmin') === 'true'

  return { email, password, isAdmin }
}