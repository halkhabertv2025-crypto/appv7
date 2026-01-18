'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, Trash2, Search, Key, Shield, Eye, QrCode } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Checkbox } from '@/components/ui/checkbox'
import CalisanDetay from './CalisanDetay'
import QRCode from 'qrcode'

const Calisanlar = ({ user }) => {
  const [calisanlar, setCalisanlar] = useState([])
  const [filteredCalisanlar, setFilteredCalisanlar] = useState([])
  const [departmanlar, setDepartmanlar] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showDetayPanel, setShowDetayPanel] = useState(false)
  const [editingCalisan, setEditingCalisan] = useState(null)
  const [selectedCalisan, setSelectedCalisan] = useState(null)
  const [detayCalisan, setDetayCalisan] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showQrDialog, setShowQrDialog] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [selectedZimmetForQr, setSelectedZimmetForQr] = useState(null)
  const [selectedCalisanForQr, setSelectedCalisanForQr] = useState(null)
  const [yeniSifre, setYeniSifre] = useState('')
  const [formData, setFormData] = useState({
    adSoyad: '',
    email: '',
    telefon: '',
    departmanId: '',
    durum: 'Aktif',
    yoneticiYetkisi: false,
    adminYetkisi: false
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
        description: editingCalisan ? 'Çalışan güncellendi' : 'Çalışan oluşturuldu'
      })

      setShowDialog(false)
      setFormData({ adSoyad: '', email: '', telefon: '', departmanId: '', durum: 'Aktif', yoneticiYetkisi: false, adminYetkisi: false })
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
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          userName: user?.adSoyad
        })
      })

      const data = await response.json()

      if (!response.ok) {
        toast({ title: 'Hata', description: data.error || 'Çalışan silinemedi', variant: 'destructive' })
        return
      }

      toast({ title: 'Başarılı', description: 'Çalışan silindi' })
      fetchCalisanlar()
    } catch (error) {
      toast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' })
    }
  }

  const handleResetPassword = async () => {
    if (!yeniSifre) {
      toast({ title: 'Hata', description: 'Yeni şifre giriniz', variant: 'destructive' })
      return
    }

    try {
      const response = await fetch(`/api/calisanlar/${selectedCalisan.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yeniSifre })
      })

      if (!response.ok) {
        toast({ title: 'Hata', description: 'Şifre sıfırlanamadı', variant: 'destructive' })
        return
      }

      toast({ title: 'Başarılı', description: 'Şifre başarıyla sıfırlandı' })
      setShowPasswordDialog(false)
      setYeniSifre('')
      setSelectedCalisan(null)
    } catch (error) {
      toast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' })
    }
  }

  const openPasswordDialog = (calisan) => {
    setSelectedCalisan(calisan)
    setYeniSifre('')
    setShowPasswordDialog(true)
  }

  const openDetayPanel = (calisan) => {
    setDetayCalisan(calisan)
    setShowDetayPanel(true)
  }

  const closeDetayPanel = () => {
    setShowDetayPanel(false)
    setDetayCalisan(null)
    fetchCalisanlar() // Refresh data after potential changes
  }

  const openEditDialog = (calisan) => {
    setEditingCalisan(calisan)
    setFormData({
      adSoyad: calisan.adSoyad,
      email: calisan.email,
      telefon: calisan.telefon,
      departmanId: calisan.departmanId,
      durum: calisan.durum,
      yoneticiYetkisi: calisan.yoneticiYetkisi || false,
      adminYetkisi: calisan.adminYetkisi || false
    })
    setShowDialog(true)
  }

  const handleQrCode = async (calisan) => {
    try {
      setSelectedCalisanForQr(calisan)

      const url = `${window.location.origin}/calisan-dogrula/${calisan.id}`
      const qrDataUrl = await QRCode.toDataURL(url, { width: 200, margin: 1 })
      setQrCodeUrl(qrDataUrl)
      setShowQrDialog(true)

    } catch (err) {
      console.error(err)
      toast({ title: 'Hata', description: 'QR Kod oluşturulamadı', variant: 'destructive' })
    }
  }

  const handlePrintQr = () => {
    const printWindow = window.open('', '', 'width=600,height=600')
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Kod Etiketi</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 100vh; 
              margin: 0; 
            }
            .label-container {
              text-align: center;
              border: 2px solid #000;
              padding: 20px;
              width: 300px;
            }
            .header {
              font-weight: bold;
              font-size: 18px;
              margin-bottom: 10px;
              border-bottom: 1px solid #ccc;
              padding-bottom: 5px;
            }
            .qr-image {
              margin: 10px 0;
            }
            .info {
              font-size: 14px;
              margin-top: 10px;
              text-align: left;
            }
            .info div {
              margin-bottom: 5px;
            }
            .label {
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="label-container">
            <div class="header">Halk Tv İnsan Kaynakları</div>
            <img src="${qrCodeUrl}" class="qr-image" width="150" height="150" />
            <div class="info">
              <div><span class="label">Çalışanlar Bilgileri:</span> ${selectedCalisanForQr?.adSoyad}</div>
              <div><span class="label">Departman:</span> ${selectedCalisanForQr?.departmanAd}</div>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const openCreateDialog = () => {
    setEditingCalisan(null)
    setFormData({ adSoyad: '', email: '', telefon: '', departmanId: '', durum: 'Aktif', yoneticiYetkisi: false, adminYetkisi: false })
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
                      <td className="py-3 px-4 text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <span className={calisan.zimmetliMi ? 'text-red-600 font-semibold' : ''}>
                            {calisan.adSoyad}
                          </span>
                          {calisan.zimmetliMi && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                              {calisan.aktifZimmetSayisi} Zimmet
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{calisan.email || '-'}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{calisan.telefon || '-'}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{calisan.departmanAd}</td>
                      <td className="py-3 px-4">
                        {calisan.adminYetkisi ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            <Shield size={12} className="mr-1" />
                            Admin
                          </span>
                        ) : calisan.yoneticiYetkisi ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Yönetici
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${calisan.durum === 'Aktif' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                          {calisan.durum}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetayPanel(calisan)}
                            title="Detayları Görüntüle"
                          >
                            <Eye size={16} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQrCode(calisan)}
                            title="QR Kod Oluştur"
                            disabled={!calisan.zimmetliMi}
                          >
                            <QrCode size={16} />
                          </Button>
                          {user?.adminYetkisi && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openPasswordDialog(calisan)}
                              title="Şifre Sıfırla"
                            >
                              <Key size={16} />
                            </Button>
                          )}
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
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="yoneticiYetkisi"
                  checked={formData.yoneticiYetkisi}
                  onCheckedChange={(checked) => setFormData({ ...formData, yoneticiYetkisi: checked })}
                />
                <Label htmlFor="yoneticiYetkisi" className="text-sm font-normal cursor-pointer">
                  Yönetici Yetkisi (Zimmet iadesi alabilir)
                </Label>
              </div>
              {user?.adminYetkisi && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="adminYetkisi"
                    checked={formData.adminYetkisi}
                    onCheckedChange={(checked) => setFormData({ ...formData, adminYetkisi: checked })}
                  />
                  <Label htmlFor="adminYetkisi" className="text-sm font-normal cursor-pointer">
                    Admin Yetkisi (Yönetici atayabilir, şifre sıfırlayabilir)
                  </Label>
                </div>
              )}
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

      {/* Şifre Sıfırlama Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Şifre Sıfırla</DialogTitle>
          </DialogHeader>
          {selectedCalisan && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm">
                  <strong>{selectedCalisan.adSoyad}</strong> için yeni şifre belirleyin
                </div>
              </div>
              <div>
                <Label htmlFor="yeniSifre">Yeni Şifre *</Label>
                <Input
                  id="yeniSifre"
                  type="text"
                  value={yeniSifre}
                  onChange={(e) => setYeniSifre(e.target.value)}
                  placeholder="Yeni şifre giriniz"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPasswordDialog(false)}
                >
                  İptal
                </Button>
                <Button
                  onClick={handleResetPassword}
                  className="bg-teal-500 hover:bg-teal-600"
                >
                  Şifreyi Sıfırla
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Çalışan Detay Panel */}
      {showDetayPanel && detayCalisan && (
        <CalisanDetay
          calisan={detayCalisan}
          onClose={closeDetayPanel}
          user={user}
        />
      )}

      {/* QR Kod Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Kod Etiketi</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-4 border rounded-lg bg-white" id="qr-label">
            <h3 className="font-bold text-lg mb-2 border-b w-full text-center pb-2">Halk Tv İnsan Kaynakları</h3>
            {qrCodeUrl && (
              <img src={qrCodeUrl} alt="QR Code" width={200} height={200} className="mb-4" />
            )}
            <div className="w-full text-left space-y-2 text-sm">
              <div>
                <span className="font-bold block text-gray-700">Çalışanlar Bilgileri:</span>
                <span className="break-words">
                  {selectedCalisanForQr?.adSoyad}
                </span>
              </div>
              <div>
                <span className="font-bold block text-gray-700">Departman:</span>
                <span className="font-mono">
                  {selectedCalisanForQr?.departmanAd}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQrDialog(false)}>
              Kapat
            </Button>
            <Button onClick={handlePrintQr} className="bg-teal-500 hover:bg-teal-600">
              Yazdır
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Calisanlar