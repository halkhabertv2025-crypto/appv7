'use client'

import { Bell, HelpCircle, ChevronDown, LogOut, User, Shield, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Settings } from 'lucide-react'

const Header = ({ user, onLogout, onMenuClick, onNavigate }) => {
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
            <Menu size={24} />
          </Button>
          <h1 className="text-xl font-semibold text-gray-800 hidden md:block">
            Merhaba, {user?.adSoyad || 'Kullanıcı'} 👋
          </h1>
          {user?.adminYetkisi && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              <Shield size={12} className="mr-1" />
              Admin
            </span>
          )}
          {user?.yoneticiYetkisi && !user?.adminYetkisi && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Yönetici
            </span>
          )}
        </div>

        <div className="flex items-center space-x-4">




          <Button variant="ghost" size="icon" className="relative">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white">
                  <span className="text-sm font-semibold">{getInitials(user?.adSoyad || 'U')}</span>
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-sm font-medium">{user?.adSoyad}</div>
                  <div className="text-xs text-gray-500">{user?.departmanAd}</div>
                </div>
                <ChevronDown size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onNavigate?.('benim-sayfam')}>
                <User size={16} className="mr-2" />
                Benim Sayfam
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNavigate?.('ayarlar')}>
                <Settings size={16} className="mr-2" />
                Ayarlar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-red-600">
                <LogOut size={16} className="mr-2" />
                Çıkış Yap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

export default Header