'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import Dashboard from '@/components/pages/Dashboard'
import Calisanlar from '@/components/pages/Calisanlar'
import Departmanlar from '@/components/pages/Departmanlar'
import Envanterler from '@/components/pages/Envanterler'
import EnvanterTipleri from '@/components/pages/EnvanterTipleri'
import Zimmetler from '@/components/pages/Zimmetler'
import DijitalVarliklar from '@/components/pages/DijitalVarliklar'
import Ayarlar from '@/components/pages/Ayarlar'
import BeninSayfam from '@/components/pages/BeninSayfam'
import Login from '@/components/pages/Login'

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    setUser(null)
    setCurrentPage('dashboard')
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto p-6">
          {currentPage === 'dashboard' && <Dashboard />}
          {currentPage === 'benim-sayfam' && <BeninSayfam />}
          {currentPage === 'calisanlar' && <Calisanlar user={user} />}
          {currentPage === 'departmanlar' && <Departmanlar user={user} />}
          {currentPage === 'envanterler' && <Envanterler user={user} />}
          {currentPage === 'envanter-tipleri' && <EnvanterTipleri />}
          {currentPage === 'zimmetler' && <Zimmetler user={user} />}
          {currentPage === 'ayarlar' && <Ayarlar />}
        </main>
      </div>
    </div>
  )
}