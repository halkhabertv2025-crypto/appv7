'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Pencil, Trash2, Search, Users, ChevronDown, ChevronRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const Departmanlar = ({ user }) => {
  const [departmanlar, setDepartmanlar] = useState([])
  const [filteredDepartmanlar, setFilteredDepartmanlar] = useState([])
  const [calisanlar, setCalisanlar] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingDepartman, setEditingDepartman] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedDepts, setExpandedDepts] = useState({})
  const [formData, setFormData] = useState({ ad: '', aciklama: '' })
  const { toast } = useToast()

  // Check if user has full access (not just çalışan yetkisi)
  const hasFullAccess = user?.yoneticiYetkisi || user?.adminYetkisi

  useEffect(() => {
    fetchDepartmanlar()
    fetchCalisanlar()
  }, [])

  useEffect(() => {
    const filtered = departmanlar.filter(dep =>
      dep.ad.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dep.aciklama.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredDepartmanlar(filtered)
  }, [searchTerm, departmanlar])

  const fetchDepartmanlar = async () => {
    try {
      const response = await fetch('/api/departmanlar')
      const data = await response.json()
      setDepartmanlar(data)
      setFilteredDepartmanlar(data)
    } catch (error) {
      toast({ title: 'Hata', description: 'Departmanlar yüklenemedi', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const fetchCalisanlar = async () => {
    try {
      const response = await fetch('/api/calisanlar')
      const data = await response.json()
      setCalisanlar(data)
    } catch (error) {
      console.error('Çalışanlar yüklenemedi')
    }
  }

  const getCalisanlarByDept = (deptId) => {
    return calisanlar.filter(c => c.departmanId === deptId && c.durum === 'Aktif')
  }

  const toggleDept = (deptId) => {
    setExpandedDepts(prev => ({ ...prev, [deptId]: !prev[deptId] }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const url = editingDepartman
        ? `/api/departmanlar/${editingDepartman.id}`
        : '/api/departmanlar'

      const response = await fetch(url, {
        method: editingDepartman ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userId: user?.id,
          userName: user?.adSoyad
        })
      })

      const data = await response.json()

      if (!response.ok) {
        toast({ title: 'Hata', description: data.error, variant: 'destructive' })
        return
      }

      toast({
        title: 'Başarılı',
        description: editingDepartman ? 'Departman güncellendi' : 'Departman oluşturuldu'
      })

      setShowDialog(false)
      setFormData({ ad: '', aciklama: '' })
      setEditingDepartman(null)
      fetchDepartmanlar()
    } catch (error) {
      toast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' })
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Bu departmanı silmek istediğinize emin misiniz?')) return

    try {
      const response = await fetch(`/api/departmanlar/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          userName: user?.adSoyad
        })
      })

      if (!response.ok) {
        toast({ title: 'Hata', description: 'Departman silinemedi', variant: 'destructive' })
        return
      }

      toast({ title: 'Başarılı', description: 'Departman silindi' })
      fetchDepartmanlar()
    } catch (error) {
      toast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' })
    }
  }

  const openEditDialog = (departman) => {
    setEditingDepartman(departman)
    setFormData({ ad: departman.ad, aciklama: departman.aciklama })
    setShowDialog(true)
  }

  const openCreateDialog = () => {
    setEditingDepartman(null)
    setFormData({ ad: '', aciklama: '' })
    setShowDialog(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Departmanlar</h2>
          <p className="text-gray-500">Departman listesi ve yönetimi</p>
        </div>
        {hasFullAccess && (
          <Button onClick={openCreateDialog} className="bg-teal-500 hover:bg-teal-600">
            <Plus size={20} className="mr-2" />
            Yeni Departman Oluştur
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder="Departman ara..."
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
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 w-8"></th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Departman Adı</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Çalışan Sayısı</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Açıklama</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDepartmanlar.map((departman) => {
                    const deptCalisanlar = getCalisanlarByDept(departman.id)
                    const isExpanded = expandedDepts[departman.id]

                    return (
                      <React.Fragment key={departman.id}>
                        <tr className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => toggleDept(departman.id)}>
                          <td className="py-3 px-4">
                            {deptCalisanlar.length > 0 && (
                              isExpanded ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-medium">{departman.ad}</td>
                          <td className="py-3 px-4 text-sm">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <Users size={12} />
                              {deptCalisanlar.length} Çalışan
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{departman.aciklama || '-'}</td>
                          {hasFullAccess && (
                            <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditDialog(departman)}
                                >
                                  <Pencil size={16} />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(departman.id)}
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </div>
                            </td>
                          )}
                          {!hasFullAccess && <td className="py-3 px-4"></td>}
                        </tr>
                        {isExpanded && deptCalisanlar.length > 0 && (
                          <tr>
                            <td colSpan={5} className="bg-gray-50 px-4 py-3">
                              <div className="pl-8">
                                <div className="text-xs font-medium text-gray-500 mb-2">Departman Çalışanları</div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                  {deptCalisanlar.map(calisan => (
                                    <div key={calisan.id} className="flex items-center gap-2 p-2 bg-white rounded border">
                                      <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 text-xs font-medium">
                                        {calisan.adSoyad?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 truncate">{calisan.adSoyad}</div>
                                        <div className="text-xs text-gray-500 truncate">{calisan.email}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
              {filteredDepartmanlar.length === 0 && (
                <div className="text-center py-8 text-gray-500">Departman bulunamadı</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDepartman ? 'Departman Düzenle' : 'Yeni Departman Oluştur'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="ad">Departman Adı *</Label>
                <Input
                  id="ad"
                  value={formData.ad}
                  onChange={(e) => setFormData({ ...formData, ad: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="aciklama">Açıklama</Label>
                <Textarea
                  id="aciklama"
                  value={formData.aciklama}
                  onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                İptal
              </Button>
              <Button type="submit" className="bg-teal-500 hover:bg-teal-600">
                {editingDepartman ? 'Güncelle' : 'Oluştur'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Departmanlar