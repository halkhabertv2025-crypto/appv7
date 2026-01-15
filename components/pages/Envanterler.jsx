'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Pencil, Trash2, Search, Filter, Download, Upload, UserPlus, Package, ChevronDown, ChevronRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const Envanterler = ({ user }) => {
  const [envanterler, setEnvanterler] = useState([])
  const [filteredEnvanterler, setFilteredEnvanterler] = useState([])
  const [envanterTipleri, setEnvanterTipleri] = useState([])
  const [calisanlar, setCalisanlar] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [showZimmetDialog, setShowZimmetDialog] = useState(false)
  const [showAksesuarDialog, setShowAksesuarDialog] = useState(false)
  const [editingEnvanter, setEditingEnvanter] = useState(null)
  const [selectedEnvanterForZimmet, setSelectedEnvanterForZimmet] = useState(null)
  const [selectedEnvanterForAksesuar, setSelectedEnvanterForAksesuar] = useState(null)
  const [editingAksesuar, setEditingAksesuar] = useState(null)
  const [expandedRows, setExpandedRows] = useState({})
  const [aksesuarlar, setAksesuarlar] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDurum, setFilterDurum] = useState('all')
  const [filterTip, setFilterTip] = useState('all')
  const [formData, setFormData] = useState({
    envanterTipiId: '',
    marka: '',
    model: '',
    seriNumarasi: '',
    durum: 'Depoda',
    notlar: ''
  })
  const [zimmetFormData, setZimmetFormData] = useState({
    calisanId: '',
    zimmetTarihi: new Date().toISOString().split('T')[0],
    aciklama: ''
  })
  const [aksesuarFormData, setAksesuarFormData] = useState({
    ad: '',
    marka: '',
    model: '',
    seriNumarasi: '',
    durum: 'Depoda'
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchEnvanterler()
    fetchEnvanterTipleri()
    fetchCalisanlar()
  }, [])

  useEffect(() => {
    let filtered = envanterler

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(env => 
        env.marka.toLowerCase().includes(searchTerm.toLowerCase()) ||
        env.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        env.seriNumarasi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        env.envanterTipiAd.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (filterDurum !== 'all') {
      filtered = filtered.filter(env => env.durum === filterDurum)
    }

    // Type filter
    if (filterTip !== 'all') {
      filtered = filtered.filter(env => env.envanterTipiId === filterTip)
    }

    setFilteredEnvanterler(filtered)
  }, [searchTerm, filterDurum, filterTip, envanterler])

  const fetchEnvanterler = async () => {
    try {
      const response = await fetch('/api/envanterler')
      const data = await response.json()
      setEnvanterler(data)
      setFilteredEnvanterler(data)
    } catch (error) {
      toast({ title: 'Hata', description: 'Envanterler yüklenemedi', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const fetchEnvanterTipleri = async () => {
    try {
      const response = await fetch('/api/envanter-tipleri')
      const data = await response.json()
      setEnvanterTipleri(data)
    } catch (error) {
      console.error('Envanter tipleri yüklenemedi')
    }
  }

  const fetchCalisanlar = async () => {
    try {
      const response = await fetch('/api/calisanlar')
      const data = await response.json()
      const active = data.filter(cal => cal.durum === 'Aktif')
      setCalisanlar(active)
    } catch (error) {
      console.error('Çalışanlar yüklenemedi')
    }
  }

  // Aksesuar fonksiyonları
  const fetchAksesuarlar = async (envanterId) => {
    try {
      const response = await fetch(`/api/envanterler/${envanterId}/accessories`)
      const data = await response.json()
      setAksesuarlar(prev => ({ ...prev, [envanterId]: data }))
    } catch (error) {
      console.error('Aksesuarlar yüklenemedi')
    }
  }

  const toggleRow = async (envanterId) => {
    const newExpanded = { ...expandedRows, [envanterId]: !expandedRows[envanterId] }
    setExpandedRows(newExpanded)
    
    if (newExpanded[envanterId] && !aksesuarlar[envanterId]) {
      await fetchAksesuarlar(envanterId)
    }
  }

  const openAksesuarDialog = (envanter, aksesuar = null) => {
    setSelectedEnvanterForAksesuar(envanter)
    setEditingAksesuar(aksesuar)
    if (aksesuar) {
      setAksesuarFormData({
        ad: aksesuar.ad || '',
        marka: aksesuar.marka || '',
        model: aksesuar.model || '',
        seriNumarasi: aksesuar.seriNumarasi || '',
        durum: aksesuar.durum || 'Depoda'
      })
    } else {
      setAksesuarFormData({
        ad: '',
        marka: '',
        model: '',
        seriNumarasi: '',
        durum: 'Depoda'
      })
    }
    setShowAksesuarDialog(true)
  }

  const handleAksesuarSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const url = editingAksesuar
        ? `/api/envanterler/${selectedEnvanterForAksesuar.id}/accessories/${editingAksesuar.id}`
        : `/api/envanterler/${selectedEnvanterForAksesuar.id}/accessories`
      
      const response = await fetch(url, {
        method: editingAksesuar ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aksesuarFormData)
      })

      const data = await response.json()

      if (!response.ok) {
        toast({ title: 'Hata', description: data.error, variant: 'destructive' })
        return
      }

      toast({ 
        title: 'Başarılı', 
        description: editingAksesuar ? 'Aksesuar güncellendi' : 'Aksesuar eklendi' 
      })
      
      setShowAksesuarDialog(false)
      fetchAksesuarlar(selectedEnvanterForAksesuar.id)
    } catch (error) {
      toast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' })
    }
  }

  const handleAksesuarDelete = async (envanterId, aksesuarId) => {
    if (!confirm('Bu aksesuarı silmek istediğinize emin misiniz?')) return

    try {
      const response = await fetch(`/api/envanterler/${envanterId}/accessories/${aksesuarId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        toast({ title: 'Hata', description: 'Aksesuar silinemedi', variant: 'destructive' })
        return
      }

      toast({ title: 'Başarılı', description: 'Aksesuar silindi' })
      fetchAksesuarlar(envanterId)
    } catch (error) {
      toast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Eğer düzenleme modundaysa ve durum "Zimmetli" olarak değiştirilmişse
    if (editingEnvanter && formData.durum === 'Zimmetli' && editingEnvanter.durum !== 'Zimmetli') {
      // Zimmet dialog'unu aç
      setSelectedEnvanterForZimmet(editingEnvanter)
      setZimmetFormData({
        calisanId: '',
        zimmetTarihi: new Date().toISOString().split('T')[0],
        aciklama: ''
      })
      setShowDialog(false)
      setShowZimmetDialog(true)
      return
    }
    
    try {
      const url = editingEnvanter 
        ? `/api/envanterler/${editingEnvanter.id}`
        : '/api/envanterler'
      
      // Audit log için eski ve yeni durumu kaydet
      const oldDurum = editingEnvanter?.durum
      const newDurum = formData.durum
      
      const response = await fetch(url, {
        method: editingEnvanter ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          // Audit log bilgileri
          userId: user?.id,
          userName: user?.adSoyad,
          oldDurum: oldDurum,
          logStatusChange: editingEnvanter && oldDurum !== newDurum
        })
      })

      const data = await response.json()

      if (!response.ok) {
        toast({ title: 'Hata', description: data.error, variant: 'destructive' })
        return
      }

      toast({ 
        title: 'Başarılı', 
        description: editingEnvanter ? 'Envanter güncellendi' : 'Envanter oluşturuldu' 
      })
      
      setShowDialog(false)
      setFormData({
        envanterTipiId: '',
        marka: '',
        model: '',
        seriNumarasi: '',
        durum: 'Depoda',
        notlar: ''
      })
      setEditingEnvanter(null)
      fetchEnvanterler()
    } catch (error) {
      toast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' })
    }
  }

  // Zimmet oluşturma
  const handleZimmetSubmit = async (e) => {
    e.preventDefault()
    
    if (!zimmetFormData.calisanId) {
      toast({ title: 'Hata', description: 'Lütfen bir çalışan seçin', variant: 'destructive' })
      return
    }
    
    try {
      const response = await fetch('/api/zimmetler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          envanterId: selectedEnvanterForZimmet.id,
          calisanId: zimmetFormData.calisanId,
          zimmetTarihi: zimmetFormData.zimmetTarihi,
          aciklama: zimmetFormData.aciklama,
          userId: user?.id,
          userName: user?.adSoyad
        })
      })

      const data = await response.json()

      if (!response.ok) {
        toast({ title: 'Hata', description: data.error, variant: 'destructive' })
        return
      }

      toast({ title: 'Başarılı', description: 'Envanter zimmetlendi' })
      
      setShowZimmetDialog(false)
      setSelectedEnvanterForZimmet(null)
      setZimmetFormData({
        calisanId: '',
        zimmetTarihi: new Date().toISOString().split('T')[0],
        aciklama: ''
      })
      setEditingEnvanter(null)
      fetchEnvanterler()
    } catch (error) {
      toast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' })
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Bu envanteri silmek istediğinize emin misiniz?')) return

    try {
      const response = await fetch(`/api/envanterler/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          userName: user?.adSoyad
        })
      })

      if (!response.ok) {
        toast({ title: 'Hata', description: 'Envanter silinemedi', variant: 'destructive' })
        return
      }

      toast({ title: 'Başarılı', description: 'Envanter silindi' })
      fetchEnvanterler()
    } catch (error) {
      toast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' })
    }
  }

  const handleExport = () => {
    const csv = [
      ['Tip', 'Marka', 'Model', 'Seri Numarası', 'Durum', 'Zimmetli Kişi', 'Zimmet Tarihi', 'Notlar'].join(','),
      ...filteredEnvanterler.map(env => [
        env.envanterTipiAd,
        env.marka,
        env.model,
        env.seriNumarasi,
        env.durum,
        env.zimmetBilgisi?.calisanAd || '',
        env.zimmetBilgisi?.zimmetTarihi ? new Date(env.zimmetBilgisi.zimmetTarihi).toLocaleDateString('tr-TR') : '',
        env.notlar
      ].join(','))
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `envanterler_${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    toast({ title: 'Başarılı', description: 'Envanter listesi dışa aktarıldı' })
  }

  const openEditDialog = (envanter) => {
    setEditingEnvanter(envanter)
    setFormData({
      envanterTipiId: envanter.envanterTipiId,
      marka: envanter.marka,
      model: envanter.model,
      seriNumarasi: envanter.seriNumarasi,
      durum: envanter.durum,
      notlar: envanter.notlar
    })
    setShowDialog(true)
  }

  const openCreateDialog = () => {
    setEditingEnvanter(null)
    setFormData({
      envanterTipiId: '',
      marka: '',
      model: '',
      seriNumarasi: '',
      durum: 'Depoda',
      notlar: ''
    })
    setShowDialog(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Envanterler</h2>
          <p className="text-gray-500">Envanter listesi ve yönetimi</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleExport} variant="outline">
            <Download size={20} className="mr-2" />
            Dışarı Aktar
          </Button>
          <Button onClick={openCreateDialog} className="bg-teal-500 hover:bg-teal-600">
            <Plus size={20} className="mr-2" />
            Yeni Envanter Oluştur
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  placeholder="Envanter ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Select value={filterTip} onValueChange={setFilterTip}>
                <SelectTrigger>
                  <SelectValue placeholder="Tip seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Tipler</SelectItem>
                  {envanterTipleri.map(tip => (
                    <SelectItem key={tip.id} value={tip.id}>{tip.ad}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={filterDurum} onValueChange={setFilterDurum}>
                <SelectTrigger>
                  <SelectValue placeholder="Durum seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="Depoda">Depoda</SelectItem>
                  <SelectItem value="Zimmetli">Zimmetli</SelectItem>
                  <SelectItem value="Arızalı">Arızalı</SelectItem>
                  <SelectItem value="Kayıp">Kayıp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Yükleniyor...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Envanter Tipi</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Marka</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Model</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Seri Numarası</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Durum</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Zimmetli Kişi</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Zimmet Tarihi</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnvanterler.map((envanter) => (
                    <tr key={envanter.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-medium">{envanter.envanterTipiAd}</td>
                      <td className="py-3 px-4 text-sm">{envanter.marka}</td>
                      <td className="py-3 px-4 text-sm">{envanter.model}</td>
                      <td className="py-3 px-4 text-sm font-mono">{envanter.seriNumarasi}</td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          envanter.durum === 'Zimmetli' && "bg-green-100 text-green-800",
                          envanter.durum === 'Depoda' && "bg-orange-100 text-orange-800",
                          (envanter.durum === 'Arızalı' || envanter.durum === 'Kayıp') && "bg-red-100 text-red-800"
                        )}>
                          {envanter.durum}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {envanter.zimmetBilgisi?.calisanAd || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {envanter.zimmetBilgisi?.zimmetTarihi 
                          ? new Date(envanter.zimmetBilgisi.zimmetTarihi).toLocaleDateString('tr-TR')
                          : '-'
                        }
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditDialog(envanter)}
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDelete(envanter.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredEnvanterler.length === 0 && (
                <div className="text-center py-8 text-gray-500">Envanter bulunamadı</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingEnvanter ? 'Envanter Düzenle' : 'Yeni Envanter Oluştur'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="envanterTipiId">Envanter Tipi *</Label>
                <Select 
                  value={formData.envanterTipiId} 
                  onValueChange={(value) => setFormData({ ...formData, envanterTipiId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Envanter tipi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {envanterTipleri.map(tip => (
                      <SelectItem key={tip.id} value={tip.id}>{tip.ad}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="marka">Marka *</Label>
                <Input
                  id="marka"
                  value={formData.marka}
                  onChange={(e) => setFormData({ ...formData, marka: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="model">Model *</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="seriNumarasi">Seri Numarası *</Label>
                <Input
                  id="seriNumarasi"
                  value={formData.seriNumarasi}
                  onChange={(e) => setFormData({ ...formData, seriNumarasi: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="durum">Durum</Label>
                <Select 
                  value={formData.durum} 
                  onValueChange={(value) => setFormData({ ...formData, durum: value })}
                  disabled={editingEnvanter?.durum === 'Zimmetli'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Depoda">Depoda</SelectItem>
                    {/* Zimmetli seçeneği sadece envanter zimmetliyse görünür */}
                    {editingEnvanter?.durum === 'Zimmetli' && (
                      <SelectItem value="Zimmetli">Zimmetli</SelectItem>
                    )}
                    {/* Zimmetli değilse, zimmetle seçeneği göster */}
                    {editingEnvanter && editingEnvanter.durum !== 'Zimmetli' && (
                      <SelectItem value="Zimmetli">Zimmetle</SelectItem>
                    )}
                    <SelectItem value="Arızalı">Arızalı</SelectItem>
                    <SelectItem value="Kayıp">Kayıp</SelectItem>
                  </SelectContent>
                </Select>
                {editingEnvanter?.durum === 'Zimmetli' && (
                  <p className="text-xs text-orange-600 mt-1">
                    Zimmetli cihazın durumu değiştirilemez. Önce iade alın.
                  </p>
                )}
              </div>
              <div className="col-span-2">
                <Label htmlFor="notlar">Notlar</Label>
                <Textarea
                  id="notlar"
                  value={formData.notlar}
                  onChange={(e) => setFormData({ ...formData, notlar: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                İptal
              </Button>
              <Button type="submit" className="bg-teal-500 hover:bg-teal-600">
                {editingEnvanter ? 'Güncelle' : 'Oluştur'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Zimmetleme Dialog */}
      <Dialog open={showZimmetDialog} onOpenChange={setShowZimmetDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <UserPlus className="mr-2" size={20} />
              Envanter Zimmetle
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleZimmetSubmit}>
            <div className="space-y-4">
              {selectedEnvanterForZimmet && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm space-y-1">
                    <div><span className="font-medium">Envanter:</span> {selectedEnvanterForZimmet.envanterTipiAd} {selectedEnvanterForZimmet.marka} {selectedEnvanterForZimmet.model}</div>
                    <div><span className="font-medium">Seri No:</span> {selectedEnvanterForZimmet.seriNumarasi}</div>
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="calisanId">Zimmetlenecek Çalışan *</Label>
                <Select 
                  value={zimmetFormData.calisanId} 
                  onValueChange={(value) => setZimmetFormData({ ...zimmetFormData, calisanId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Çalışan seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {calisanlar.map(cal => (
                      <SelectItem key={cal.id} value={cal.id}>
                        {cal.adSoyad} ({cal.departmanAd})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="zimmetTarihi">Zimmet Tarihi *</Label>
                <Input
                  id="zimmetTarihi"
                  type="date"
                  value={zimmetFormData.zimmetTarihi}
                  onChange={(e) => setZimmetFormData({ ...zimmetFormData, zimmetTarihi: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="aciklama">Açıklama</Label>
                <Textarea
                  id="aciklama"
                  value={zimmetFormData.aciklama}
                  onChange={(e) => setZimmetFormData({ ...zimmetFormData, aciklama: e.target.value })}
                  rows={2}
                  placeholder="Ek bilgiler veya notlar..."
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => {
                setShowZimmetDialog(false)
                setSelectedEnvanterForZimmet(null)
              }}>
                İptal
              </Button>
              <Button type="submit" className="bg-teal-500 hover:bg-teal-600">
                Zimmetle
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Envanterler
