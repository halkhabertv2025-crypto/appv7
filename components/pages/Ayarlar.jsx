'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileText, Search, Filter, RotateCcw, Package, Users, Download, Database, AlertCircle, Key, Mail, Send } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Ayarlar() {
  const [auditLogs, setAuditLogs] = useState([])
  const [deletedEnvanterler, setDeletedEnvanterler] = useState([])
  const [deletedCalisanlar, setDeletedCalisanlar] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [backupStats, setBackupStats] = useState(null)
  const [filters, setFilters] = useState({
    actionType: '',
    entityType: '',
    startDate: '',
    endDate: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  })
  const { toast } = useToast()

  // Mail settings state
  const [mailSettings, setMailSettings] = useState({
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: 'Halk TV Envanter Sistemi',
    enableSsl: true
  })
  const [mailLoading, setMailLoading] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testLoading, setTestLoading] = useState(false)

  useEffect(() => {
    fetchAuditLogs()
  }, [pagination.page, filters])

  const fetchDeletedItems = async () => {
    try {
      const [envRes, calRes] = await Promise.all([
        fetch('/api/deleted/envanterler'),
        fetch('/api/deleted/calisanlar')
      ])
      const envData = await envRes.json()
      const calData = await calRes.json()
      setDeletedEnvanterler(envData)
      setDeletedCalisanlar(calData)
    } catch (error) {
      console.error('Silinen öğeler yüklenemedi')
    }
  }

  const restoreEnvanter = async (id) => {
    try {
      const response = await fetch(`/api/restore/envanter/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      if (response.ok) {
        toast({ title: 'Başarılı', description: 'Envanter geri yüklendi' })
        fetchDeletedItems()
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Geri yükleme başarısız', variant: 'destructive' })
    }
  }

  const restoreCalisan = async (id) => {
    try {
      const response = await fetch(`/api/restore/calisan/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      if (response.ok) {
        toast({ title: 'Başarılı', description: 'Çalışan geri yüklendi' })
        fetchDeletedItems()
      }
    } catch (error) {
      toast({ title: 'Hata', description: 'Geri yükleme başarısız', variant: 'destructive' })
    }
  }

  const fetchAuditLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.actionType && { actionType: filters.actionType }),
        ...(filters.entityType && { entityType: filters.entityType }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      })

      const response = await fetch(`/api/audit-logs?${params}`)
      const data = await response.json()

      setAuditLogs(data.logs || [])
      setPagination(prev => ({ ...prev, ...data.pagination }))
    } catch (error) {
      console.error('Audit logs yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  const actionTypeLabels = {
    'CREATE_EMPLOYEE': 'Çalışan Oluşturuldu',
    'UPDATE_EMPLOYEE': 'Çalışan Güncellendi',
    'DELETE_EMPLOYEE': 'Çalışan Silindi',
    'CREATE_INVENTORY': 'Envanter Oluşturuldu',
    'UPDATE_INVENTORY': 'Envanter Güncellendi',
    'UPDATE_INVENTORY_STATUS': 'Envanter Durumu Değişti',
    'DELETE_INVENTORY': 'Envanter Silindi',
    'RESTORE_INVENTORY': 'Envanter Geri Yüklendi',
    'CREATE_DEPARTMENT': 'Departman Oluşturuldu',
    'UPDATE_DEPARTMENT': 'Departman Güncellendi',
    'DELETE_DEPARTMENT': 'Departman Silindi',
    'CREATE_ZIMMET': 'Zimmet Oluşturuldu',
    'RETURN_ZIMMET': 'Zimmet İade Alındı',
    'CREATE_DIGITAL_ASSET': 'Dijital Varlık Oluşturuldu',
    'UPDATE_DIGITAL_ASSET': 'Dijital Varlık Güncellendi',
    'DELETE_DIGITAL_ASSET': 'Dijital Varlık Silindi',
    'CREATE_DIGITAL_ASSET_CATEGORY': 'Dijital Varlık Kategorisi Oluşturuldu',
    'RESTORE_EMPLOYEE': 'Çalışan Geri Yüklendi',
    'ASSIGN_ROLE': 'Rol Atandı',
    'IMPORT_INVENTORY': 'Envanter İçe Aktarıldı',
    'EXPORT_INVENTORY': 'Envanter Dışa Aktarıldı'
  }

  const entityTypeLabels = {
    'Employee': 'Çalışan',
    'Inventory': 'Envanter',
    'Zimmet': 'Zimmet',
    'Department': 'Departman',
    'User': 'Kullanıcı',
    'DigitalAsset': 'Dijital Varlık'
  }

  const openDetailDialog = (log) => {
    setSelectedLog(log)
    setShowDetailDialog(true)
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
  }

  const clearFilters = () => {
    setFilters({
      actionType: '',
      entityType: '',
      startDate: '',
      endDate: ''
    })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const fetchBackupStats = async () => {
    try {
      const response = await fetch('/api/backup/stats')
      const data = await response.json()
      setBackupStats(data)
    } catch (error) {
      console.error('Backup stats yüklenemedi:', error)
    }
  }

  const fetchMailSettings = async () => {
    setMailLoading(true)
    try {
      const response = await fetch('/api/settings/mail')
      const data = await response.json()
      setMailSettings(data)
    } catch (error) {
      console.error('Mail ayarları yüklenemedi:', error)
    } finally {
      setMailLoading(false)
    }
  }

  const saveMailSettings = async () => {
    setMailLoading(true)
    try {
      const response = await fetch('/api/settings/mail', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mailSettings)
      })

      if (!response.ok) {
        throw new Error('Kaydetme başarısız')
      }

      toast({ title: 'Başarılı', description: 'Mail ayarları kaydedildi' })
    } catch (error) {
      toast({ title: 'Hata', description: 'Mail ayarları kaydedilemedi', variant: 'destructive' })
    } finally {
      setMailLoading(false)
    }
  }

  const sendTestMail = async () => {
    if (!testEmail) {
      toast({ title: 'Hata', description: 'Test email adresi giriniz', variant: 'destructive' })
      return
    }

    setTestLoading(true)
    try {
      const response = await fetch('/api/settings/mail/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Test maili gönderilemedi')
      }

      toast({ title: 'Başarılı', description: 'Test maili gönderildi' })
    } catch (error) {
      toast({ title: 'Hata', description: error.message, variant: 'destructive' })
    } finally {
      setTestLoading(false)
    }
  }

  const handleFullBackup = async () => {
    setExportLoading(true)
    try {
      const response = await fetch('/api/backup/export')

      if (!response.ok) {
        toast({ title: 'Hata', description: 'Yedekleme başarısız', variant: 'destructive' })
        return
      }

      const data = await response.json()

      // Create JSON file and download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `sistem_yedeği_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: 'Başarılı',
        description: 'Sistem yedeği başarıyla indirildi'
      })
    } catch (error) {
      toast({ title: 'Hata', description: 'Yedekleme sırasında bir hata oluştu', variant: 'destructive' })
    } finally {
      setExportLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Ayarlar</h2>
        <p className="text-gray-500">Sistem ayarları ve işlem geçmişi</p>
      </div>

      <Tabs defaultValue="audit-log" className="w-full">
        <TabsList>
          <TabsTrigger value="audit-log">İşlem Geçmişi</TabsTrigger>
          <TabsTrigger value="restore" onClick={fetchDeletedItems}>Geri Yükle</TabsTrigger>
          <TabsTrigger value="mail" onClick={fetchMailSettings}>Mail Ayarları</TabsTrigger>
          <TabsTrigger value="system">Sistem Ayarları</TabsTrigger>
        </TabsList>

        <TabsContent value="audit-log" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2" size={20} />
                İşlem Geçmişi (Audit Log)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label htmlFor="actionType">İşlem Türü</Label>
                  <Select
                    value={filters.actionType || 'all'}
                    onValueChange={(value) => handleFilterChange('actionType', value === 'all' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tümü" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      {Object.keys(actionTypeLabels).map(key => (
                        <SelectItem key={key} value={key}>
                          {actionTypeLabels[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="entityType">Varlık Türü</Label>
                  <Select
                    value={filters.entityType || 'all'}
                    onValueChange={(value) => handleFilterChange('entityType', value === 'all' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tümü" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      {Object.keys(entityTypeLabels).map(key => (
                        <SelectItem key={key} value={key}>
                          {entityTypeLabels[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="startDate">Başlangıç Tarihi</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">Bitiş Tarihi</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Filtreleri Temizle
                </Button>
              </div>

              {/* Audit Log Table */}
              {loading ? (
                <div className="text-center py-8">Yükleniyor...</div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  İşlem geçmişi bulunamadı
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Tarih-Saat</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Kullanıcı</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">İşlem</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Varlık Türü</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Varlık ID</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Detay</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm">
                              {new Date(log.createdAt).toLocaleString('tr-TR')}
                            </td>
                            <td className="py-3 px-4 text-sm font-medium">
                              {log.actorUserName}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {actionTypeLabels[log.actionType] || log.actionType}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {entityTypeLabels[log.entityType] || log.entityType}
                            </td>
                            <td className="py-3 px-4 text-sm font-mono text-xs">
                              {log.entityId.substring(0, 8)}...
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDetailDialog(log)}
                              >
                                Görüntüle
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-600">
                      Toplam {pagination.total} kayıt, Sayfa {pagination.page} / {pagination.pages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page === 1}
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      >
                        Önceki
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page === pagination.pages}
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      >
                        Sonraki
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="restore" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Silinen Envanterler */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Package className="mr-2" size={20} />
                  Silinen Envanterler ({deletedEnvanterler.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {deletedEnvanterler.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">Silinen envanter bulunmuyor</div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {deletedEnvanterler.map(env => (
                      <div key={env.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-sm">{env.marka} {env.model}</div>
                          <div className="text-xs text-gray-500">
                            {env.envanterTipiAd} - {env.seriNumarasi}
                          </div>
                          <div className="text-xs text-red-500">
                            Silinme: {new Date(env.deletedAt).toLocaleDateString('tr-TR')}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => restoreEnvanter(env.id)}>
                          <RotateCcw size={14} className="mr-1" />
                          Geri Yükle
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Silinen Çalışanlar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Users className="mr-2" size={20} />
                  Silinen Çalışanlar ({deletedCalisanlar.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {deletedCalisanlar.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">Silinen çalışan bulunmuyor</div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {deletedCalisanlar.map(cal => (
                      <div key={cal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-sm">{cal.adSoyad}</div>
                          <div className="text-xs text-gray-500">
                            {cal.departmanAd} - {cal.email}
                          </div>
                          <div className="text-xs text-red-500">
                            Silinme: {new Date(cal.deletedAt).toLocaleDateString('tr-TR')}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => restoreCalisan(cal.id)}>
                          <RotateCcw size={14} className="mr-1" />
                          Geri Yükle
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="mail">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="mr-2" size={20} />
                  Mail Ayarları (SMTP)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <AlertCircle className="text-blue-600 mt-0.5" size={20} />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Mail Bildirimleri Hakkında</p>
                    <p>Bakım/Onarım kaydı "Tamamlandı" durumuna geçtiğinde, yönetici ve admin kullanıcılara otomatik mail bildirimi gönderilir.</p>
                  </div>
                </div>

                {mailLoading ? (
                  <div className="text-center py-8">Yükleniyor...</div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="smtpHost">SMTP Sunucu</Label>
                        <Input
                          id="smtpHost"
                          placeholder="smtp.example.com"
                          value={mailSettings.smtpHost}
                          onChange={(e) => setMailSettings(prev => ({ ...prev, smtpHost: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="smtpPort">SMTP Port</Label>
                        <Input
                          id="smtpPort"
                          type="number"
                          placeholder="587"
                          value={mailSettings.smtpPort}
                          onChange={(e) => setMailSettings(prev => ({ ...prev, smtpPort: parseInt(e.target.value) || 587 }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="smtpUser">SMTP Kullanıcı Adı</Label>
                        <Input
                          id="smtpUser"
                          placeholder="user@example.com"
                          value={mailSettings.smtpUser}
                          onChange={(e) => setMailSettings(prev => ({ ...prev, smtpUser: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="smtpPassword">SMTP Şifre</Label>
                        <Input
                          id="smtpPassword"
                          type="password"
                          placeholder={mailSettings.hasPassword ? '••••••••' : 'Şifre giriniz'}
                          value={mailSettings.smtpPassword}
                          onChange={(e) => setMailSettings(prev => ({ ...prev, smtpPassword: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="fromEmail">Gönderen Email</Label>
                        <Input
                          id="fromEmail"
                          placeholder="noreply@example.com"
                          value={mailSettings.fromEmail}
                          onChange={(e) => setMailSettings(prev => ({ ...prev, fromEmail: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="fromName">Gönderen Adı</Label>
                        <Input
                          id="fromName"
                          placeholder="Halk TV Envanter Sistemi"
                          value={mailSettings.fromName}
                          onChange={(e) => setMailSettings(prev => ({ ...prev, fromName: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="enableSsl"
                        checked={mailSettings.enableSsl}
                        onChange={(e) => setMailSettings(prev => ({ ...prev, enableSsl: e.target.checked }))}
                        className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                      />
                      <Label htmlFor="enableSsl" className="font-normal">SSL/TLS Kullan</Label>
                    </div>

                    <div className="pt-4 border-t">
                      <Button
                        onClick={saveMailSettings}
                        disabled={mailLoading}
                        className="bg-teal-500 hover:bg-teal-600"
                      >
                        {mailLoading ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Send className="mr-2" size={20} />
                  Test Maili Gönder
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Mail ayarlarınızı test etmek için aşağıya email adresi girin.
                </p>
                <div className="flex gap-4">
                  <Input
                    placeholder="test@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={sendTestMail}
                    disabled={testLoading || !testEmail}
                    variant="outline"
                  >
                    {testLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                        Gönderiliyor...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2" size={16} />
                        Test Maili Gönder
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="mr-2" size={20} />
                  Sistem Yedekleme
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <AlertCircle className="text-blue-600 mt-0.5" size={20} />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Sistem Yedeği Hakkında</p>
                    <p>Tüm envanter, çalışan, zimmet, departman ve işlem geçmişi verileriniz JSON formatında indirilecektir. Bu yedek dosyası ile sistemin tam bir kopyasını alabilirsiniz.</p>
                  </div>
                </div>

                {backupStats ? (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-3">Yedeklenecek Veriler</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <Card className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500">Envanterler</p>
                            <p className="text-2xl font-bold text-gray-800">{backupStats.envanterler || 0}</p>
                          </div>
                          <Package className="text-teal-500" size={24} />
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500">Çalışanlar</p>
                            <p className="text-2xl font-bold text-gray-800">{backupStats.calisanlar || 0}</p>
                          </div>
                          <Users className="text-blue-500" size={24} />
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500">Zimmetler</p>
                            <p className="text-2xl font-bold text-gray-800">{backupStats.zimmetler || 0}</p>
                          </div>
                          <FileText className="text-green-500" size={24} />
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500">Departmanlar</p>
                            <p className="text-2xl font-bold text-gray-800">{backupStats.departmanlar || 0}</p>
                          </div>
                          <Users className="text-purple-500" size={24} />
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500">Envanter Tipleri</p>
                            <p className="text-2xl font-bold text-gray-800">{backupStats.envanterTipleri || 0}</p>
                          </div>
                          <Package className="text-orange-500" size={24} />
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500">İşlem Kayıtları</p>
                            <p className="text-2xl font-bold text-gray-800">{backupStats.auditLogs || 0}</p>
                          </div>
                          <FileText className="text-red-500" size={24} />
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500">Dijital Varlıklar</p>
                            <p className="text-2xl font-bold text-gray-800">{backupStats.digitalAssets || 0}</p>
                          </div>
                          <Key className="text-indigo-500" size={24} />
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500">Dijital Varlık Kategorileri</p>
                            <p className="text-2xl font-bold text-gray-800">{backupStats.digitalAssetCategories || 0}</p>
                          </div>
                          <Database className="text-pink-500" size={24} />
                        </div>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center py-8">
                    <Button variant="outline" onClick={fetchBackupStats}>
                      <Database className="mr-2" size={16} />
                      İstatistikleri Yükle
                    </Button>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <Button
                    onClick={handleFullBackup}
                    disabled={exportLoading}
                    className="w-full bg-teal-500 hover:bg-teal-600"
                    size="lg"
                  >
                    {exportLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Yedek Hazırlanıyor...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2" size={20} />
                        Tam Sistem Yedeği Al
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Yedek dosyası: sistem_yedegi_[tarih]_[zaman].json
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>İşlem Detayları</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Kullanıcı</div>
                  <div className="font-medium">{selectedLog.actorUserName}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Tarih-Saat</div>
                  <div className="font-medium">
                    {new Date(selectedLog.createdAt).toLocaleString('tr-TR')}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">İşlem</div>
                  <div className="font-medium">
                    {actionTypeLabels[selectedLog.actionType] || selectedLog.actionType}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Varlık Türü</div>
                  <div className="font-medium">
                    {entityTypeLabels[selectedLog.entityType] || selectedLog.entityType}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-gray-600">Varlık ID</div>
                  <div className="font-mono text-sm">{selectedLog.entityId}</div>
                </div>
              </div>

              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div className="space-y-4">
                  {/* Temel Bilgiler */}
                  {(selectedLog.details.employeeName || selectedLog.details.departmentName ||
                    selectedLog.details.assetName || selectedLog.details.marka) && (
                      <div>
                        <div className="text-sm text-gray-600 mb-2">Etkilenen Kayıt</div>
                        <div className="bg-blue-50 p-3 rounded-lg">
                          {selectedLog.details.employeeName && (
                            <div className="text-sm"><strong>Çalışan:</strong> {selectedLog.details.employeeName}</div>
                          )}
                          {selectedLog.details.departmentName && (
                            <div className="text-sm"><strong>Departman:</strong> {selectedLog.details.departmentName}</div>
                          )}
                          {selectedLog.details.assetName && (
                            <div className="text-sm"><strong>Dijital Varlık:</strong> {selectedLog.details.assetName}</div>
                          )}
                          {selectedLog.details.marka && (
                            <div className="text-sm"><strong>Envanter:</strong> {selectedLog.details.marka} {selectedLog.details.model} ({selectedLog.details.seriNumarasi})</div>
                          )}
                        </div>
                      </div>
                    )}

                  {/* Değişiklikler - Before/After */}
                  {selectedLog.details.degisiklikler && Object.keys(selectedLog.details.degisiklikler).length > 0 && (
                    <div>
                      <div className="text-sm text-gray-600 mb-2">Yapılan Değişiklikler</div>
                      <div className="bg-gray-50 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="text-left py-2 px-3 font-medium text-gray-600">Alan</th>
                              <th className="text-left py-2 px-3 font-medium text-gray-600">Eski Değer</th>
                              <th className="text-left py-2 px-3 font-medium text-gray-600">Yeni Değer</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(selectedLog.details.degisiklikler).map(([field, values]) => (
                              <tr key={field} className="border-t border-gray-200">
                                <td className="py-2 px-3 font-medium text-gray-700">
                                  {{
                                    'ad': 'Ad',
                                    'adSoyad': 'Ad Soyad',
                                    'email': 'Email',
                                    'telefon': 'Telefon',
                                    'departmanId': 'Departman',
                                    'durum': 'Durum',
                                    'aciklama': 'Açıklama',
                                    'marka': 'Marka',
                                    'model': 'Model',
                                    'seriNumarasi': 'Seri Numarası',
                                    'notlar': 'Notlar',
                                    'envanterTipiId': 'Envanter Tipi',
                                    'yoneticiYetkisi': 'Yönetici Yetkisi',
                                    'adminYetkisi': 'Admin Yetkisi',
                                    'hesapEmail': 'Hesap Email',
                                    'hesapKullaniciAdi': 'Kullanıcı Adı',
                                    'lisansTipi': 'Lisans Tipi',
                                    'calisanId': 'Çalışan',
                                    'envanterId': 'Envanter'
                                  }[field] || field}
                                </td>
                                <td className="py-2 px-3">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-100 text-red-800 text-xs">
                                    {typeof values.onceki === 'boolean'
                                      ? (values.onceki ? 'Evet' : 'Hayır')
                                      : (values.onceki || '-')}
                                  </span>
                                </td>
                                <td className="py-2 px-3">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs">
                                    {typeof values.yeni === 'boolean'
                                      ? (values.yeni ? 'Evet' : 'Hayır')
                                      : (values.yeni || '-')}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Diğer Detaylar (degisiklikler dışındaki alanlar) */}
                  {Object.keys(selectedLog.details).filter(k =>
                    !['degisiklikler', 'employeeName', 'departmentName', 'assetName', 'marka', 'model', 'seriNumarasi'].includes(k)
                  ).length > 0 && (
                      <div>
                        <div className="text-sm text-gray-600 mb-2">Ek Bilgiler</div>
                        <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                          {Object.entries(selectedLog.details)
                            .filter(([k]) => !['degisiklikler', 'employeeName', 'departmentName', 'assetName', 'marka', 'model', 'seriNumarasi'].includes(k))
                            .map(([key, value]) => (
                              <div key={key} className="text-sm">
                                <strong className="text-gray-600">{key}:</strong>{' '}
                                <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
