'use client'

import { 
  Home, 
  Users, 
  Building2, 
  Package, 
  ClipboardList,
  Settings,
  ChevronDown,
  ChevronRight,
  User,
  Briefcase,
  Plane,
  Receipt,
  FileText
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const Sidebar = ({ currentPage, setCurrentPage, isOpen, setIsOpen }) => {
  const [envanterOpen, setEnvanterOpen] = useState(true)
  const [izinOpen, setIzinOpen] = useState(false)

  const menuItems = [
    { 
      id: 'dashboard', 
      label: 'Anasayfa', 
      icon: Home 
    },
    { 
      id: 'benim-sayfam', 
      label: 'Benim Sayfam', 
      icon: User 
    },
    {
      id: 'izin-islemleri',
      label: 'İzin İşlemleri',
      icon: ClipboardList,
      isDropdown: true,
      open: izinOpen,
      setOpen: setIzinOpen,
      children: [
        { id: 'izin-talebi', label: 'İzin Talebi' },
        { id: 'seyahat-talebi', label: 'Seyahat Talebi' },
        { id: 'avans-talebi', label: 'Avans Talebi' },
        { id: 'harcama-talebi', label: 'Harcama Talebi' },
        { id: 'ulasim-konaklama', label: 'Ulaşım ve Konaklama Talebi' }
      ]
    },
    { 
      id: 'calisanlar', 
      label: 'Çalışanlar', 
      icon: Users 
    },
    { 
      id: 'departmanlar', 
      label: 'Departmanlar', 
      icon: Building2 
    },
    {
      id: 'envanter-zimmet',
      label: 'Envanter ve Zimmet',
      icon: Package,
      isDropdown: true,
      open: envanterOpen,
      setOpen: setEnvanterOpen,
      children: [
        { id: 'envanterler', label: 'Envanterler' },
        { id: 'envanter-tipleri', label: 'Envanter Tipleri' },
        { id: 'zimmetler', label: 'Zimmetler' }
      ]
    },
    {
      id: 'arans-harcama',
      label: 'Arans ve Harcama',
      icon: Receipt
    },
    {
      id: 'raporlar',
      label: 'Raporlar',
      icon: FileText
    },
    { 
      id: 'ayarlar', 
      label: 'Ayarlar', 
      icon: Settings 
    }
  ]

  return (
    <aside className={cn(
      "bg-gray-800 text-white transition-all duration-300",
      isOpen ? "w-64" : "w-20"
    )}>
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {isOpen && (
          <div className="flex items-center space-x-2">
            <img src="/logo.png" alt="Halk TV" className="h-8" />
          </div>
        )}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 hover:bg-gray-700 rounded"
        >
          <ChevronRight className={cn(
            "transition-transform",
            isOpen && "rotate-180"
          )} size={20} />
        </button>
      </div>
      
      <nav className="p-2 space-y-1 overflow-y-auto h-[calc(100vh-73px)]">
        {menuItems.map((item) => (
          <div key={item.id}>
            <button
              onClick={() => {
                if (item.isDropdown) {
                  item.setOpen(!item.open)
                } else {
                  setCurrentPage(item.id)
                }
              }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors",
                currentPage === item.id 
                  ? "bg-teal-500 text-white" 
                  : "text-gray-300 hover:bg-gray-700",
                !isOpen && "justify-center"
              )}
            >
              <div className="flex items-center space-x-3">
                <item.icon size={20} />
                {isOpen && <span className="text-sm">{item.label}</span>}
              </div>
              {isOpen && item.isDropdown && (
                <ChevronDown 
                  size={16} 
                  className={cn(
                    "transition-transform",
                    item.open && "rotate-180"
                  )}
                />
              )}
            </button>
            
            {item.isDropdown && item.open && isOpen && (
              <div className="ml-4 mt-1 space-y-1">
                {item.children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => setCurrentPage(child.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                      currentPage === child.id
                        ? "bg-teal-500 text-white"
                        : "text-gray-300 hover:bg-gray-700"
                    )}
                  >
                    {child.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
