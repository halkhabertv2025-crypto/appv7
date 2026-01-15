'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileText, Search, Filter, RotateCcw, Package, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Ayarlar() {
  const [auditLogs, setAuditLogs] = useState([])
  const [deletedEnvanterler, setDeletedEnvanterler] = useState([])
  const [deletedCalisanlar, setDeletedCalisanlar] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
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
    'User': 'Kullanıcı'
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

        <TabsContent value="system">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-12 text-gray-500">
                Sistem ayarları yapım aşamasındadır.
              </div>
            </CardContent>
          </Card>
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
                <div>
                  <div className="text-sm text-gray-600 mb-2">Detaylar</div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
