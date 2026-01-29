'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Pencil, Trash2, Search, Filter, Download, Upload, UserPlus, Package, ChevronDown, ChevronRight, QrCode, Printer, History } from 'lucide-react'
import QRCode from 'qrcode'
import { useToast } from '@/hooks/use-toast'
import { cn, toTitleCase } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'

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
    notlar: '',
    // Financial fields
    alisFiyati: '',
    paraBirimi: 'TRY',
    alisTarihi: ''
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
  const [showQrDialog, setShowQrDialog] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [selectedEnvanterForQr, setSelectedEnvanterForQr] = useState(null)
  const [showGecmisDialog, setShowGecmisDialog] = useState(false)
  const [selectedEnvanterForGecmis, setSelectedEnvanterForGecmis] = useState(null)
  const [envanterGecmisi, setEnvanterGecmisi] = useState({ zimmetGecmisi: [], islemLoglari: [] })
  const [gecmisLoading, setGecmisLoading] = useState(false)
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

  // İşlem geçmişi fonksiyonları
  const fetchEnvanterGecmisi = async (envanterId) => {
    setGecmisLoading(true)
    try {
      const response = await fetch(`/api/envanterler/${envanterId}/gecmis`)
      const data = await response.json()
      if (response.ok) {
        setEnvanterGecmisi({
          zimmetGecmisi: data.zimmetGecmisi || [],
          islemLoglari: data.islemLoglari || []
        })
      } else {
        toast({ title: 'Hata', description: 'Geçmiş yüklenemedi', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Geçmiş yüklenemedi:', error)
      toast({ title: 'Hata', description: 'Geçmiş yüklenemedi', variant: 'destructive' })
    } finally {
      setGecmisLoading(false)
    }
  }

  const openGecmisDialog = async (envanter) => {
    setSelectedEnvanterForGecmis(envanter)
    setShowGecmisDialog(true)
    await fetchEnvanterGecmisi(envanter.id)
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

      // If status changed to Servis, auto-create a Bakım/Onarım record
      if (editingEnvanter && newDurum === 'Servis' && oldDurum !== 'Servis') {
        try {
          await fetch('/api/bakim-kayitlari', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              envanterId: editingEnvanter.id,
              arizaTuru: 'Bakım',
              aciklama: 'Servis için gönderildi',
              bildirilenTarih: new Date().toISOString(),
              durum: 'Serviste',
              userId: user?.id,
              userName: user?.adSoyad
            })
          })
          toast({
            title: 'Bilgi',
            description: 'Bakım/Onarım kaydı otomatik oluşturuldu'
          })
        } catch (err) {
          console.error('Bakım kaydı oluşturulamadı:', err)
        }
      }

      setShowDialog(false)
      setFormData({
        envanterTipiId: '',
        marka: '',
        model: '',
        seriNumarasi: '',
        durum: 'Depoda',
        notlar: '',
        alisFiyati: '',
        paraBirimi: 'TRY',
        alisTarihi: ''
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



  // Batch Selection Logic
  const [selectedEnvanterIds, setSelectedEnvanterIds] = useState(new Set())

  const toggleSelectAll = () => {
    if (selectedEnvanterIds.size === filteredEnvanterler.length) {
      setSelectedEnvanterIds(new Set())
    } else {
      setSelectedEnvanterIds(new Set(filteredEnvanterler.map(e => e.id)))
    }
  }

  const toggleSelect = (id) => {
    const newSelected = new Set(selectedEnvanterIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedEnvanterIds(newSelected)
  }

  const handleBatchPrintQr = async () => {
    if (selectedEnvanterIds.size === 0) {
      toast({ title: 'Hata', description: 'Lütfen en az bir envanter seçin', variant: 'destructive' })
      return
    }

    const selectedEnvanterler = filteredEnvanterler.filter(e => selectedEnvanterIds.has(e.id))

    // Generate QR codes for all
    const qrData = await Promise.all(selectedEnvanterler.map(async (envanter) => {
      const url = `${window.location.origin}/zimmet-dogrula/${envanter.id}`
      const qrDataUrl = await QRCode.toDataURL(url, { width: 150, margin: 1 })
      return { ...envanter, qrDataUrl }
    }))

    const printWindow = window.open('', '', 'width=800,height=800')
    printWindow.document.write(`
      <html>
        <head>
          <title>Toplu QR Etiketleri</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px;
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
            }
            .label-container {
              text-align: center;
              border: 1px solid #ccc;
              padding: 10px;
              width: 300px;
              height: auto;
              page-break-inside: avoid;
              box-sizing: border-box;
              margin-bottom: 20px;
            }
            .header {
              font-weight: bold;
              font-size: 16px;
              margin-bottom: 8px;
              border-bottom: 1px solid #ccc;
              padding-bottom: 4px;
            }
            .qr-image {
              margin: 5px 0;
            }
            .info {
              font-size: 12px;
              margin-top: 5px;
              text-align: left;
            }
            .info div {
              margin-bottom: 3px;
            }
            .label {
              font-weight: bold;
            }
            @media print {
              body {
                padding: 0;
              }
              .label-container {
                border: 1px dotted #ccc;
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          ${qrData.map(data => `
            <div class="label-container">
              <div class="header">Halk Tv Envanter</div>
              <img src="${data.qrDataUrl}" class="qr-image" width="120" height="120" />
              <div class="info">
                <div><span class="label">Envanter Adı:</span> ${data.envanterTipiAd} ${data.marka} ${data.model}</div>
                <div><span class="label">Envanterin Seri Numarası:</span> ${data.seriNumarasi}</div>
              </div>
            </div>
          `).join('')}
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }


  const handleQrCode = async (envanter) => {
    setSelectedEnvanterForQr(envanter)
    try {
      const url = `${window.location.origin}/zimmet-dogrula/${envanter.id}`
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
            <div class="header">Halk Tv Envanter</div>
            <img src="${qrCodeUrl}" class="qr-image" width="150" height="150" />
            <div class="info">
              <div><span class="label">Envanter Adı:</span> ${selectedEnvanterForQr.envanterTipiAd} ${selectedEnvanterForQr.marka} ${selectedEnvanterForQr.model}</div>
              <div><span class="label">Envanterin Seri Numarası:</span> ${selectedEnvanterForQr.seriNumarasi}</div>
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

  const handleDelete = async (id) => {
    if (!confirm('Bu envanteri silmek istediğinize emin misiniz?')) return

    try {
      const response = await fetch(`/api/envanterler/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          userName: user?.adSoyad,
          userRole: user?.adminYetkisi ? 'Admin' : (user?.yoneticiYetkisi ? 'Yönetici' : 'Çalışan')
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
      notlar: envanter.notlar || '',
      alisFiyati: envanter.alisFiyati?.toString() || '',
      paraBirimi: envanter.paraBirimi || 'TRY',
      alisTarihi: envanter.alisTarihi ? new Date(envanter.alisTarihi).toISOString().split('T')[0] : ''
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
      notlar: '',
      alisFiyati: '',
      paraBirimi: 'TRY',
      alisTarihi: ''
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
              <div className="mb-2 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBatchPrintQr}
                  disabled={selectedEnvanterIds.size === 0}
                >
                  <Printer className="mr-2" size={16} />
                  Seçilenleri Qr Kod Yazdır ({selectedEnvanterIds.size})
                </Button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-4 w-10">
                      <Checkbox
                        checked={filteredEnvanterler.length > 0 && selectedEnvanterIds.size === filteredEnvanterler.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="w-8"></th>
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
                    <>
                      <tr key={envanter.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <Checkbox
                            checked={selectedEnvanterIds.has(envanter.id)}
                            onCheckedChange={() => toggleSelect(envanter.id)}
                          />
                        </td>
                        <td className="py-3 px-2">
                          <button
                            onClick={() => toggleRow(envanter.id)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            {expandedRows[envanter.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </td>
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
                              onClick={() => openAksesuarDialog(envanter)}
                              title="Aksesuar Ekle"
                            >
                              <Package size={16} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openGecmisDialog(envanter)}
                              title="İşlem Geçmişi"
                            >
                              <History size={16} />
                            </Button>
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
                              onClick={() => handleQrCode(envanter)}
                              title="QR Kod Oluştur"
                            >
                              <QrCode size={16} />
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
                      {/* Aksesuar satırları */}
                      {expandedRows[envanter.id] && (
                        <tr key={`${envanter.id}-accessories`} className="bg-gray-50">
                          <td colSpan={9} className="py-2 px-4">
                            <div className="ml-6 p-3 bg-white rounded-lg border">
                              <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium text-sm text-gray-700">Aksesuarlar</h4>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openAksesuarDialog(envanter)}
                                  className="h-7 text-xs"
                                >
                                  <Plus size={14} className="mr-1" />
                                  Aksesuar Ekle
                                </Button>
                              </div>
                              {aksesuarlar[envanter.id]?.length > 0 ? (
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b text-gray-500">
                                      <th className="text-left py-1 px-2">Aksesuar Adı</th>
                                      <th className="text-left py-1 px-2">Marka</th>
                                      <th className="text-left py-1 px-2">Model</th>
                                      <th className="text-left py-1 px-2">Seri No</th>
                                      <th className="text-left py-1 px-2">Durum</th>
                                      <th className="text-right py-1 px-2">İşlem</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {aksesuarlar[envanter.id].map(aks => (
                                      <tr key={aks.id} className="border-b last:border-0">
                                        <td className="py-1 px-2">{aks.ad}</td>
                                        <td className="py-1 px-2">{aks.marka || '-'}</td>
                                        <td className="py-1 px-2">{aks.model || '-'}</td>
                                        <td className="py-1 px-2 font-mono text-xs">{aks.seriNumarasi || '-'}</td>
                                        <td className="py-1 px-2">
                                          <span className={cn(
                                            "inline-flex items-center px-1.5 py-0.5 rounded text-xs",
                                            aks.durum === 'Depoda' && "bg-orange-100 text-orange-700",
                                            aks.durum === 'Aktif' && "bg-green-100 text-green-700",
                                            aks.durum === 'Arızalı' && "bg-red-100 text-red-700"
                                          )}>
                                            {aks.durum}
                                          </span>
                                        </td>
                                        <td className="py-1 px-2 text-right">
                                          <div className="flex justify-end gap-1">
                                            <button
                                              onClick={() => openAksesuarDialog(envanter, aks)}
                                              className="p-1 hover:bg-gray-100 rounded"
                                            >
                                              <Pencil size={14} />
                                            </button>
                                            <button
                                              onClick={() => handleAksesuarDelete(envanter.id, aks.id)}
                                              className="p-1 hover:bg-red-100 rounded text-red-600"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <p className="text-gray-400 text-sm text-center py-2">Aksesuar bulunmuyor</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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
                  onChange={(e) => setFormData({ ...formData, marka: toTitleCase(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="model">Model *</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: toTitleCase(e.target.value) })}
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
                    <SelectItem value="Servis">Servis</SelectItem>
                    <SelectItem value="Kayıp">Kayıp</SelectItem>
                  </SelectContent>
                </Select>
                {editingEnvanter?.durum === 'Zimmetli' && (
                  <p className="text-xs text-orange-600 mt-1">
                    Zimmetli cihazın durumu değiştirilemez. Önce iade alın.
                  </p>
                )}
              </div>

              {/* Financial Section */}
              <div className="col-span-2 border-t pt-4 mt-2">
                <h4 className="font-medium text-gray-700 mb-3">Finansal Bilgiler</h4>
              </div>

              <div>
                <Label htmlFor="alisFiyati">Alış Fiyatı</Label>
                <Input
                  id="alisFiyati"
                  type="number"
                  value={formData.alisFiyati}
                  onChange={(e) => setFormData({ ...formData, alisFiyati: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="paraBirimi">Para Birimi</Label>
                <Select
                  value={formData.paraBirimi}
                  onValueChange={(value) => setFormData({ ...formData, paraBirimi: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">₺ TRY</SelectItem>
                    <SelectItem value="USD">$ USD</SelectItem>
                    <SelectItem value="EUR">€ EUR</SelectItem>
                    <SelectItem value="GBP">£ GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="alisTarihi">Alış Tarihi</Label>
                <Input
                  id="alisTarihi"
                  type="date"
                  value={formData.alisTarihi}
                  onChange={(e) => setFormData({ ...formData, alisTarihi: e.target.value })}
                />
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

      {/* QR Kod Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Kod Etiketi</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-4 border rounded-lg bg-white" id="qr-label">
            <h3 className="font-bold text-lg mb-2 border-b w-full text-center pb-2">Halk Tv Envanter</h3>
            {qrCodeUrl && (
              <img src={qrCodeUrl} alt="QR Code" width={200} height={200} className="mb-4" />
            )}
            <div className="w-full text-left space-y-2 text-sm">
              <div>
                <span className="font-bold block text-gray-700">Envanter Adı:</span>
                <span className="break-words">
                  {selectedEnvanterForQr && `${selectedEnvanterForQr.envanterTipiAd} ${selectedEnvanterForQr.marka} ${selectedEnvanterForQr.model}`}
                </span>
              </div>
              <div>
                <span className="font-bold block text-gray-700">Envanterin Seri Numarası:</span>
                <span className="font-mono">
                  {selectedEnvanterForQr?.seriNumarasi}
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
      {/* Aksesuar Dialog */}
      <Dialog open={showAksesuarDialog} onOpenChange={setShowAksesuarDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Package className="mr-2" size={20} />
              {editingAksesuar ? 'Aksesuar Düzenle' : 'Yeni Aksesuar Ekle'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAksesuarSubmit}>
            <div className="space-y-4">
              {selectedEnvanterForAksesuar && (
                <div className="p-3 bg-gray-50 rounded-lg text-sm">
                  <span className="font-medium">Ana Envanter:</span> {selectedEnvanterForAksesuar.marka} {selectedEnvanterForAksesuar.model}
                </div>
              )}
              <div>
                <Label htmlFor="aksesuarAd">Aksesuar Adı *</Label>
                <Input
                  id="aksesuarAd"
                  value={aksesuarFormData.ad}
                  onChange={(e) => setAksesuarFormData({ ...aksesuarFormData, ad: e.target.value })}
                  placeholder="Örn: Adaptör, Mouse, Çanta"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="aksesuarMarka">Marka</Label>
                  <Input
                    id="aksesuarMarka"
                    value={aksesuarFormData.marka}
                    onChange={(e) => setAksesuarFormData({ ...aksesuarFormData, marka: toTitleCase(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="aksesuarModel">Model</Label>
                  <Input
                    id="aksesuarModel"
                    value={aksesuarFormData.model}
                    onChange={(e) => setAksesuarFormData({ ...aksesuarFormData, model: toTitleCase(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="aksesuarSeriNo">Seri Numarası</Label>
                <Input
                  id="aksesuarSeriNo"
                  value={aksesuarFormData.seriNumarasi}
                  onChange={(e) => setAksesuarFormData({ ...aksesuarFormData, seriNumarasi: e.target.value })}
                  placeholder="Aksesuar seri numarası"
                />
              </div>
              <div>
                <Label htmlFor="aksesuarDurum">Durum</Label>
                <Select
                  value={aksesuarFormData.durum}
                  onValueChange={(value) => setAksesuarFormData({ ...aksesuarFormData, durum: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Depoda">Depoda</SelectItem>
                    <SelectItem value="Aktif">Aktif</SelectItem>
                    <SelectItem value="Arızalı">Arızalı</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowAksesuarDialog(false)}>
                İptal
              </Button>
              <Button type="submit" className="bg-teal-500 hover:bg-teal-600">
                {editingAksesuar ? 'Güncelle' : 'Ekle'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* İşlem Geçmişi Dialog */}
      <Dialog open={showGecmisDialog} onOpenChange={setShowGecmisDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <History className="mr-2" size={20} />
              İşlem Geçmişi
            </DialogTitle>
          </DialogHeader>
          
          {selectedEnvanterForGecmis && (
            <div className="p-3 bg-gray-50 rounded-lg mb-4">
              <div className="text-sm">
                <span className="font-medium">{selectedEnvanterForGecmis.envanterTipiAd}</span>
                {' '}{selectedEnvanterForGecmis.marka} {selectedEnvanterForGecmis.model}
              </div>
              <div className="text-xs text-gray-500 font-mono mt-1">
                Seri No: {selectedEnvanterForGecmis.seriNumarasi}
              </div>
            </div>
          )}

          <div className="overflow-y-auto max-h-[50vh]">
            {gecmisLoading ? (
              <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
            ) : (
              <div className="space-y-4">
                {/* Zimmet Geçmişi */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-teal-500 rounded-full mr-2"></span>
                    Zimmet Geçmişi
                  </h4>
                  
                  {envanterGecmisi.zimmetGecmisi.length > 0 ? (
                    <div className="space-y-3">
                      {envanterGecmisi.zimmetGecmisi.map((zimmet, index) => (
                        <div 
                          key={zimmet.id || index} 
                          className={cn(
                            "p-4 rounded-lg border-l-4",
                            zimmet.durum === 'Aktif' 
                              ? "bg-green-50 border-green-500" 
                              : "bg-gray-50 border-gray-300"
                          )}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-gray-800">
                                {zimmet.calisanAd}
                              </div>
                              <div className="text-sm text-gray-500">
                                {zimmet.departmanAd}
                              </div>
                            </div>
                            <span className={cn(
                              "px-2 py-1 rounded text-xs font-medium",
                              zimmet.durum === 'Aktif' 
                                ? "bg-green-100 text-green-800" 
                                : "bg-gray-100 text-gray-600"
                            )}>
                              {zimmet.durum}
                            </span>
                          </div>
                          
                          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-500">Zimmet Tarihi:</span>
                              <span className="ml-2 font-medium">
                                {zimmet.zimmetTarihi 
                                  ? new Date(zimmet.zimmetTarihi).toLocaleDateString('tr-TR')
                                  : '-'
                                }
                              </span>
                            </div>
                            {zimmet.iadeTarihi && (
                              <div>
                                <span className="text-gray-500">İade Tarihi:</span>
                                <span className="ml-2 font-medium">
                                  {new Date(zimmet.iadeTarihi).toLocaleDateString('tr-TR')}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {zimmet.iadeAlanYetkili && (
                            <div className="mt-2 text-sm">
                              <span className="text-gray-500">İade Alan:</span>
                              <span className="ml-2 font-medium text-gray-700">
                                {zimmet.iadeAlanYetkili.adSoyad}
                              </span>
                            </div>
                          )}
                          
                          {zimmet.aciklama && (
                            <div className="mt-2 text-sm text-gray-600 italic">
                              "{zimmet.aciklama}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-400 bg-gray-50 rounded-lg">
                      Henüz zimmet geçmişi bulunmuyor
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowGecmisDialog(false)}>
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Envanterler
