'use client'

import { useState, useEffect } from 'react'
import { X, User, Plus, Upload, Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

const CalisanDetay = ({ calisan, onClose, user }) => {
  const [activeTab, setActiveTab] = useState('zimmetler')
  const [zimmetler, setZimmetler] = useState([])
  const [envanterler, setEnvanterler] = useState([])
  const [loading, setLoading] = useState(true)
  const [showZimmetDialog, setShowZimmetDialog] = useState(false)
  const [showDokumanDialog, setShowDokumanDialog] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [zimmetFormData, setZimmetFormData] = useState({
    envanterId: '',
    zimmetTarihi: new Date().toISOString().split('T')[0],
    aciklama: ''
  })
  const { toast } = useToast()

  useEffect(() => {
    if (calisan) {
      fetchCalisanZimmetler()
      fetchEnvanterler()
    }
  }, [calisan])

  const fetchCalisanZimmetler = async () => {
    try {
      const response = await fetch(`/api/calisanlar/${calisan.id}/zimmetler`)
      const data = await response.json()
      setZimmetler(data)
    } catch (error) {
      console.error('Zimmetler yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEnvanterler = async () => {
    try {
      const response = await fetch('/api/envanterler')
      const data = await response.json()
      const available = data.filter(env => env.durum === 'Depoda')
      setEnvanterler(available)
    } catch (error) {
      console.error('Envanterler yüklenemedi')
    }
  }

  const handleYeniZimmet = async (e) => {
    e.preventDefault()

    try {
      const response = await fetch('/api/zimmetler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...zimmetFormData,
          calisanId: calisan.id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        toast({ title: 'Hata', description: data.error, variant: 'destructive' })
        return
      }

      toast({ title: 'Başarılı', description: 'Zimmet oluşturuldu' })
      setShowZimmetDialog(false)
      setZimmetFormData({
        envanterId: '',
        zimmetTarihi: new Date().toISOString().split('T')[0],
        aciklama: ''
      })
      fetchCalisanZimmetler()
      fetchEnvanterler()
    } catch (error) {
      toast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' })
    }
  }

  const handleDokumanYukle = () => {
    if (!selectedFile) {
      toast({ title: 'Hata', description: 'Lütfen bir dosya seçin', variant: 'destructive' })
      return
    }

    // Simulated file upload
    toast({ title: 'Başarılı', description: `${selectedFile.name} yüklendi` })
    setShowDokumanDialog(false)
    setSelectedFile(null)
  }

  const generateZimmetPDF = (zimmet) => {
    const doc = new jsPDF()
    
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

    // Logo
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('Halk TV', 20, 20)
    
    // Title
    doc.setFontSize(18)
    doc.text('ZIMMET FORMU', 105, 40, { align: 'center' })
    
    doc.setLineWidth(0.5)
    doc.line(20, 45, 190, 45)
    
    // Zimmet Info
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('ZIMMET BILGILERI', 20, 55)
    
    doc.setFont('helvetica', 'normal')
    let yPos = 65
    doc.text(`Zimmet Tarihi: ${new Date(zimmet.zimmetTarihi).toLocaleDateString('tr-TR')}`, 20, yPos)
    yPos += 8
    doc.text(`Durum: ${turkishToAscii(zimmet.durum)}`, 20, yPos)
    
    // Employee Info
    yPos += 18
    doc.setFont('helvetica', 'bold')
    doc.text('CALISAN BILGILERI', 20, yPos)
    yPos += 10
    
    doc.setFont('helvetica', 'normal')
    doc.text(`Ad Soyad: ${turkishToAscii(calisan.adSoyad)}`, 20, yPos)
    yPos += 8
    doc.text(`Departman: ${turkishToAscii(calisan.departmanAd)}`, 20, yPos)
    yPos += 8
    doc.text(`Email: ${calisan.email || '-'}`, 20, yPos)
    
    // Inventory Info
    yPos += 18
    doc.setFont('helvetica', 'bold')
    doc.text('ENVANTER BILGILERI', 20, yPos)
    yPos += 10
    
    doc.setFont('helvetica', 'normal')
    doc.text(`Envanter Tipi: ${turkishToAscii(zimmet.envanterBilgisi?.tip || '-')}`, 20, yPos)
    yPos += 8
    doc.text(`Marka: ${turkishToAscii(zimmet.envanterBilgisi?.marka || '-')}`, 20, yPos)
    yPos += 8
    doc.text(`Model: ${turkishToAscii(zimmet.envanterBilgisi?.model || '-')}`, 20, yPos)
    yPos += 8
    doc.text(`Seri Numarasi: ${turkishToAscii(zimmet.envanterBilgisi?.seriNumarasi || '-')}`, 20, yPos)
    
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
    
    // Save
    const cleanName = turkishToAscii(calisan.adSoyad).replace(/\s+/g, '_')
    const cleanSerial = turkishToAscii(zimmet.envanterBilgisi?.seriNumarasi || 'dokuman')
    doc.save(`zimmet_${cleanName}_${cleanSerial}.pdf`)
    
    toast({ title: 'Başarılı', description: 'Zimmet PDF\'i indirildi' })
  }

  const exportAllZimmetler = () => {
    const csv = [
      ['Envanter Tipi', 'Marka', 'Model', 'Seri Numarası', 'Zimmet Tarihi', 'İade Tarihi', 'Durum'].join(','),
      ...zimmetler.map(z => [
        z.envanterBilgisi?.tip || '',
        z.envanterBilgisi?.marka || '',
        z.envanterBilgisi?.model || '',
        z.envanterBilgisi?.seriNumarasi || '',
        new Date(z.zimmetTarihi).toLocaleDateString('tr-TR'),
        z.iadeTarihi ? new Date(z.iadeTarihi).toLocaleDateString('tr-TR') : '',
        z.durum
      ].join(','))
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `zimmetler_${calisan.adSoyad.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    toast({ title: 'Başarılı', description: 'Zimmet listesi dışa aktarıldı' })
  }

  // Tüm zimmetleri tek PDF'de listele
  const generateAllZimmetlerPDF = () => {
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

    // Sadece aktif zimmetleri al
    const aktifZimmetler = zimmetler.filter(z => z.durum === 'Aktif')

    if (aktifZimmetler.length === 0) {
      toast({ title: 'Uyarı', description: 'Aktif zimmet bulunamadı', variant: 'destructive' })
      return
    }

    const doc = new jsPDF()

    // Logo / Header
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('Halk TV', 20, 20)

    // Title
    doc.setFontSize(16)
    doc.text('ZIMMET LISTESI', 105, 20, { align: 'center' })

    doc.setLineWidth(0.5)
    doc.line(20, 25, 190, 25)

    // Employee Info
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('CALISAN BILGILERI', 20, 35)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Ad Soyad: ${turkishToAscii(calisan.adSoyad)}`, 20, 43)
    doc.text(`Departman: ${turkishToAscii(calisan.departmanAd)}`, 20, 50)
    doc.text(`Email: ${calisan.email || '-'}`, 120, 43)
    doc.text(`Telefon: ${calisan.telefon || '-'}`, 120, 50)

    doc.setLineWidth(0.3)
    doc.line(20, 55, 190, 55)

    // Table Header
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('ZIMMETLI ENVANTERLER', 20, 63)

    // Create table data
    const tableData = aktifZimmetler.map((zimmet, index) => [
      (index + 1).toString(),
      turkishToAscii(zimmet.envanterBilgisi?.tip || '-'),
      turkishToAscii(zimmet.envanterBilgisi?.marka || '-'),
      turkishToAscii(zimmet.envanterBilgisi?.model || '-'),
      turkishToAscii(zimmet.envanterBilgisi?.seriNumarasi || '-'),
      new Date(zimmet.zimmetTarihi).toLocaleDateString('tr-TR')
    ])

    // Use autoTable for the table
    doc.autoTable({
      startY: 68,
      head: [['#', 'Tip', 'Marka', 'Model', 'Seri No', 'Zimmet Tarihi']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [0, 128, 128],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 30 },
        2: { cellWidth: 30 },
        3: { cellWidth: 40 },
        4: { cellWidth: 40 },
        5: { cellWidth: 30 }
      },
      margin: { left: 20, right: 20 }
    })

    // Get final Y position after table
    const finalY = doc.lastAutoTable.finalY + 15

    // Summary
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`Toplam Zimmetli Envanter: ${aktifZimmetler.length} adet`, 20, finalY)

    // Signature section
    const signatureY = finalY + 30
    doc.setLineWidth(0.3)
    doc.line(20, signatureY, 80, signatureY)
    doc.line(110, signatureY, 170, signatureY)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Teslim Eden', 40, signatureY + 7, { align: 'center' })
    doc.text(`Teslim Alan: ${turkishToAscii(calisan.adSoyad)}`, 140, signatureY + 7, { align: 'center' })

    // Footer
    doc.setFontSize(8)
    doc.setTextColor(128)
    doc.text('Halk TV Zimmet Takip Sistemi', 105, 285, { align: 'center' })
    doc.text(`Olusturma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, 105, 290, { align: 'center' })

    // Save
    const cleanName = turkishToAscii(calisan.adSoyad).replace(/\s+/g, '_')
    doc.save(`zimmet_listesi_${cleanName}_${new Date().toISOString().split('T')[0]}.pdf`)

    toast({ title: 'Başarılı', description: 'Tüm zimmetler PDF olarak indirildi' })
  }

  if (!calisan) return null

  return (
    <div className="fixed right-0 top-0 h-full w-[800px] bg-white shadow-2xl z-50 overflow-hidden flex flex-col animate-slide-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-blue-500 p-6 text-white">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-teal-600 text-2xl font-bold">
              {calisan.adSoyad.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{calisan.adSoyad}</h2>
              <p className="text-teal-100">{calisan.departmanAd}</p>
              <p className="text-sm text-teal-100">{calisan.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
            <X size={24} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 px-6">
          <TabsTrigger 
            value="temel-bilgiler" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500"
          >
            Temel Bilgiler
          </TabsTrigger>
          <TabsTrigger 
            value="zimmetler"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500"
          >
            Zimmetler
          </TabsTrigger>
          <TabsTrigger 
            value="yetkilendirme"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500"
          >
            Yetkilendirme
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Temel Bilgiler Tab */}
          <TabsContent value="temel-bilgiler" className="mt-0">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">Adı Soyadı</div>
                <div className="font-medium">{calisan.adSoyad}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Email</div>
                <div className="font-medium">{calisan.email || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Telefon</div>
                <div className="font-medium">{calisan.telefon || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Departman</div>
                <div className="font-medium">{calisan.departmanAd}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Durum</div>
                <span className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                  calisan.durum === 'Aktif' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                )}>
                  {calisan.durum}
                </span>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Yetki</div>
                <div className="flex gap-2">
                  {calisan.adminYetkisi && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Admin
                    </span>
                  )}
                  {calisan.yoneticiYetkisi && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Yönetici
                    </span>
                  )}
                  {!calisan.adminYetkisi && !calisan.yoneticiYetkisi && '-'}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Zimmetler Tab */}
          <TabsContent value="zimmetler" className="mt-0 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Zimmetli Cihazlar</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDokumanDialog(true)}
                >
                  <Upload size={16} className="mr-2" />
                  Döküman Yükle
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportAllZimmetler}
                  disabled={zimmetler.length === 0}
                >
                  <Download size={16} className="mr-2" />
                  Dışarı Aktar
                </Button>
                <Button
                  onClick={() => setShowZimmetDialog(true)}
                  className="bg-teal-500 hover:bg-teal-600"
                  size="sm"
                >
                  <Plus size={16} className="mr-2" />
                  Yeni Zimmet
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">Yükleniyor...</div>
            ) : zimmetler.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500">Bu çalışana ait zimmet bulunamadı</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Envanter Adı</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Seri No</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Zimmet/İade Tarihi</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Durum</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zimmetler.map((zimmet) => (
                      <tr key={zimmet.id} className="border-t hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium text-sm">
                              {zimmet.envanterBilgisi?.tip} {zimmet.envanterBilgisi?.marka}
                            </div>
                            <div className="text-xs text-gray-500">
                              {zimmet.envanterBilgisi?.model}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm font-mono">
                          {zimmet.envanterBilgisi?.seriNumarasi}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div>
                            <div>{new Date(zimmet.zimmetTarihi).toLocaleDateString('tr-TR')}</div>
                            {zimmet.iadeTarihi && (
                              <div className="text-xs text-gray-500">
                                İade: {new Date(zimmet.iadeTarihi).toLocaleDateString('tr-TR')}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            zimmet.durum === 'Aktif' && "bg-green-100 text-green-800",
                            zimmet.durum === 'İade Edildi' && "bg-gray-100 text-gray-800"
                          )}>
                            {zimmet.durum}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateZimmetPDF(zimmet)}
                            title="PDF İndir"
                          >
                            <FileText size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Yetkilendirme Tab */}
          <TabsContent value="yetkilendirme" className="mt-0">
            <div className="text-center py-12 text-gray-500">
              <p>Yetkilendirme bilgileri</p>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Yeni Zimmet Dialog */}
      <Dialog open={showZimmetDialog} onOpenChange={setShowZimmetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Zimmet Oluştur</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleYeniZimmet}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="envanterId">Envanter *</Label>
                <Select 
                  value={zimmetFormData.envanterId} 
                  onValueChange={(value) => setZimmetFormData({ ...zimmetFormData, envanterId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Envanter seçin (Sadece depodaki envanterler)" />
                  </SelectTrigger>
                  <SelectContent>
                    {envanterler.map(env => (
                      <SelectItem key={env.id} value={env.id}>
                        {env.envanterTipiAd} - {env.marka} {env.model} ({env.seriNumarasi})
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
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowZimmetDialog(false)}>
                İptal
              </Button>
              <Button type="submit" className="bg-teal-500 hover:bg-teal-600">
                Oluştur
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Döküman Yükle Dialog */}
      <Dialog open={showDokumanDialog} onOpenChange={setShowDokumanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Döküman Yükle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="dokuman">Dosya Seçin</Label>
              <Input
                id="dokuman"
                type="file"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              {selectedFile && (
                <p className="text-sm text-gray-500 mt-2">Seçilen: {selectedFile.name}</p>
              )}
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setShowDokumanDialog(false)}>
              İptal
            </Button>
            <Button onClick={handleDokumanYukle} className="bg-teal-500 hover:bg-teal-600">
              Yükle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CalisanDetay
