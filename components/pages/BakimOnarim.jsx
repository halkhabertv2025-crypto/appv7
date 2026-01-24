'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Pencil, Trash2, Search, Wrench, Clock, CheckCircle, AlertTriangle, DollarSign, Upload } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const BakimOnarim = ({ user }) => {
    const [kayitlar, setKayitlar] = useState([])
    const [envanterler, setEnvanterler] = useState([])
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showDialog, setShowDialog] = useState(false)
    const [editingKayit, setEditingKayit] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterDurum, setFilterDurum] = useState('all')
    const [filterTip, setFilterTip] = useState('all')
    const [envanterSearch, setEnvanterSearch] = useState('')
    const [formData, setFormData] = useState({
        envanterId: '',
        arizaTuru: '',
        aciklama: '',
        bildirilenTarih: new Date().toISOString().split('T')[0],
        servisFirma: '',
        maliyet: '',
        paraBirimi: 'TRY',
        tahminiSure: '',
        baslangicTarihi: '',
        bitisTarihi: '',
        durum: 'Beklemede',
        servisFisi: null,
        notlar: ''
    })
    const { toast } = useToast()

    useEffect(() => {
        fetchAll()
    }, [])

    const fetchAll = async () => {
        await Promise.all([
            fetchKayitlar(),
            fetchEnvanterler(),
            fetchStats()
        ])
    }

    const fetchKayitlar = async () => {
        try {
            const response = await fetch('/api/bakim-kayitlari')
            const data = await response.json()
            setKayitlar(data)
        } catch (error) {
            toast({ title: 'Hata', description: 'Bakım kayıtları yüklenemedi', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    const fetchEnvanterler = async () => {
        try {
            const response = await fetch('/api/envanterler')
            const data = await response.json()
            setEnvanterler(data)
        } catch (error) {
            console.error('Envanterler yüklenemedi')
        }
    }

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/bakim-istatistikleri')
            const data = await response.json()
            setStats(data)
        } catch (error) {
            console.error('İstatistikler yüklenemedi')
        }
    }

    const filteredKayitlar = kayitlar.filter(kayit => {
        const matchesSearch =
            kayit.envanterBilgisi?.marka?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            kayit.envanterBilgisi?.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            kayit.servisFirma?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            kayit.aciklama?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesDurum = filterDurum === 'all' || kayit.durum === filterDurum
        const matchesTip = filterTip === 'all' || kayit.arizaTuru === filterTip

        return matchesSearch && matchesDurum && matchesTip
    })

    const handleSubmit = async (e) => {
        e.preventDefault()

        try {
            const url = editingKayit
                ? `/api/bakim-kayitlari/${editingKayit.id}`
                : '/api/bakim-kayitlari'

            const response = await fetch(url, {
                method: editingKayit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    maliyet: parseFloat(formData.maliyet) || 0,
                    tahminiSure: parseInt(formData.tahminiSure) || null,
                    userId: user?.id,
                    userName: user?.adSoyad
                })
            })

            const data = await response.json()

            if (!response.ok) {
                toast({ title: 'Hata', description: data.error, variant: 'destructive' })
                return
            }

            toast({ title: 'Başarılı', description: editingKayit ? 'Kayıt güncellendi' : 'Kayıt oluşturuldu' })
            setShowDialog(false)
            resetForm()
            fetchAll()
        } catch (error) {
            toast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' })
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return

        try {
            const response = await fetch(`/api/bakim-kayitlari/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?.id, userName: user?.adSoyad })
            })

            if (!response.ok) {
                toast({ title: 'Hata', description: 'Silme işlemi başarısız', variant: 'destructive' })
                return
            }

            toast({ title: 'Başarılı', description: 'Kayıt silindi' })
            fetchAll()
        } catch (error) {
            toast({ title: 'Hata', description: 'İşlem başarısız', variant: 'destructive' })
        }
    }

    const resetForm = () => {
        setFormData({
            envanterId: '',
            arizaTuru: '',
            aciklama: '',
            bildirilenTarih: new Date().toISOString().split('T')[0],
            servisFirma: '',
            maliyet: '',
            paraBirimi: 'TRY',
            tahminiSure: '',
            baslangicTarihi: '',
            bitisTarihi: '',
            durum: 'Beklemede',
            servisFisi: null,
            notlar: ''
        })
        setEditingKayit(null)
        setEnvanterSearch('')
    }

    const openEditDialog = (kayit) => {
        setEditingKayit(kayit)
        setFormData({
            envanterId: kayit.envanterId || '',
            arizaTuru: kayit.arizaTuru || '',
            aciklama: kayit.aciklama || '',
            bildirilenTarih: kayit.bildirilenTarih ? new Date(kayit.bildirilenTarih).toISOString().split('T')[0] : '',
            servisFirma: kayit.servisFirma || '',
            maliyet: kayit.maliyet?.toString() || '',
            paraBirimi: kayit.paraBirimi || 'TRY',
            tahminiSure: kayit.tahminiSure?.toString() || '',
            baslangicTarihi: kayit.baslangicTarihi ? new Date(kayit.baslangicTarihi).toISOString().split('T')[0] : '',
            bitisTarihi: kayit.bitisTarihi ? new Date(kayit.bitisTarihi).toISOString().split('T')[0] : '',
            durum: kayit.durum || 'Beklemede',
            servisFisi: kayit.servisFisi || null,
            notlar: kayit.notlar || ''
        })
        setShowDialog(true)
    }

    const getDurumColor = (durum) => {
        switch (durum) {
            case 'Beklemede': return 'bg-yellow-100 text-yellow-800'
            case 'Serviste': return 'bg-blue-100 text-blue-800'
            case 'Tamamlandı': return 'bg-green-100 text-green-800'
            case 'İptal': return 'bg-gray-100 text-gray-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const getArizaIcon = (tip) => {
        switch (tip) {
            case 'Donanım': return <Wrench size={16} className="text-orange-600" />
            case 'Yazılım': return <AlertTriangle size={16} className="text-purple-600" />
            case 'Hasar': return <AlertTriangle size={16} className="text-red-600" />
            case 'Bakım': return <Clock size={16} className="text-blue-600" />
            default: return <Wrench size={16} className="text-gray-600" />
        }
    }

    const formatCurrency = (amount, currency) => {
        const symbols = { TRY: '₺', USD: '$', EUR: '€', GBP: '£' }
        return `${symbols[currency] || ''}${amount?.toLocaleString('tr-TR') || '0'}`
    }

    if (loading) {
        return <div className="flex items-center justify-center h-64">Yükleniyor...</div>
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Bakım / Onarım</h1>
                    <p className="text-gray-500 text-sm mt-1">Cihaz bakım ve onarım takibi</p>
                </div>
                <Button
                    onClick={() => { resetForm(); setShowDialog(true) }}
                    className="bg-teal-500 hover:bg-teal-600"
                >
                    <Plus size={20} className="mr-2" />
                    Yeni Kayıt
                </Button>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Beklemede</p>
                                <p className="text-2xl font-bold text-yellow-600">{stats.beklemede}</p>
                            </div>
                            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                <Clock className="text-yellow-600" size={20} />
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Serviste</p>
                                <p className="text-2xl font-bold text-blue-600">{stats.serviste}</p>
                            </div>
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <Wrench className="text-blue-600" size={20} />
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Tamamlanan</p>
                                <p className="text-2xl font-bold text-green-600">{stats.tamamlanan}</p>
                            </div>
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle className="text-green-600" size={20} />
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Bugüne Kadar Toplam Maliyet</p>
                                <p className="text-xl font-bold text-gray-800">
                                    {formatCurrency(stats.toplamMaliyet?.TRY, 'TRY')}
                                </p>
                            </div>
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                <DollarSign className="text-gray-600" size={20} />
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                <Input
                                    placeholder="Ara (marka, model, servis)..."
                                    className="pl-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <Select value={filterDurum} onValueChange={setFilterDurum}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Durum" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tüm Durumlar</SelectItem>
                                <SelectItem value="Beklemede">Beklemede</SelectItem>
                                <SelectItem value="Serviste">Serviste</SelectItem>
                                <SelectItem value="Tamamlandı">Tamamlandı</SelectItem>
                                <SelectItem value="İptal">İptal</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterTip} onValueChange={setFilterTip}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Arıza Tipi" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tüm Tipler</SelectItem>
                                <SelectItem value="Donanım">Donanım</SelectItem>
                                <SelectItem value="Yazılım">Yazılım</SelectItem>
                                <SelectItem value="Hasar">Hasar</SelectItem>
                                <SelectItem value="Bakım">Bakım</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    {filteredKayitlar.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            {kayitlar.length === 0 ? 'Henüz bakım kaydı eklenmemiş' : 'Arama kriterlerine uygun sonuç bulunamadı'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b bg-gray-50">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Envanter</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Arıza Tipi</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Servis Firma</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Maliyet</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Bildirim Tarihi</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Durum</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredKayitlar.map((kayit) => (
                                        <tr key={kayit.id} className="border-b hover:bg-gray-50">
                                            <td className="py-3 px-4">
                                                <div className="font-medium text-sm">
                                                    {kayit.envanterBilgisi?.tip} {kayit.envanterBilgisi?.marka} {kayit.envanterBilgisi?.model}
                                                </div>
                                                <div className="text-xs text-gray-500">{kayit.envanterBilgisi?.seriNumarasi}</div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    {getArizaIcon(kayit.arizaTuru)}
                                                    <span className="text-sm">{kayit.arizaTuru}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-sm">{kayit.servisFirma || '-'}</td>
                                            <td className="py-3 px-4 text-sm font-medium">
                                                {kayit.maliyet > 0 ? formatCurrency(kayit.maliyet, kayit.paraBirimi) : '-'}
                                            </td>
                                            <td className="py-3 px-4 text-sm">
                                                {kayit.bildirilenTarih ? new Date(kayit.bildirilenTarih).toLocaleDateString('tr-TR') : '-'}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", getDurumColor(kayit.durum))}>
                                                    {kayit.durum}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex justify-end space-x-2">
                                                    <Button variant="outline" size="sm" onClick={() => openEditDialog(kayit)}>
                                                        <Pencil size={16} />
                                                    </Button>
                                                    <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(kayit.id)}>
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
                        <DialogTitle>{editingKayit ? 'Bakım Kaydı Düzenle' : 'Yeni Bakım Kaydı'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label htmlFor="envanterId">Envanter *</Label>
                                <div className="space-y-2">
                                    <Input
                                        placeholder="Envanter ara (marka, model, seri no)..."
                                        value={envanterSearch}
                                        onChange={(e) => setEnvanterSearch(e.target.value)}
                                    />
                                    <Select
                                        value={formData.envanterId}
                                        onValueChange={(value) => {
                                            setFormData({ ...formData, envanterId: value })
                                            setEnvanterSearch('') // Clear search after selection
                                        }}
                                        required
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Envanter seçin">
                                                {formData.envanterId && (() => {
                                                    const selected = envanterler.find(e => e.id === formData.envanterId)
                                                    return selected ? `${selected.envanterTipiAd} ${selected.marka} ${selected.model}` : 'Envanter seçin'
                                                })()}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent className="max-h-60">
                                            {envanterler
                                                .filter(env => {
                                                    if (!envanterSearch) return true
                                                    const searchLower = envanterSearch.toLowerCase()
                                                    return (
                                                        env.marka?.toLowerCase().includes(searchLower) ||
                                                        env.model?.toLowerCase().includes(searchLower) ||
                                                        env.seriNumarasi?.toLowerCase().includes(searchLower) ||
                                                        env.envanterTipiAd?.toLowerCase().includes(searchLower)
                                                    )
                                                })
                                                .slice(0, 50)
                                                .map(env => (
                                                    <SelectItem key={env.id} value={env.id}>
                                                        {env.envanterTipiAd} {env.marka} {env.model} ({env.seriNumarasi})
                                                    </SelectItem>
                                                ))}
                                            {envanterSearch && envanterler.filter(env => {
                                                const searchLower = envanterSearch.toLowerCase()
                                                return (
                                                    env.marka?.toLowerCase().includes(searchLower) ||
                                                    env.model?.toLowerCase().includes(searchLower) ||
                                                    env.seriNumarasi?.toLowerCase().includes(searchLower) ||
                                                    env.envanterTipiAd?.toLowerCase().includes(searchLower)
                                                )
                                            }).length === 0 && (
                                                    <div className="py-2 px-2 text-sm text-gray-500">Sonuç bulunamadı</div>
                                                )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="arizaTuru">Arıza Türü *</Label>
                                <Select
                                    value={formData.arizaTuru}
                                    onValueChange={(value) => setFormData({ ...formData, arizaTuru: value })}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tür seçin" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Donanım">Donanım</SelectItem>
                                        <SelectItem value="Yazılım">Yazılım</SelectItem>
                                        <SelectItem value="Hasar">Hasar</SelectItem>
                                        <SelectItem value="Bakım">Periyodik Bakım</SelectItem>
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
                                        <SelectItem value="Beklemede">Beklemede</SelectItem>
                                        <SelectItem value="Serviste">Serviste</SelectItem>
                                        <SelectItem value="Tamamlandı">Tamamlandı</SelectItem>
                                        <SelectItem value="İptal">İptal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="col-span-2">
                                <Label htmlFor="aciklama">Arıza Açıklaması</Label>
                                <Textarea
                                    id="aciklama"
                                    value={formData.aciklama}
                                    onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
                                    rows={2}
                                    placeholder="Arıza detaylarını girin..."
                                />
                            </div>

                            <div>
                                <Label htmlFor="servisFirma">Servis Firması</Label>
                                <Input
                                    id="servisFirma"
                                    value={formData.servisFirma}
                                    onChange={(e) => setFormData({ ...formData, servisFirma: e.target.value })}
                                    placeholder="Firma adı"
                                />
                            </div>

                            <div>
                                <Label htmlFor="bildirilenTarih">Bildirim Tarihi</Label>
                                <Input
                                    id="bildirilenTarih"
                                    type="date"
                                    value={formData.bildirilenTarih}
                                    onChange={(e) => setFormData({ ...formData, bildirilenTarih: e.target.value })}
                                />
                            </div>

                            <div>
                                <Label htmlFor="baslangicTarihi">Servis Başlangıç</Label>
                                <Input
                                    id="baslangicTarihi"
                                    type="date"
                                    value={formData.baslangicTarihi}
                                    onChange={(e) => setFormData({ ...formData, baslangicTarihi: e.target.value })}
                                />
                            </div>

                            <div>
                                <Label htmlFor="bitisTarihi">Servis Bitiş</Label>
                                <Input
                                    id="bitisTarihi"
                                    type="date"
                                    value={formData.bitisTarihi}
                                    onChange={(e) => setFormData({ ...formData, bitisTarihi: e.target.value })}
                                />
                            </div>

                            <div>
                                <Label htmlFor="maliyet">Maliyet</Label>
                                <Input
                                    id="maliyet"
                                    type="number"
                                    value={formData.maliyet}
                                    onChange={(e) => setFormData({ ...formData, maliyet: e.target.value })}
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

                            <div className="col-span-2">
                                <Label htmlFor="servisFisi">Servis Fişi / Formu</Label>
                                <div className="mt-1 flex items-center gap-2">
                                    <Input
                                        id="servisFisi"
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                                // In a real app, you'd upload to a server
                                                setFormData({ ...formData, servisFisi: file.name })
                                            }
                                        }}
                                        className="flex-1"
                                    />
                                    {formData.servisFisi && (
                                        <span className="text-sm text-teal-600">{formData.servisFisi}</span>
                                    )}
                                </div>
                            </div>

                            <div className="col-span-2">
                                <Label htmlFor="notlar">Notlar</Label>
                                <Textarea
                                    id="notlar"
                                    value={formData.notlar}
                                    onChange={(e) => setFormData({ ...formData, notlar: e.target.value })}
                                    rows={2}
                                />
                            </div>
                        </div>

                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                                İptal
                            </Button>
                            <Button type="submit" className="bg-teal-500 hover:bg-teal-600">
                                {editingKayit ? 'Güncelle' : 'Oluştur'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default BakimOnarim
