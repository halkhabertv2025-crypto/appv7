'use client'

import {
  Home,
  Users,
  Building2,
  Package,
  Settings,
  ChevronDown,
  ChevronRight,
  User
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

const Sidebar = ({ currentPage, setCurrentPage, isOpen, setIsOpen }) => {
  const [envanterOpen, setEnvanterOpen] = useState(true)

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
        { id: 'zimmetler', label: 'Zimmetler' },
        { id: 'dijital-varliklar', label: 'Dijital Varlıklar' }
      ]
    },
    {
      id: 'ayarlar',
      label: 'Ayarlar',
      icon: Settings
    }
  ]

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={cn(
        "bg-gray-800 text-white transition-all duration-300 flex flex-col z-50",
        "fixed md:relative h-full",
        isOpen ? "w-64 translate-x-0" : "w-0 md:w-20 -translate-x-full md:translate-x-0"
      )}>
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          {(isOpen || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
            <div className="flex items-center justify-start w-full pl-2">
              <Image
                src="/logo-white.svg"
                alt="Halk TV Logo"
                width={120}
                height={40}
                className="h-8 w-auto object-contain"
                priority
              />
            </div>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 hover:bg-gray-700 rounded hidden md:block"
          >
            <ChevronRight className={cn(
              "transition-transform",
              isOpen && "rotate-180"
            )} size={20} />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-gray-700 rounded md:hidden"
          >
            <ChevronRight className="rotate-180" size={20} />
          </button>
        </div>

        <nav className="p-2 space-y-1 overflow-y-auto flex-1">
          {menuItems.map((item) => (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (item.isDropdown) {
                    item.setOpen(!item.open)
                  } else {
                    setCurrentPage(item.id)
                    if (window.innerWidth < 768) setIsOpen(false) // Close sidebar on mobile select
                  }
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors",
                  currentPage === item.id
                    ? "bg-teal-500 text-white"
                    : "text-gray-300 hover:bg-gray-700",
                  !isOpen && "md:justify-center"
                )}
              >
                <div className="flex items-center space-x-3">
                  <item.icon size={20} className="min-w-[20px]" />
                  <span className={cn("text-sm whitespace-nowrap", !isOpen && "md:hidden")}>{item.label}</span>
                </div>
                {item.isDropdown && (
                  <ChevronDown
                    size={16}
                    className={cn(
                      "transition-transform ml-auto",
                      item.open && "rotate-180",
                      !isOpen && "md:hidden"
                    )}
                  />
                )}
              </button>

              {item.isDropdown && item.open && (isOpen || window.innerWidth < 768) && (
                <div className={cn("ml-4 mt-1 space-y-1", !isOpen && "md:hidden")}>
                  {item.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => {
                        setCurrentPage(child.id)
                        if (window.innerWidth < 768) setIsOpen(false)
                      }}
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
    </>
  )
}

export default Sidebar
