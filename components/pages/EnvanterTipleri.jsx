'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Pencil, Trash2, Search, ChevronDown, ChevronRight, Package } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn, toTitleCase } from '@/lib/utils'

const EnvanterTipleri = () => {
  const [tipler, setTipler] = useState([])
  const [filteredTipler, setFilteredTipler] = useState([])
  const [expandedTip, setExpandedTip] = useState(null)
  const [tipEnvanterleri, setTipEnvanterleri] = useState({})
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingTip, setEditingTip] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({ ad: '', aciklama: '' })
  const { toast } = useToast()

  useEffect(() => {
    fetchTipler()
  }, [])

  useEffect(() => {
    const filtered = tipler.filter(tip =>
      tip.ad.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tip.aciklama.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredTipler(filtered)
  }, [searchTerm, tipler])

  const fetchTipler = async () => {
    try {
      const response = await fetch('/api/envanter-tipleri')
      const data = await response.json()
      setTipler(data)
      setFilteredTipler(data)
    } catch (error) {
      toast({ title: 'Hata', description: 'Envanter tipleri yüklenemedi', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const fetchTipEnvanterleri = async (tipId) => {
    try {
      const response = await fetch('/api/envanterler')
      const allEnvanterler = await response.json()
      const filtered = allEnvanterler.filter(e => e.envanterTipiId === tipId)
      setTipEnvanterleri(prev => ({ ...prev, [tipId]: filtered }))
    } catch (error) {
      console.error('Envanterler yüklenemedi')
    }
  }

  const toggleExpand = (tipId) => {
    if (expandedTip === tipId) {
      setExpandedTip(null)
    } else {
      setExpandedTip(tipId)
      if (!tipEnvanterleri[tipId]) {
        fetchTipEnvanterleri(tipId)
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const url = editingTip
        ? `/api/envanter-tipleri/${editingTip.id}`
        : '/api/envanter-tipleri'

      const response = await fetch(url, {
        method: editingTip ? 'PUT' : 'POST',
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
        description: editingTip ? 'Envanter tipi güncellendi' : 'Envanter tipi oluşturuldu'
      })

      setShowDialog(false)
      setFormData({ ad: '', aciklama: '' })
      setEditingTip(null)
      fetchTipler()
    } catch (error) {
      toast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' })
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Bu envanter tipini silmek istediğinize emin misiniz?')) return

    try {
      const response = await fetch(`/api/envanter-tipleri/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        toast({ title: 'Hata', description: 'Envanter tipi silinemedi', variant: 'destructive' })
        return
      }

      toast({ title: 'Başarılı', description: 'Envanter tipi silindi' })
      fetchTipler()
    } catch (error) {
      toast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' })
    }
  }

  const openEditDialog = (tip) => {
    setEditingTip(tip)
    setFormData({ ad: tip.ad, aciklama: tip.aciklama })
    setShowDialog(true)
  }

  const openCreateDialog = () => {
    setEditingTip(null)
    setFormData({ ad: '', aciklama: '' })
    setShowDialog(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Envanter Tipleri</h2>
          <p className="text-gray-500">Envanter tipi listesi ve yönetimi</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-teal-500 hover:bg-teal-600">
          <Plus size={20} className="mr-2" />
          Yeni Envanter Tipi
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder="Envanter tipi ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Yükleniyor...</div>
          ) : (
            <div className="space-y-2">
              {filteredTipler.map((tip) => (
                <div key={tip.id} className="border rounded-lg">
                  <div className="flex items-center justify-between p-4 hover:bg-gray-50">
                    <div className="flex items-center space-x-4 flex-1">
                      <button
                        onClick={() => toggleExpand(tip.id)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        {expandedTip === tip.id ?
                          <ChevronDown size={20} /> :
                          <ChevronRight size={20} />
                        }
                      </button>
                      <div className="flex-1">
                        <div className="font-medium text-lg">{tip.ad}</div>
                        {tip.aciklama && (
                          <div className="text-sm text-gray-500">{tip.aciklama}</div>
                        )}
                      </div>
                      <div className="flex space-x-6 text-sm">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{tip.toplamSayisi}</div>
                          <div className="text-gray-500">Toplam</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{tip.zimmetliSayisi}</div>
                          <div className="text-gray-500">Zimmetli</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">{tip.depodaSayisi}</div>
                          <div className="text-gray-500">Depoda</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">{tip.arizaliSayisi}</div>
                          <div className="text-gray-500">Arızalı/Kayıp</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(tip)}
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(tip.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>

                  {expandedTip === tip.id && (
                    <div className="border-t bg-gray-50 p-4">
                      {tipEnvanterleri[tip.id] ? (
                        tipEnvanterleri[tip.id].length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2 px-3 font-medium text-gray-600">Marka</th>
                                  <th className="text-left py-2 px-3 font-medium text-gray-600">Model</th>
                                  <th className="text-left py-2 px-3 font-medium text-gray-600">Seri No</th>
                                  <th className="text-left py-2 px-3 font-medium text-gray-600">Durum</th>
                                  <th className="text-left py-2 px-3 font-medium text-gray-600">Zimmet Bilgisi</th>
                                </tr>
                              </thead>
                              <tbody>
                                {tipEnvanterleri[tip.id].map((envanter) => (
                                  <tr key={envanter.id} className="border-b">
                                    <td className="py-2 px-3">{envanter.marka}</td>
                                    <td className="py-2 px-3">{envanter.model}</td>
                                    <td className="py-2 px-3">{envanter.seriNumarasi}</td>
                                    <td className="py-2 px-3">
                                      <span className={cn(
                                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                                        envanter.durum === 'Zimmetli' && "bg-green-100 text-green-800",
                                        envanter.durum === 'Depoda' && "bg-orange-100 text-orange-800",
                                        (envanter.durum === 'Arızalı' || envanter.durum === 'Kayıp') && "bg-red-100 text-red-800"
                                      )}>
                                        {envanter.durum}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3">
                                      {envanter.zimmetBilgisi ? (
                                        <div className="text-xs">
                                          <div className="font-medium">{envanter.zimmetBilgisi.calisanAd}</div>
                                          <div className="text-gray-500">
                                            {new Date(envanter.zimmetBilgisi.zimmetTarihi).toLocaleDateString('tr-TR')}
                                          </div>
                                        </div>
                                      ) : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500">Bu tipte envanter bulunamadı</div>
                        )
                      ) : (
                        <div className="text-center py-4 text-gray-500">Yükleniyor...</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {filteredTipler.length === 0 && (
                <div className="text-center py-8 text-gray-500">Envanter tipi bulunamadı</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTip ? 'Envanter Tipi Düzenle' : 'Yeni Envanter Tipi'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="ad">Tip Adı *</Label>
                <Input
                  id="ad"
                  value={formData.ad}
                  onChange={(e) => setFormData({ ...formData, ad: toTitleCase(e.target.value) })}
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
                {editingTip ? 'Güncelle' : 'Oluştur'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EnvanterTipleri