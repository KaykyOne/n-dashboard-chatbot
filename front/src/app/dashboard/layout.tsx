'use client'
import React, { useState, useEffect } from 'react'
import Siderbar from '../../components/Siderbar'
import Modal from '../../components/modal/Modal'
import ChatWindow from '../../components/chat/ChatWindow'
import Loading from '../../components/Loading'
import { selectAllLeads } from '../../hooks/useLead'
import { Lead } from '../../models/index'
import AuthContext from '../../context/authContext'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [lead, setLead] = useState<Lead | undefined>(undefined)
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    const fetch = async () => {
      const data = await selectAllLeads()
      setLeads(data || [])
      setLoading(false)
    }
    fetch()
  }, [])

  const handleSetLead = (selectedLead: Lead | undefined) => {
    setLead(selectedLead)
  }

  return (
    <AuthContext>
      <div className="relative flex h-screen w-screen bg-[#0d0d0d] text-[#f0ede8]">
        {loading && <Loading />}

        <Siderbar
          leads={leads}
          setLead={handleSetLead}
          setModalOpen={setModalOpen}
          activeLeadId={lead?.id}
        />

        {lead ? (
          <ChatWindow lead={lead} onClose={() => handleSetLead(undefined)} />
        ) : (
          children
        )}

        {modalOpen && <Modal setModalOpen={setModalOpen} />}
      </div>
    </AuthContext>
  )
}
