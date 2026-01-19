'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Lock } from 'lucide-react'

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({ email: '', sifre: '' })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: 'Hata',
          description: data.error || 'Giriş başarısız',
          variant: 'destructive'
        })
        return
      }

      // Save user data to localStorage
      localStorage.setItem('user', JSON.stringify(data))

      toast({
        title: 'Başarılı',
        description: `Hoş geldiniz, ${data.adSoyad}!`
      })

      // Call parent function to update state
      onLogin(data)
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'Bir hata oluştu',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="Halk TV" className="h-16" />
          </div>
          <CardTitle className="text-2xl font-bold">Halk TV</CardTitle>
          <p className="text-gray-500">Zimmet ve Envanter Takip Sistemi</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@halktv.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="sifre">Şifre</Label>
              <Input
                id="sifre"
                type="password"
                placeholder="••••••"
                value={formData.sifre}
                onChange={(e) => setFormData({ ...formData, sifre: e.target.value })}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-teal-500 hover:bg-teal-600"
              disabled={loading}
            >
              {loading ? 'Giriş yapılıyor...' : (
                <>
                  <Lock size={16} className="mr-2" />
                  Giriş Yap
                </>
              )}
            </Button>
          </form>


        </CardContent>
      </Card>
    </div>
  )
}

export default Login
