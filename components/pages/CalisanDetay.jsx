'use client'

import { useState, useEffect } from 'react'
import { X, User, Plus, Upload, Download, FileText, Trash2 } from 'lucide-react'
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

import autoTable from 'jspdf-autotable'
import { QrCode } from 'lucide-react'
import QRCode from 'qrcode'

const CalisanDetay = ({ calisan, onClose, user }) => {
  const [activeTab, setActiveTab] = useState('zimmetler')
  const [zimmetler, setZimmetler] = useState([])
  const [envanterler, setEnvanterler] = useState([])
  const [loading, setLoading] = useState(true)
  const [showZimmetDialog, setShowZimmetDialog] = useState(false)
  const [showDokumanDialog, setShowDokumanDialog] = useState(false)
  const [showQrDialog, setShowQrDialog] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [selectedZimmetForQr, setSelectedZimmetForQr] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [zimmetFormData, setZimmetFormData] = useState({
    envanterId: '',
    zimmetTarihi: new Date().toISOString().split('T')[0],
    aciklama: ''
  })
  const [documents, setDocuments] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (calisan) {
      fetchCalisanZimmetler()
      fetchEnvanterler()
      fetchDocuments()
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



  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/calisanlar/${calisan.id}/belgeler`)
      if (response.ok) {
        const data = await response.json()
        setDocuments(data)
      }
    } catch (error) {
      console.error('Belgeler yüklenemedi')
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

  const handleDokumanYukle = async () => {
    if (!selectedFile) {
      toast({ title: 'Hata', description: 'Lütfen bir dosya seçin', variant: 'destructive' })
      return
    }

    setIsUploading(true)
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(selectedFile)
        reader.onload = () => resolve(reader.result)
        reader.onerror = error => reject(error)
      })

      const response = await fetch(`/api/calisanlar/${calisan.id}/belgeler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ad: selectedFile.name,
          tip: selectedFile.type,
          dosyaVerisi: base64,
          yukleyenId: user?.id,
          yukleyenAd: user?.adSoyad
        })
      })

      if (!response.ok) throw new Error('Yükleme başarısız')

      toast({ title: 'Başarılı', description: 'Belge yüklendi' })
      setShowDokumanDialog(false)
      setSelectedFile(null)
      fetchDocuments()
    } catch (error) {
      console.error('Upload Error:', error)
      toast({ title: 'Hata', description: 'Belge yüklenirken bir hata oluştu', variant: 'destructive' })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteDocument = async (docId) => {
    if (!confirm('Bu belgeyi silmek istediğinize emin misiniz?')) return

    try {
      const response = await fetch(`/api/calisanlar/belgeler/${docId}`, {
        method: 'DELETE',
        body: JSON.stringify({
          userId: user?.id,
          userName: user?.adSoyad
        })
      })

      if (!response.ok) throw new Error('Silme başarısız')

      toast({ title: 'Başarılı', description: 'Belge silindi' })
      fetchDocuments()
    } catch (error) {
      toast({ title: 'Hata', description: 'Silme işlemi başarısız', variant: 'destructive' })
    }
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

  // Tüm zimmetleri tek PDF'de listele - Örnek formata uygun
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
    const pageWidth = doc.internal.pageSize.getWidth()

    // Logo / Header - Sol üst
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 128, 128) // Teal color
    doc.text('Halk', 20, 20)
    doc.setTextColor(0, 0, 0)

    // Title - Center
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('KISISEL KORUYUCU DONANIM ZIMMET TUTANAGI', pageWidth / 2, 35, { align: 'center' })

    // Legal text paragraph 1
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const legalText1 = `Asagida dokumu yapilan Kisisel Koruyucu malzemeleri teslim aldim ve nasil kullanacagi konusunda egitim aldim. Tarafima verilen bu malzemeleri bu isyerinde kullanmayi ve kullanim suresi doluncaya kadar muhafaza etmeyi, kayboldugunda veya kotu kullanim nedeniyle hasarlandiginda fatura bedelinin ucretimden kesilecegini ve derhal yenisini almak uzere yetkiliye basvuracagimi taahhut ederim.`

    const splitText1 = doc.splitTextToSize(legalText1, pageWidth - 40)
    doc.text(splitText1, 20, 45)

    // Legal text paragraph 2
    const legalText2 = `Ayrica bu malzemeleri kullanmadigim takdirde birinci uyarida bir gunluk yevmiyemin kesilecegini, ikinci uyarida ise 6331 Sayili Is Kanunun ilgili maddesi uyarinca gorevime son verilecegini kabul ederim.`

    const splitText2 = doc.splitTextToSize(legalText2, pageWidth - 40)
    doc.text(splitText2, 20, 68)

    // Table Title
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('ALINAN MALZEMENIN', 20, 100)

    // Create table data
    const tableData = aktifZimmetler.map((zimmet, index) => [
      (index + 1).toString(),
      turkishToAscii(zimmet.envanterBilgisi?.tip || '-'),
      turkishToAscii(zimmet.envanterBilgisi?.marka || '-'),
      turkishToAscii(zimmet.envanterBilgisi?.model || '-'),
      '1', // Adedi
      turkishToAscii(zimmet.envanterBilgisi?.seriNumarasi || '-')
    ])

    // Use autoTable for the table
    autoTable(doc, {
      startY: 105,
      head: [['NO', 'ENVANTER TIPI', 'MARKA', 'MODEL', 'ADEDI', 'SERI NUMARASI']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [220, 220, 220],
        textColor: [0, 0, 0],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 9,
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 35 },
        2: { cellWidth: 30 },
        3: { cellWidth: 35 },
        4: { cellWidth: 20 },
        5: { cellWidth: 40 }
      },
      margin: { left: 20, right: 20 }
    })

    // Get final Y position after table
    let finalY = doc.lastAutoTable.finalY + 20

    // Date field
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const today = new Date()
    doc.text(`TARIH: ${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`, 20, finalY)

    // Signature section
    finalY += 15

    // Left side - Teslim Eden
    doc.setFont('helvetica', 'bold')
    doc.text('TESLIM EDEN', 50, finalY, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.text('ADI SOYADI:', 20, finalY + 12)
    doc.line(50, finalY + 12, 90, finalY + 12)

    doc.text('CALISTIGI BOLUM:', 20, finalY + 22)
    doc.line(60, finalY + 22, 90, finalY + 22)

    doc.text('IMZASI:', 20, finalY + 32)
    doc.line(45, finalY + 32, 90, finalY + 32)

    // Right side - Teslim Alan
    doc.setFont('helvetica', 'bold')
    doc.text('TESLIM ALAN', 150, finalY, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.text('ADI SOYADI:', 110, finalY + 12)
    doc.text(turkishToAscii(calisan.adSoyad), 145, finalY + 12)
    doc.line(140, finalY + 12, 190, finalY + 12)

    doc.text('CALISTIGI BOLUM:', 110, finalY + 22)
    doc.text(turkishToAscii(calisan.departmanAd || ''), 155, finalY + 22)
    doc.line(150, finalY + 22, 190, finalY + 22)

    doc.text('IMZASI:', 110, finalY + 32)
    doc.line(135, finalY + 32, 190, finalY + 32)

    // Save
    const cleanName = turkishToAscii(calisan.adSoyad).replace(/\s+/g, '_')
    doc.save(`zimmet_tutanagi_${cleanName}_${new Date().toISOString().split('T')[0]}.pdf`)

    toast({ title: 'Başarılı', description: 'Zimmet tutanağı PDF olarak indirildi' })
  }

  const handleQrCode = async (zimmet) => {
    setSelectedZimmetForQr(zimmet)
    try {
      const url = `${window.location.origin}/zimmet-dogrula/${zimmet.envanterId}`
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
              <div class="header">Halk Tv IK</div>
              <img src="${qrCodeUrl}" class="qr-image" width="150" height="150" />
              <div class="info">
                <div><span class="label">Çalışanlar Bilgileri:</span> ${calisan.adSoyad}</div>
                <div><span class="label">Envanterin Seri Numarası:</span> ${selectedZimmetForQr.envanterBilgisi?.seriNumarasi}</div>
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
          <TabsTrigger
            value="dosyalar"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500"
          >
            Dosyalar
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
                  onClick={generateAllZimmetlerPDF}
                  disabled={zimmetler.filter(z => z.durum === 'Aktif').length === 0}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  <FileText size={16} className="mr-2" />
                  Tüm Zimmetler PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportAllZimmetler}
                  disabled={zimmetler.length === 0}
                >
                  <Download size={16} className="mr-2" />
                  CSV İndir
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
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-2"
                            onClick={() => handleQrCode(zimmet)}
                            title="QR Kod Oluştur"
                          >
                            <QrCode size={16} />
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

          {/* Dosyalar Tab */}
          <TabsContent value="dosyalar" className="mt-0 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Çalışan Belgeleri</h3>
              <Button
                onClick={() => setShowDokumanDialog(true)}
                className="bg-teal-500 hover:bg-teal-600"
                size="sm"
              >
                <Upload size={16} className="mr-2" />
                Belge Yükle
              </Button>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500">Henüz belge yüklenmemiş</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Dosya Adı</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Yüklenme Tarihi</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id} className="border-t hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-gray-400" />
                            <span className="text-sm font-medium">{doc.ad}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {new Date(doc.createdAt).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <a
                              href={doc.dosyaVerisi}
                              download={doc.ad}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-md border text-gray-600 hover:bg-gray-100"
                              title="İndir"
                            >
                              <Download size={16} />
                            </a>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="text-red-600 hover:bg-red-50 h-8 w-8"
                              title="Sil"
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

      {/* QR Kod Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Kod Etiketi</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-4 border rounded-lg bg-white" id="qr-label">
            <h3 className="font-bold text-lg mb-2 border-b w-full text-center pb-2">Halk Tv IK</h3>
            {qrCodeUrl && (
              <img src={qrCodeUrl} alt="QR Code" width={200} height={200} className="mb-4" />
            )}
            <div className="w-full text-left space-y-2 text-sm">
              <div>
                <span className="font-bold block text-gray-700">Çalışanlar Bilgileri:</span>
                <span className="break-words">
                  {calisan.adSoyad}
                </span>
              </div>
              <div>
                <span className="font-bold block text-gray-700">Envanterin Seri Numarası:</span>
                <span className="font-mono">
                  {selectedZimmetForQr?.envanterBilgisi?.seriNumarasi}
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

export default CalisanDetay
