import './globals.css'
import { Toaster } from '@/components/ui/toaster'

export const metadata = {
  title: 'Halk TV - Zimmet ve Envanter Takip',
  description: 'İşyeri cihazlarını çalışanlara zimmetleyip takip edin',
}

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}