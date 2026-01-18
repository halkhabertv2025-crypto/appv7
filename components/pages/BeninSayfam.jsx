'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, Briefcase, Package, DollarSign, MapPin, Phone, FileText, File, Download, Camera } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const BeninSayfam = ({ user }) => {
  const [activeTab, setActiveTab] = useState('temel-bilgiler')
  const [zimmetler, setZimmetler] = useState([])
  const [evraklar, setEvraklar] = useState([])
  const [loading, setLoading] = useState(true)
  const [profileImage, setProfileImage] = useState(null)
  const fileInputRef = useRef(null)
  const { toast } = useToast()

  useEffect(() => {
    if (user?.id) {
      fetchUserData()
      // Load saved profile image
      const savedImage = localStorage.getItem(`profileImage_${user.id}`)
      if (savedImage) {
        setProfileImage(savedImage)
      }
    }
  }, [user])

  const fetchUserData = async () => {
    try {
      const [zimmetRes, evrakRes] = await Promise.all([
        fetch(`/api/calisanlar/${user.id}/zimmetler`),
        fetch(`/api/calisanlar/${user.id}/belgeler`)
      ])

      if (zimmetRes.ok) {
        const zimmetData = await zimmetRes.json()
        setZimmetler(zimmetData.filter(z => z.durum === 'Aktif'))
      }

      if (evrakRes.ok) {
        const evrakData = await evrakRes.json()
        setEvraklar(evrakData)
      }
    } catch (error) {
      console.error('Veri çekilemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: 'Hata', description: 'Dosya boyutu 2MB\'dan küçük olmalıdır', variant: 'destructive' })
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result
        setProfileImage(base64)
        localStorage.setItem(`profileImage_${user.id}`, base64)
        toast({ title: 'Başarılı', description: 'Profil resmi güncellendi' })
      }
      reader.readAsDataURL(file)
    }
  }

  // User info from logged-in user
  const userInfo = {
    ad: user?.adSoyad?.split(' ')[0] || 'Kullanıcı',
    soyad: user?.adSoyad?.split(' ').slice(1).join(' ') || '',
    unvan: '-',
    yonetici: '-',
    departman: user?.departmanAd || 'Bilinmiyor',
    kurumSicilNo: '-',
    isEposta: user?.email || '-',
    isTelefon: '-',
    dahili: '-',
    sirketGirisTarihi: '-',
    calismaSuresi: '-',
    durum: 'Aktif'
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Benim Sayfam</h2>
      </div>

      <div className="flex gap-6">
        {/* Sol taraf - Profil */}
        <Card className="w-80">
          <CardContent className="p-6 text-center">
            <div className="mb-4 relative">
              <div
                className="w-40 h-40 mx-auto bg-gray-200 rounded-full flex items-center justify-center overflow-hidden cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                {profileImage ? (
                  <img src={profileImage} alt="Profil" className="w-full h-full object-cover" />
                ) : (
                  <User size={80} className="text-gray-400" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                  <Camera size={32} className="text-white" />
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <p className="text-xs text-gray-500 mt-2">Resim değiştirmek için tıklayın</p>
            </div>
            <h3 className="text-xl font-bold mb-2">{userInfo.ad} {userInfo.soyad}</h3>
            <p className="text-sm text-gray-600 mb-4">E-Posta: {userInfo.isEposta}</p>
            <Button variant="outline" className="w-full text-teal-600 border-teal-600">
              Şifre Değiştir
            </Button>
          </CardContent>
        </Card>

        {/* Sağ taraf - Sekmeli bilgiler */}
        <Card className="flex-1">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                <TabsTrigger
                  value="temel-bilgiler"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:bg-transparent"
                >
                  Temel Bilgiler
                </TabsTrigger>

                <TabsTrigger
                  value="zimmetler"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:bg-transparent"
                >
                  Zimmetler
                </TabsTrigger>

                <TabsTrigger
                  value="atamalar"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:bg-transparent"
                >
                  Atamalar
                </TabsTrigger>
                <TabsTrigger
                  value="iletisim"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:bg-transparent"
                >
                  İletişim
                </TabsTrigger>
                <TabsTrigger
                  value="ozel-alanlar"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:bg-transparent"
                >
                  Özel Alanlar
                </TabsTrigger>
                <TabsTrigger
                  value="sozlesmelerim"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:bg-transparent"
                >
                  Sözleşmelerim
                </TabsTrigger>
                <TabsTrigger
                  value="evraklarim"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:bg-transparent"
                >
                  Evraklarım
                </TabsTrigger>
              </TabsList>

              <div className="p-6">
                {/* Temel Bilgiler */}
                <TabsContent value="temel-bilgiler" className="mt-0">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Adı</div>
                        <div className="text-base font-medium">{userInfo.ad}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Soyadı</div>
                        <div className="text-base font-medium">{userInfo.soyad}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Unvanı</div>
                        <div className="text-base font-medium">{userInfo.unvan}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Yöneticisi</div>
                        <div className="text-base font-medium">{userInfo.yonetici}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Departman</div>
                        <div className="text-base font-medium">{userInfo.departman}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Kurum Sicil Numarası</div>
                        <div className="text-base font-medium">{userInfo.kurumSicilNo}</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">İş E-posta Adresi</div>
                        <div className="text-base font-medium">{userInfo.isEposta}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">İş Telefonu</div>
                        <div className="text-base font-medium">{userInfo.isTelefon}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Dahili</div>
                        <div className="text-base font-medium">{userInfo.dahili}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Şirkete Giriş Tarihi</div>
                        <div className="text-base font-medium">{userInfo.sirketGirisTarihi}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Çalışma Süresi</div>
                        <div className="text-base font-medium">{userInfo.calismaSuresi}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Durum</div>
                        <div className="text-base">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {userInfo.durum}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>



                {/* Zimmetler */}
                <TabsContent value="zimmetler" className="mt-0">
                  {loading ? (
                    <div className="text-center py-12 text-gray-500">Yükleniyor...</div>
                  ) : zimmetler.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Package size={48} className="mx-auto mb-4 text-gray-300" />
                      <p>Zimmet ataması beklenmektedir.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Envanter Tipi</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Marka</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Model</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Seri No</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Zimmet Tarihi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {zimmetler.map((zimmet) => (
                            <tr key={zimmet.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 text-sm">{zimmet.envanterBilgisi?.tip || '-'}</td>
                              <td className="py-3 px-4 text-sm">{zimmet.envanterBilgisi?.marka || '-'}</td>
                              <td className="py-3 px-4 text-sm">{zimmet.envanterBilgisi?.model || '-'}</td>
                              <td className="py-3 px-4 text-sm font-mono">{zimmet.envanterBilgisi?.seriNumarasi || '-'}</td>
                              <td className="py-3 px-4 text-sm">
                                {zimmet.zimmetTarihi ? new Date(zimmet.zimmetTarihi).toLocaleDateString('tr-TR') : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>



                {/* Atamalar */}
                <TabsContent value="atamalar" className="mt-0">
                  <div className="text-center py-12 text-gray-500">
                    <Briefcase size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>Atama bilgileri bölümü</p>
                  </div>
                </TabsContent>

                {/* İletişim */}
                <TabsContent value="iletisim" className="mt-0">
                  <div className="text-center py-12 text-gray-500">
                    <Phone size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>İletişim bilgileri bölümü</p>
                  </div>
                </TabsContent>

                {/* Özel Alanlar */}
                <TabsContent value="ozel-alanlar" className="mt-0">
                  <div className="text-center py-12 text-gray-500">
                    <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>Özel alanlar bölümü</p>
                  </div>
                </TabsContent>

                {/* Sözleşmelerim */}
                <TabsContent value="sozlesmelerim" className="mt-0">
                  <div className="text-center py-12 text-gray-500">
                    <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>Sözleşmeler bölümü</p>
                  </div>
                </TabsContent>

                {/* Evraklarım */}
                <TabsContent value="evraklarim" className="mt-0">
                  {loading ? (
                    <div className="text-center py-12 text-gray-500">Yükleniyor...</div>
                  ) : evraklar.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <File size={48} className="mx-auto mb-4 text-gray-300" />
                      <p>Henüz evrak eklenmemiştir.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {evraklar.map((evrak) => (
                        <div key={evrak.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <File size={24} className="text-teal-600" />
                            <div>
                              <div className="font-medium text-sm">{evrak.dosyaAdi}</div>
                              <div className="text-xs text-gray-500">
                                {new Date(evrak.createdAt).toLocaleDateString('tr-TR')}
                              </div>
                            </div>
                          </div>
                          <a
                            href={evrak.dosyaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-teal-600 hover:text-teal-700"
                          >
                            <Download size={16} className="mr-1" />
                            <span className="text-sm">İndir</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default BeninSayfam
