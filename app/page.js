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
import Ayarlar from '@/components/pages/Ayarlar'
import BeninSayfam from '@/components/pages/BeninSayfam'

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {currentPage === 'dashboard' && <Dashboard />}
          {currentPage === 'calisanlar' && <Calisanlar />}
          {currentPage === 'departmanlar' && <Departmanlar />}
          {currentPage === 'envanterler' && <Envanterler />}
          {currentPage === 'envanter-tipleri' && <EnvanterTipleri />}
          {currentPage === 'zimmetler' && <Zimmetler />}
          {currentPage === 'ayarlar' && <Ayarlar />}
        </main>
      </div>
    </div>
  )
}