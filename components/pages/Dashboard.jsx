'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, PackageCheck, PackageMinus, PackageX, TrendingUp } from 'lucide-react'

const Dashboard = () => {
  const [stats, setStats] = useState({
    total: 0,
    zimmetli: 0,
    depoda: 0,
    arizali: 0
  })
  const [recentZimmetler, setRecentZimmetler] = useState([])
  const [recentLogins, setRecentLogins] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard')
      const data = await response.json()
      setStats(data.stats)
      setRecentZimmetler(data.recentZimmetler)
      setRecentLogins(data.recentLogins || [])
    } catch (error) {
      console.error('Dashboard verileri alınamadı:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Toplam Envanter',
      value: stats.total,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Zimmetli',
      value: stats.zimmetli,
      icon: PackageCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Depoda',
      value: stats.depoda,
      icon: PackageMinus,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      title: 'Arızalı / Kayıp',
      value: stats.arizali,
      icon: PackageX,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Anasayfa</h2>
        <p className="text-gray-500">Merhaba, Halk TV'ye hoş geldiniz</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          const percentage = stats.total > 0 ? Math.round((stat.value / stats.total) * 100) : 0

          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={stat.color} size={24} />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
                    <div className="text-xs text-gray-500">{percentage}%</div>
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-600">{stat.title}</div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${stat.color.replace('text-', 'bg-')}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="mr-2 text-teal-600" size={20} />
              İzin Taleplerlerim
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              Bekleyen izin talebiniz bulunmamaktadır
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">İzin Onaylarım</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              Bekleyen izin onayınız bulunmamaktadır
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Son Zimmet Hareketleri</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
          ) : recentZimmetler.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Bugün izde olan çalışan bulunmamaktadır
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Envanter</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Çalışan</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Departman</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Zimmet Tarihi</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {recentZimmetler.map((zimmet) => (
                    <tr key={zimmet.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm">{zimmet.envanterAd}</td>
                      <td className="py-3 px-4 text-sm">{zimmet.calisanAd}</td>
                      <td className="py-3 px-4 text-sm">{zimmet.departmanAd}</td>
                      <td className="py-3 px-4 text-sm">
                        {new Date(zimmet.zimmetTarihi).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${zimmet.durum === 'Aktif' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                          {zimmet.durum}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tebrikler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-lg font-semibold">AE</span>
            </div>
            <div className="flex-1">
              <div className="font-medium">Adem Elma</div>
              <div className="text-sm text-gray-500">Yeni İşe Alım - Bugün</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Son Login Olanlar</CardTitle>
        </CardHeader>
        <CardContent>
          {recentLogins.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">
              Henüz login kaydı yok
            </div>
          ) : (
            <div className="space-y-3">
              {recentLogins.map((login, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-semibold text-xs">
                      {login.userName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{login.userName}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(login.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(login.timestamp).toLocaleDateString('tr-TR')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Dashboard