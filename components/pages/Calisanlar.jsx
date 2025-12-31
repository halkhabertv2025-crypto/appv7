'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Checkbox } from '@/components/ui/checkbox'

const Calisanlar = () => {
  const [calisanlar, setCalisanlar] = useState([])
  const [filteredCalisanlar, setFilteredCalisanlar] = useState([])
  const [departmanlar, setDepartmanlar] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingCalisan, setEditingCalisan] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    adSoyad: '',
    email: '',
    telefon: '',
    departmanId: '',
    durum: 'Aktif',
    yoneticiYetkisi: false
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchCalisanlar()
    fetchDepartmanlar()
  }, [])

  useEffect(() => {
    const filtered = calisanlar.filter(cal => 
      cal.adSoyad.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cal.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cal.departmanAd.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredCalisanlar(filtered)
  }, [searchTerm, calisanlar])

  const fetchCalisanlar = async () => {
    try {
      const response = await fetch('/api/calisanlar')
      const data = await response.json()
      setCalisanlar(data)
      setFilteredCalisanlar(data)
    } catch (error) {
      toast({ title: 'Hata', description: 'Çalışanlar yüklenemedi', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartmanlar = async () => {
    try {
      const response = await fetch('/api/departmanlar')
      const data = await response.json()
      setDepartmanlar(data)
    } catch (error) {
      console.error('Departmanlar yüklenemedi')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const url = editingCalisan 
        ? `/api/calisanlar/${editingCalisan.id}`
        : '/api/calisanlar'
      
      const response = await fetch(url, {
        method: editingCalisan ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        toast({ title: 'Hata', description: data.error, variant: 'destructive' })
        return
      }

      toast({ 
        title: 'Başarılı', 
        description: editingCalisan ? 'Çalışan güncellendi' : 'Çalışan oluşturuldu' 
      })
      
      setShowDialog(false)
      setFormData({ adSoyad: '', email: '', telefon: '', departmanId: '', durum: 'Aktif', yoneticiYetkisi: false })
      setEditingCalisan(null)
      fetchCalisanlar()
    } catch (error) {
      toast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' })
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Bu çalışanı silmek istediğinize emin misiniz?')) return

    try {
      const response = await fetch(`/api/calisanlar/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        toast({ title: 'Hata', description: 'Çalışan silinemedi', variant: 'destructive' })
        return
      }

      toast({ title: 'Başarılı', description: 'Çalışan silindi' })
      fetchCalisanlar()
    } catch (error) {
      toast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' })
    }
  }

  const openEditDialog = (calisan) => {
    setEditingCalisan(calisan)
    setFormData({
      adSoyad: calisan.adSoyad,
      email: calisan.email,
      telefon: calisan.telefon,
      departmanId: calisan.departmanId,
      durum: calisan.durum,
      yoneticiYetkisi: calisan.yoneticiYetkisi || false
    })
    setShowDialog(true)
  }

  const openCreateDialog = () => {
    setEditingCalisan(null)
    setFormData({ adSoyad: '', email: '', telefon: '', departmanId: '', durum: 'Aktif', yoneticiYetkisi: false })
    setShowDialog(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Çalışanlar</h2>
          <p className="text-gray-500">Çalışan listesi ve yönetimi</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-teal-500 hover:bg-teal-600">
          <Plus size={20} className="mr-2" />
          Yeni Çalışan Oluştur
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder="Çalışan ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Yükleniyor...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Ad Soyad</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Telefon</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Departman</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Yönetici</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Durum</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCalisanlar.map((calisan) => (
                    <tr key={calisan.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-medium">{calisan.adSoyad}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{calisan.email || '-'}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{calisan.telefon || '-'}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{calisan.departmanAd}</td>
                      <td className="py-3 px-4">
                        {calisan.yoneticiYetkisi ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Yönetici
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          calisan.durum === 'Aktif' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {calisan.durum}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditDialog(calisan)}
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDelete(calisan.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredCalisanlar.length === 0 && (
                <div className="text-center py-8 text-gray-500">Çalışan bulunamadı</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCalisan ? 'Çalışan Düzenle' : 'Yeni Çalışan Oluştur'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="adSoyad">Ad Soyad *</Label>
                <Input
                  id="adSoyad"
                  value={formData.adSoyad}
                  onChange={(e) => setFormData({ ...formData, adSoyad: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="telefon">Telefon</Label>
                <Input
                  id="telefon"
                  value={formData.telefon}
                  onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="departmanId">Departman *</Label>
                <Select 
                  value={formData.departmanId} 
                  onValueChange={(value) => setFormData({ ...formData, departmanId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Departman seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmanlar.map(dep => (
                      <SelectItem key={dep.id} value={dep.id}>{dep.ad}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="durum">Durum</Label>
                <Select 
                  value={formData.durum} 
                  onValueChange={(value) => setFormData({ ...formData, durum: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aktif">Aktif</SelectItem>
                    <SelectItem value="Pasif">Pasif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                İptal
              </Button>
              <Button type="submit" className="bg-teal-500 hover:bg-teal-600">
                {editingCalisan ? 'Güncelle' : 'Oluştur'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Calisanlar