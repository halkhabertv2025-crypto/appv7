'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Plus, Search, Download, CheckCircle, FileText, Check, ChevronsUpDown, Eye } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import jsPDF from 'jspdf'

const Zimmetler = ({ user }) => {
  const [zimmetler, setZimmetler] = useState([])
  const [filteredZimmetler, setFilteredZimmetler] = useState([])
  const [envanterler, setEnvanterler] = useState([])
  const [calisanlar, setCalisanlar] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [showIadeDialog, setShowIadeDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [selectedZimmet, setSelectedZimmet] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [envanterOpen, setEnvanterOpen] = useState(false)
  const [calisanOpen, setCalisanOpen] = useState(false)
  const [formData, setFormData] = useState({
    envanterId: '',
    calisanId: '',
    zimmetTarihi: new Date().toISOString().split('T')[0],
    aciklama: ''
  })
  const [iadeFormData, setIadeFormData] = useState({
    iadeTarihi: new Date().toISOString().split('T')[0],
    envanterDurumu: 'Depoda'
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchZimmetler()
    fetchEnvanterler()
    fetchCalisanlar()
  }, [])

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredZimmetler(zimmetler)
      return
    }
    
    const searchLower = searchTerm.toLowerCase().trim()
    const filtered = zimmetler.filter(zimmet => {
      // Seri numarası ile arama (öncelikli)
      const seriNumarasi = zimmet.envanterBilgisi?.seriNumarasi || ''
      if (seriNumarasi.toLowerCase().includes(searchLower)) {
        return true
      }
      
      // Diğer alanlar ile arama
      const calisanAd = zimmet.calisanAd || ''
      const departmanAd = zimmet.departmanAd || ''
      const marka = zimmet.envanterBilgisi?.marka || ''
      const model = zimmet.envanterBilgisi?.model || ''
      const tip = zimmet.envanterBilgisi?.tip || ''
      
      return (
        calisanAd.toLowerCase().includes(searchLower) ||
        departmanAd.toLowerCase().includes(searchLower) ||
        marka.toLowerCase().includes(searchLower) ||
        model.toLowerCase().includes(searchLower) ||
        tip.toLowerCase().includes(searchLower)
      )
    })
    setFilteredZimmetler(filtered)
  }, [searchTerm, zimmetler])

  const fetchZimmetler = async () => {
    try {
      const response = await fetch('/api/zimmetler')
      const data = await response.json()
      // Sadece aktif zimmetleri göster (iade edilenler listeden çıksın)
      const aktifZimmetler = data.filter(z => z.durum === 'Aktif')
      setZimmetler(aktifZimmetler)
      setFilteredZimmetler(aktifZimmetler)
    } catch (error) {
      toast({ title: 'Hata', description: 'Zimmetler yüklenemedi', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const fetchEnvanterler = async () => {
    try {
      const response = await fetch('/api/envanterler')
      const data = await response.json()
      // Only show available envanters (Depoda status and not currently assigned)
      const available = data.filter(env => env.durum === 'Depoda')
      setEnvanterler(available)
    } catch (error) {
      console.error('Envanterler yüklenemedi')
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/zimmetler', {
        method: 'POST',
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

      toast({ title: 'Başarılı', description: 'Zimmet oluşturuldu' })
      
      setShowDialog(false)
      setFormData({
        envanterId: '',
        calisanId: '',
        zimmetTarihi: new Date().toISOString().split('T')[0],
        aciklama: ''
      })
      fetchZimmetler()
      fetchEnvanterler()
    } catch (error) {
      toast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' })
    }
  }

  const handleIade = async (e) => {
    e.preventDefault()
    
    if (!user || (!user.yoneticiYetkisi && !user.adminYetkisi)) {
      toast({ 
        title: 'Hata', 
        description: 'Bu işlem için yönetici yetkisi gereklidir',
        variant: 'destructive' 
      })
      return
    }

    try {
      const response = await fetch('/api/zimmetler/iade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zimmetId: selectedZimmet.id,
          iadeAlanYetkiliId: user.id, // Otomatik login olan kullanıcı
          ...iadeFormData
        })
      })

      const data = await response.json()

      if (!response.ok) {
        toast({ title: 'Hata', description: data.error, variant: 'destructive' })
        return
      }

      toast({ title: 'Başarılı', description: 'Zimmet iade edildi' })
      
      setShowIadeDialog(false)
      setSelectedZimmet(null)
      setIadeFormData({
        iadeTarihi: new Date().toISOString().split('T')[0],
        envanterDurumu: 'Depoda'
      })
      fetchZimmetler()
      fetchEnvanterler()
    } catch (error) {
      toast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' })
    }
  }

  const openIadeDialog = (zimmet) => {
    setSelectedZimmet(zimmet)
    setIadeFormData({
      iadeTarihi: new Date().toISOString().split('T')[0],
      envanterDurumu: 'Depoda'
    })
    setShowIadeDialog(true)
  }

  const generateZimmetPDF = (zimmet) => {
    const doc = new jsPDF()
    
    // Türkçe karakter desteği için encoding ayarı
    doc.setLanguage("tr")
    
    // Helper function to convert Turkish characters for PDF
    const turkishToAscii = (text) => {
      if (!text) return text
      const charMap = {
        'ç': 'c', 'Ç': 'C',
        'ğ': 'g', 'Ğ': 'G',
        'ı': 'i', 'İ': 'I',
        'ö': 'o', 'Ö': 'O',
        'ş': 's', 'Ş': 'S',
        'ü': 'u', 'Ü': 'U'
      }
      return text.split('').map(char => charMap[char] || char).join('')
    }
    
    // Add logo if available
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('Halk TV', 20, 20)
    
    // Title - using ASCII equivalent
    doc.setFontSize(18)
    doc.text('ZIMMET FORMU', 105, 40, { align: 'center' })
    
    // Line
    doc.setLineWidth(0.5)
    doc.line(20, 45, 190, 45)
    
    // Zimmet Info
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('ZIMMET BILGILERI', 20, 55)
    
    doc.setFont('helvetica', 'normal')
    const zimmetInfo = [
      `Zimmet Tarihi: ${new Date(zimmet.zimmetTarihi).toLocaleDateString('tr-TR')}`,
      `Zimmet Durumu: ${turkishToAscii(zimmet.durum)}`,
      zimmet.iadeTarihi ? `Iade Tarihi: ${new Date(zimmet.iadeTarihi).toLocaleDateString('tr-TR')}` : '',
      zimmet.iadeAlanYetkili ? `Iade Alan Yetkili: ${turkishToAscii(zimmet.iadeAlanYetkili.adSoyad)}` : ''
    ].filter(Boolean)
    
    let yPos = 65
    zimmetInfo.forEach(info => {
      doc.text(info, 20, yPos)
      yPos += 8
    })
    
    // Employee Info
    yPos += 10
    doc.setFont('helvetica', 'bold')
    doc.text('CALISAN BILGILERI', 20, yPos)
    yPos += 10
    
    doc.setFont('helvetica', 'normal')
    doc.text(`Ad Soyad: ${turkishToAscii(zimmet.calisanAd)}`, 20, yPos)
    yPos += 8
    doc.text(`Departman: ${turkishToAscii(zimmet.departmanAd)}`, 20, yPos)
    
    // Inventory Info
    yPos += 18
    doc.setFont('helvetica', 'bold')
    doc.text('ENVANTER BILGILERI', 20, yPos)
    yPos += 10
    
    doc.setFont('helvetica', 'normal')
    const envanterInfo = [
      `Envanter Tipi: ${turkishToAscii(zimmet.envanterBilgisi?.tip || '-')}`,
      `Marka: ${turkishToAscii(zimmet.envanterBilgisi?.marka || '-')}`,
      `Model: ${turkishToAscii(zimmet.envanterBilgisi?.model || '-')}`,
      `Seri Numarasi: ${turkishToAscii(zimmet.envanterBilgisi?.seriNumarasi || '-')}`
    ]
    
    envanterInfo.forEach(info => {
      doc.text(info, 20, yPos)
      yPos += 8
    })
    
    // Description
    if (zimmet.aciklama) {
      yPos += 10
      doc.setFont('helvetica', 'bold')
      doc.text('ACIKLAMA', 20, yPos)
      yPos += 10
      doc.setFont('helvetica', 'normal')
      const convertedDesc = turkishToAscii(zimmet.aciklama)
      const splitText = doc.splitTextToSize(convertedDesc, 170)
      doc.text(splitText, 20, yPos)
      yPos += splitText.length * 7
    }
    
    // Signature section
    yPos = 250
    doc.setLineWidth(0.3)
    doc.line(20, yPos, 80, yPos)
    doc.line(110, yPos, 170, yPos)
    
    doc.setFontSize(10)
    doc.text('Teslim Eden', 40, yPos + 7, { align: 'center' })
    doc.text('Teslim Alan (Imza)', 140, yPos + 7, { align: 'center' })
    
    // Footer
    doc.setFontSize(8)
    doc.setTextColor(128)
    doc.text('Halk TV Zimmet Takip Sistemi', 105, 285, { align: 'center' })
    doc.text(new Date().toLocaleDateString('tr-TR'), 105, 290, { align: 'center' })
    
    // Save - ASCII filename
    const cleanName = turkishToAscii(zimmet.calisanAd).replace(/\s+/g, '_')
    const cleanSerial = turkishToAscii(zimmet.envanterBilgisi?.seriNumarasi || 'dokuman')
    const fileName = `zimmet_${cleanName}_${cleanSerial}.pdf`
    doc.save(fileName)
    
    toast({ title: 'Basarili', description: 'Zimmet PDF\'i indirildi' })
  }

  const openCreateDialog = () => {
    setFormData({
      envanterId: '',
      calisanId: '',
      zimmetTarihi: new Date().toISOString().split('T')[0],
      aciklama: ''
    })
    setShowDialog(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Zimmetler</h2>
          <p className="text-gray-500">Zimmet listesi ve yönetimi</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-teal-500 hover:bg-teal-600">
          <Plus size={20} className="mr-2" />
          Yeni Zimmet
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder="Seri no, çalışan, marka, model ile ara..."
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
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Envanter</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Seri No</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Çalışan</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Departman</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Zimmet Tarihi</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Durum</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredZimmetler.map((zimmet) => (
                    <tr key={zimmet.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm">
                        <div>
                          <div className="font-medium">
                            {zimmet.envanterBilgisi?.tip} {zimmet.envanterBilgisi?.marka}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {zimmet.envanterBilgisi?.model}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm font-mono">
                        {zimmet.envanterBilgisi?.seriNumarasi}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium">{zimmet.calisanAd}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{zimmet.departmanAd}</td>
                      <td className="py-3 px-4 text-sm">
                        {new Date(zimmet.zimmetTarihi).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {zimmet.durum}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedZimmet(zimmet)
                              setShowDetailDialog(true)
                            }}
                            title="Detay Görüntüle"
                          >
                            <Eye size={16} />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => generateZimmetPDF(zimmet)}
                            title="PDF İndir"
                          >
                            <FileText size={16} />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-orange-600 border-orange-600 hover:bg-orange-50"
                            onClick={() => openIadeDialog(zimmet)}
                            title="İade Al"
                          >
                            <CheckCircle size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredZimmetler.length === 0 && (
                <div className="text-center py-8 text-gray-500">Zimmet bulunamadı</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Yeni Zimmet Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Yeni Zimmet Oluştur</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="envanterId">Envanter *</Label>
                <Popover open={envanterOpen} onOpenChange={setEnvanterOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={envanterOpen}
                      className="w-full justify-between mt-1"
                    >
                      {formData.envanterId
                        ? (() => {
                            const env = envanterler.find(e => e.id === formData.envanterId)
                            return env ? `${env.envanterTipiAd} - ${env.marka} ${env.model} (${env.seriNumarasi})` : 'Envanter seçin'
                          })()
                        : "Envanter seçin (Sadece depodaki)"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Envanter ara (marka, model, seri no)..." />
                      <CommandList>
                        <CommandEmpty>Envanter bulunamadı.</CommandEmpty>
                        <CommandGroup>
                          {envanterler.map((env) => (
                            <CommandItem
                              key={env.id}
                              value={`${env.envanterTipiAd} ${env.marka} ${env.model} ${env.seriNumarasi}`}
                              onSelect={() => {
                                setFormData({ ...formData, envanterId: env.id })
                                setEnvanterOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.envanterId === env.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{env.envanterTipiAd} - {env.marka} {env.model}</span>
                                <span className="text-xs text-muted-foreground">Seri No: {env.seriNumarasi}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="calisanId">Çalışan *</Label>
                <Popover open={calisanOpen} onOpenChange={setCalisanOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={calisanOpen}
                      className="w-full justify-between mt-1"
                    >
                      {formData.calisanId
                        ? (() => {
                            const cal = calisanlar.find(c => c.id === formData.calisanId)
                            return cal ? `${cal.adSoyad} (${cal.departmanAd})` : 'Çalışan seçin'
                          })()
                        : "Çalışan seçin"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Çalışan ara (ad soyad)..." />
                      <CommandList>
                        <CommandEmpty>Çalışan bulunamadı.</CommandEmpty>
                        <CommandGroup>
                          {calisanlar.map((cal) => (
                            <CommandItem
                              key={cal.id}
                              value={`${cal.adSoyad} ${cal.departmanAd}`}
                              onSelect={() => {
                                setFormData({ ...formData, calisanId: cal.id })
                                setCalisanOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.calisanId === cal.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{cal.adSoyad}</span>
                                <span className="text-xs text-muted-foreground">{cal.departmanAd}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="zimmetTarihi">Zimmet Tarihi *</Label>
                <Input
                  id="zimmetTarihi"
                  type="date"
                  value={formData.zimmetTarihi}
                  onChange={(e) => setFormData({ ...formData, zimmetTarihi: e.target.value })}
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
                  placeholder="Ek bilgiler veya notlar..."
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                İptal
              </Button>
              <Button type="submit" className="bg-teal-500 hover:bg-teal-600">
                Oluştur
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detay Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Zimmet Detayları</DialogTitle>
          </DialogHeader>
          {selectedZimmet && (
            <div className="space-y-6">
              {/* Envanter Bilgileri */}
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">Envanter Bilgileri</h4>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-gray-500">Tip</span>
                      <div className="font-medium">{selectedZimmet.envanterBilgisi?.tip || '-'}</div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Marka</span>
                      <div className="font-medium">{selectedZimmet.envanterBilgisi?.marka || '-'}</div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Model</span>
                      <div className="font-medium">{selectedZimmet.envanterBilgisi?.model || '-'}</div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Seri Numarası</span>
                      <div className="font-medium font-mono">{selectedZimmet.envanterBilgisi?.seriNumarasi || '-'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Çalışan Bilgileri */}
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">Çalışan Bilgileri</h4>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-gray-500">Ad Soyad</span>
                      <div className="font-medium">{selectedZimmet.calisanAd || '-'}</div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Departman</span>
                      <div className="font-medium">{selectedZimmet.departmanAd || '-'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Zimmet Bilgileri */}
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">Zimmet Bilgileri</h4>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-gray-500">Zimmet Tarihi</span>
                      <div className="font-medium">
                        {selectedZimmet.zimmetTarihi 
                          ? new Date(selectedZimmet.zimmetTarihi).toLocaleDateString('tr-TR')
                          : '-'}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Durum</span>
                      <div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {selectedZimmet.durum}
                        </span>
                      </div>
                    </div>
                    {selectedZimmet.iadeTarihi && (
                      <div>
                        <span className="text-xs text-gray-500">İade Tarihi</span>
                        <div className="font-medium">
                          {new Date(selectedZimmet.iadeTarihi).toLocaleDateString('tr-TR')}
                        </div>
                      </div>
                    )}
                    {selectedZimmet.iadeAlanYetkili && (
                      <div>
                        <span className="text-xs text-gray-500">İade Alan Yetkili</span>
                        <div className="font-medium">{selectedZimmet.iadeAlanYetkili.adSoyad}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notlar / Açıklama */}
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">Notlar / Açıklama</h4>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 max-h-40 overflow-y-auto">
                  {selectedZimmet.aciklama ? (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{selectedZimmet.aciklama}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Not eklenmemiş</p>
                  )}
                </div>
              </div>

              {/* Kayıt Bilgileri */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                  <div>
                    <span>Oluşturulma:</span>{' '}
                    {selectedZimmet.createdAt 
                      ? new Date(selectedZimmet.createdAt).toLocaleString('tr-TR')
                      : '-'}
                  </div>
                  <div>
                    <span>Zimmet ID:</span>{' '}
                    <span className="font-mono">{selectedZimmet.id?.substring(0, 8)}...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Kapat
            </Button>
            <Button 
              onClick={() => generateZimmetPDF(selectedZimmet)}
              className="bg-teal-500 hover:bg-teal-600"
            >
              <FileText size={16} className="mr-2" />
              PDF İndir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* İade Dialog */}
      <Dialog open={showIadeDialog} onOpenChange={setShowIadeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zimmet İade</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleIade}>
            <div className="space-y-4">
              {selectedZimmet && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm space-y-1">
                    <div><span className="font-medium">Envanter:</span> {selectedZimmet.envanterBilgisi?.tip} {selectedZimmet.envanterBilgisi?.marka} {selectedZimmet.envanterBilgisi?.model}</div>
                    <div><span className="font-medium">Çalışan:</span> {selectedZimmet.calisanAd}</div>
                    <div><span className="font-medium">Zimmet Tarihi:</span> {new Date(selectedZimmet.zimmetTarihi).toLocaleDateString('tr-TR')}</div>
                  </div>
                </div>
              )}
              {user && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-blue-800">
                    <span className="font-medium">İade Alan Yetkili:</span> {user.adSoyad} ({user.departmanAd})
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="iadeTarihi">İade Tarihi *</Label>
                <Input
                  id="iadeTarihi"
                  type="date"
                  value={iadeFormData.iadeTarihi}
                  onChange={(e) => setIadeFormData({ ...iadeFormData, iadeTarihi: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="envanterDurumu">Envanter Durumu *</Label>
                <Select 
                  value={iadeFormData.envanterDurumu} 
                  onValueChange={(value) => setIadeFormData({ ...iadeFormData, envanterDurumu: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Depoda">Depoda (Sağlam)</SelectItem>
                    <SelectItem value="Arızalı">Arızalı</SelectItem>
                    <SelectItem value="Kayıp">Kayıp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowIadeDialog(false)}>
                İptal
              </Button>
              <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
                İade Al
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Zimmetler
