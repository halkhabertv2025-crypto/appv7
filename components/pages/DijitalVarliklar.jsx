'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Pencil, Trash2, Search, Key, Monitor, User, Calendar, Eye, EyeOff, Copy, FolderPlus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const DijitalVarliklar = ({ user }) => {
  const [dijitalVarliklar, setDijitalVarliklar] = useState([])
  const [filteredVarliklar, setFilteredVarliklar] = useState([])
  const [kategoriler, setKategoriler] = useState([])
  const [envanterler, setEnvanterler] = useState([])
  const [calisanlar, setCalisanlar] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [showKategoriDialog, setShowKategoriDialog] = useState(false)
  const [editingVarlik, setEditingVarlik] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterKategori, setFilterKategori] = useState('all')
  const [filterDurum, setFilterDurum] = useState('all')
  const [showPasswords, setShowPasswords] = useState({})
  const [formData, setFormData] = useState({
    ad: '',
    kategoriId: '',
    hesapEmail: '',
    hesapKullaniciAdi: '',
    hesapSifre: '',
    keyBilgisi: '',
    envanterId: '',
    calisanId: '',
    lisansTipi: 'Süresiz',
    baslangicTarihi: '',
    bitisTarihi: '',
    durum: 'Aktif',
    notlar: ''
  })
  const [kategoriFormData, setKategoriFormData] = useState({ ad: '', aciklama: '' })
  const { toast } = useToast()

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    let filtered = dijitalVarliklar

    if (searchTerm) {
      filtered = filtered.filter(dv =>
        dv.ad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dv.keyBilgisi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dv.calisanAd?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterKategori !== 'all') {
      filtered = filtered.filter(dv => dv.kategoriId === filterKategori)
    }

    if (filterDurum !== 'all') {
      filtered = filtered.filter(dv => dv.durum === filterDurum)
    }

    setFilteredVarliklar(filtered)
  }, [searchTerm, filterKategori, filterDurum, dijitalVarliklar])

  const fetchAll = async () => {
    await Promise.all([
      fetchDijitalVarliklar(),
      fetchKategoriler(),
      fetchEnvanterler(),
      fetchCalisanlar()
    ])
  }

  const fetchDijitalVarliklar = async () => {
    try {
      const response = await fetch('/api/dijital-varliklar')
      const data = await response.json()
      setDijitalVarliklar(data)
      setFilteredVarliklar(data)
    } catch (error) {
      toast({ title: 'Hata', description: 'Dijital varlıklar yüklenemedi', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const fetchKategoriler = async () => {
    try {
      const response = await fetch('/api/dijital-varlik-kategorileri')
      const data = await response.json()
      setKategoriler(data)
    } catch (error) {
      console.error('Kategoriler yüklenemedi')
    }
  }

  const fetchEnvanterler = async () => {
    try {
      const response = await fetch('/api/envanterler')
      const data = await response.json()
      // Sadece bilgisayar tipi envanterler (Laptop)
      const computers = data.filter(e => e.envanterTipiAd?.toLowerCase().includes('laptop') || e.envanterTipiAd?.toLowerCase().includes('bilgisayar'))
      setEnvanterler(data)
    } catch (error) {
      console.error('Envanterler yüklenemedi')
    }
  }

  const fetchCalisanlar = async () => {
    try {
      const response = await fetch('/api/calisanlar')
      const data = await response.json()
      setCalisanlar(data.filter(c => c.durum === 'Aktif'))
    } catch (error) {
      console.error('Çalışanlar yüklenemedi')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const url = editingVarlik
        ? `/api/dijital-varliklar/${editingVarlik.id}`
        : '/api/dijital-varliklar'

      const response = await fetch(url, {
        method: editingVarlik ? 'PUT' : 'POST',
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
        description: editingVarlik ? 'Dijital varlık güncellendi' : 'Dijital varlık oluşturuldu'
      })

      setShowDialog(false)
      resetForm()
      fetchDijitalVarliklar()
    } catch (error) {
      toast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' })
    }
  }

  const handleKategoriSubmit = async (e) => {
    e.preventDefault()

    try {
      const response = await fetch('/api/dijital-varlik-kategorileri', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...kategoriFormData,
          userId: user?.id,
          userName: user?.adSoyad
        })
      })

      const data = await response.json()

      if (!response.ok) {
        toast({ title: 'Hata', description: data.error, variant: 'destructive' })
        return
      }

      toast({ title: 'Başarılı', description: 'Kategori oluşturuldu' })
      setShowKategoriDialog(false)
      setKategoriFormData({ ad: '', aciklama: '' })
      fetchKategoriler()
    } catch (error) {
      toast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' })
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Bu dijital varlığı silmek istediğinize emin misiniz?')) return

    try {
      const response = await fetch(`/api/dijital-varliklar/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          userName: user?.adSoyad
        })
      })

      if (!response.ok) {
        toast({ title: 'Hata', description: 'Silme işlemi başarısız', variant: 'destructive' })
        return
      }

      toast({ title: 'Başarılı', description: 'Dijital varlık silindi' })
      fetchDijitalVarliklar()
    } catch (error) {
      toast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' })
    }
  }

  const resetForm = () => {
    setFormData({
      ad: '',
      kategoriId: '',
      hesapEmail: '',
      hesapKullaniciAdi: '',
      hesapSifre: '',
      keyBilgisi: '',
      envanterId: '',
      calisanId: '',
      lisansTipi: 'Süresiz',
      baslangicTarihi: '',
      bitisTarihi: '',
      durum: 'Aktif',
      notlar: ''
    })
    setEditingVarlik(null)
  }

  const openEditDialog = (varlik) => {
    setEditingVarlik(varlik)
    setFormData({
      ad: varlik.ad || '',
      kategoriId: varlik.kategoriId || '',
      hesapEmail: varlik.hesapEmail || '',
      hesapKullaniciAdi: varlik.hesapKullaniciAdi || '',
      hesapSifre: varlik.hesapSifre || '',
      keyBilgisi: varlik.keyBilgisi || '',
      envanterId: varlik.envanterId || '',
      calisanId: varlik.calisanId || '',
      lisansTipi: varlik.lisansTipi || 'Süresiz',
      baslangicTarihi: varlik.baslangicTarihi ? new Date(varlik.baslangicTarihi).toISOString().split('T')[0] : '',
      bitisTarihi: varlik.bitisTarihi ? new Date(varlik.bitisTarihi).toISOString().split('T')[0] : '',
      durum: varlik.durum || 'Aktif',
      notlar: varlik.notlar || ''
    })
    setShowDialog(true)
  }

  const togglePasswordVisibility = (id) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Kopyalandı', description: `${label} panoya kopyalandı` })
  }

  const getDurumColor = (durum) => {
    switch (durum) {
      case 'Aktif': return 'bg-green-100 text-green-800'
      case 'Pasif': return 'bg-gray-100 text-gray-800'
      case 'Süresi Dolmuş': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const isExpiringSoon = (bitisTarihi) => {
    if (!bitisTarihi) return false
    const diff = new Date(bitisTarihi) - new Date()
    const days = diff / (1000 * 60 * 60 * 24)
    return days > 0 && days <= 30
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Yükleniyor...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dijital Varlıklar</h1>
          <p className="text-gray-500 text-sm mt-1">Yazılım lisansları ve dijital varlık yönetimi</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowKategoriDialog(true)}
          >
            <FolderPlus size={20} className="mr-2" />
            Yeni Kategori
          </Button>
          <Button
            onClick={() => {
              resetForm()
              setShowDialog(true)
            }}
            className="bg-teal-500 hover:bg-teal-600"
          >
            <Plus size={20} className="mr-2" />
            Yeni Dijital Varlık
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  placeholder="Ara (ad, key, kullanıcı)..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Select value={filterKategori} onValueChange={setFilterKategori}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kategoriler</SelectItem>
                {kategoriler.map(kat => (
                  <SelectItem key={kat.id} value={kat.id}>{kat.ad}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDurum} onValueChange={setFilterDurum}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="Aktif">Aktif</SelectItem>
                <SelectItem value="Pasif">Pasif</SelectItem>
                <SelectItem value="Süresi Dolmuş">Süresi Dolmuş</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Toplam</p>
              <p className="text-2xl font-bold">{dijitalVarliklar.length}</p>
            </div>
            <Key className="text-teal-500" size={32} />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Aktif</p>
              <p className="text-2xl font-bold text-green-600">
                {dijitalVarliklar.filter(d => d.durum === 'Aktif').length}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Key className="text-green-600" size={20} />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Süresi Yaklaşan</p>
              <p className="text-2xl font-bold text-orange-600">
                {dijitalVarliklar.filter(d => isExpiringSoon(d.bitisTarihi)).length}
              </p>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Calendar className="text-orange-600" size={20} />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Süresi Dolmuş</p>
              <p className="text-2xl font-bold text-red-600">
                {dijitalVarliklar.filter(d => d.durum === 'Süresi Dolmuş').length}
              </p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Key className="text-red-600" size={20} />
            </div>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filteredVarliklar.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {dijitalVarliklar.length === 0 
                ? 'Henüz dijital varlık eklenmemiş' 
                : 'Arama kriterlerine uygun sonuç bulunamadı'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Varlık Adı</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Kategori</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Hesap/Key Bilgisi</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Kullanıldığı Cihaz</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Kullanıcı</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Lisans Dönemi</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Durum</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVarliklar.map((varlik) => (
                    <tr key={varlik.id} className={cn(
                      "border-b hover:bg-gray-50",
                      isExpiringSoon(varlik.bitisTarihi) && "bg-orange-50"
                    )}>
                      <td className="py-3 px-4">
                        <div className="font-medium">{varlik.ad}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {varlik.kategoriAd}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1 text-sm">
                          {varlik.hesapEmail && (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">Email:</span>
                              <span>{varlik.hesapEmail}</span>
                              <button onClick={() => copyToClipboard(varlik.hesapEmail, 'Email')} className="text-gray-400 hover:text-gray-600">
                                <Copy size={12} />
                              </button>
                            </div>
                          )}
                          {varlik.keyBilgisi && (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">Key:</span>
                              <span className="font-mono text-xs">
                                {showPasswords[varlik.id] ? varlik.keyBilgisi : '••••••••••'}
                              </span>
                              <button onClick={() => togglePasswordVisibility(varlik.id)} className="text-gray-400 hover:text-gray-600">
                                {showPasswords[varlik.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                              </button>
                              <button onClick={() => copyToClipboard(varlik.keyBilgisi, 'Key')} className="text-gray-400 hover:text-gray-600">
                                <Copy size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {varlik.envanterBilgisi ? (
                          <div className="flex items-center gap-2">
                            <Monitor size={16} className="text-gray-400" />
                            <span className="text-sm">
                              {varlik.envanterBilgisi.marka} {varlik.envanterBilgisi.model}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {varlik.calisanAd !== '-' ? (
                          <div className="flex items-center gap-2">
                            <User size={16} className="text-gray-400" />
                            <span className="text-sm">{varlik.calisanAd}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {varlik.lisansTipi === 'Süresiz' ? (
                          <span className="text-gray-500">Süresiz</span>
                        ) : (
                          <div>
                            <div>{varlik.baslangicTarihi ? new Date(varlik.baslangicTarihi).toLocaleDateString('tr-TR') : '-'}</div>
                            <div className={cn(
                              "text-xs",
                              isExpiringSoon(varlik.bitisTarihi) ? "text-orange-600 font-medium" : "text-gray-500"
                            )}>
                              → {varlik.bitisTarihi ? new Date(varlik.bitisTarihi).toLocaleDateString('tr-TR') : '-'}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          getDurumColor(varlik.durum)
                        )}>
                          {varlik.durum}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(varlik)}
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(varlik.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVarlik ? 'Dijital Varlık Düzenle' : 'Yeni Dijital Varlık'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="ad">Varlık Adı *</Label>
                <Input
                  id="ad"
                  value={formData.ad}
                  onChange={(e) => setFormData({ ...formData, ad: e.target.value })}
                  placeholder="Örn: Microsoft Office 365, Adobe Creative Cloud"
                  required
                />
              </div>

              <div>
                <Label htmlFor="kategoriId">Kategori *</Label>
                <Select
                  value={formData.kategoriId}
                  onValueChange={(value) => setFormData({ ...formData, kategoriId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {kategoriler.map(kat => (
                      <SelectItem key={kat.id} value={kat.id}>{kat.ad}</SelectItem>
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
                    <SelectItem value="Süresi Dolmuş">Süresi Dolmuş</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 border-t pt-4 mt-2">
                <h4 className="font-medium text-gray-700 mb-3">Hesap Bilgileri</h4>
              </div>

              <div>
                <Label htmlFor="hesapEmail">Hesap Email</Label>
                <Input
                  id="hesapEmail"
                  type="email"
                  value={formData.hesapEmail}
                  onChange={(e) => setFormData({ ...formData, hesapEmail: e.target.value })}
                  placeholder="ornek@email.com"
                />
              </div>

              <div>
                <Label htmlFor="hesapKullaniciAdi">Kullanıcı Adı</Label>
                <Input
                  id="hesapKullaniciAdi"
                  value={formData.hesapKullaniciAdi}
                  onChange={(e) => setFormData({ ...formData, hesapKullaniciAdi: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="hesapSifre">Hesap Şifresi</Label>
                <Input
                  id="hesapSifre"
                  type="password"
                  value={formData.hesapSifre}
                  onChange={(e) => setFormData({ ...formData, hesapSifre: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="keyBilgisi">Lisans Key / Seri No</Label>
                <Input
                  id="keyBilgisi"
                  value={formData.keyBilgisi}
                  onChange={(e) => setFormData({ ...formData, keyBilgisi: e.target.value })}
                  placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                />
              </div>

              <div className="col-span-2 border-t pt-4 mt-2">
                <h4 className="font-medium text-gray-700 mb-3">Kullanım Bilgileri</h4>
              </div>

              <div>
                <Label htmlFor="envanterId">Kullanıldığı Cihaz</Label>
                <Select
                  value={formData.envanterId || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, envanterId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Cihaz seçin (opsiyonel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seçilmedi</SelectItem>
                    {envanterler.map(env => (
                      <SelectItem key={env.id} value={env.id}>
                        {env.marka} {env.model} ({env.seriNumarasi})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="calisanId">Kullanan Kişi</Label>
                <Select
                  value={formData.calisanId || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, calisanId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kişi seçin (opsiyonel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seçilmedi</SelectItem>
                    {calisanlar.map(cal => (
                      <SelectItem key={cal.id} value={cal.id}>{cal.adSoyad}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 border-t pt-4 mt-2">
                <h4 className="font-medium text-gray-700 mb-3">Lisans Süresi</h4>
              </div>

              <div>
                <Label htmlFor="lisansTipi">Lisans Tipi</Label>
                <Select
                  value={formData.lisansTipi}
                  onValueChange={(value) => setFormData({ ...formData, lisansTipi: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Süresiz">Süresiz (Kalıcı)</SelectItem>
                    <SelectItem value="Yıllık">Yıllık</SelectItem>
                    <SelectItem value="Aylık">Aylık</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.lisansTipi !== 'Süresiz' && (
                <>
                  <div>
                    <Label htmlFor="baslangicTarihi">Başlangıç Tarihi</Label>
                    <Input
                      id="baslangicTarihi"
                      type="date"
                      value={formData.baslangicTarihi}
                      onChange={(e) => setFormData({ ...formData, baslangicTarihi: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bitisTarihi">Bitiş Tarihi</Label>
                    <Input
                      id="bitisTarihi"
                      type="date"
                      value={formData.bitisTarihi}
                      onChange={(e) => setFormData({ ...formData, bitisTarihi: e.target.value })}
                    />
                  </div>
                </>
              )}

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
                {editingVarlik ? 'Güncelle' : 'Oluştur'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Kategori Dialog */}
      <Dialog open={showKategoriDialog} onOpenChange={setShowKategoriDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Kategori Oluştur</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleKategoriSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="kategoriAd">Kategori Adı *</Label>
                <Input
                  id="kategoriAd"
                  value={kategoriFormData.ad}
                  onChange={(e) => setKategoriFormData({ ...kategoriFormData, ad: e.target.value })}
                  placeholder="Örn: Office, Antivirus, Adobe, Development"
                  required
                />
              </div>
              <div>
                <Label htmlFor="kategoriAciklama">Açıklama</Label>
                <Textarea
                  id="kategoriAciklama"
                  value={kategoriFormData.aciklama}
                  onChange={(e) => setKategoriFormData({ ...kategoriFormData, aciklama: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowKategoriDialog(false)}>
                İptal
              </Button>
              <Button type="submit" className="bg-teal-500 hover:bg-teal-600">
                Oluştur
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DijitalVarliklar
