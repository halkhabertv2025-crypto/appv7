'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, Briefcase, Package, DollarSign, MapPin, Phone, FileText, File } from 'lucide-react'

const BeninSayfam = () => {
  const [activeTab, setActiveTab] = useState('temel-bilgiler')

  // Kullanıcı bilgileri (örnek veri)
  const userInfo = {
    ad: 'Adem',
    soyad: 'Elma',
    unvan: '-',
    yonetici: '-',
    departman: 'Management',
    kurumSicilNo: '-',
    isEposta: 'lalumyzi@forexnews.bg',
    isTelefon: '-',
    dahili: '-',
    sirketGirisTarihi: '21 Kasım 2025',
    calismaSuresi: '1 Ay 9 Gün',
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
            <div className="mb-4">
              <div className="w-40 h-40 mx-auto bg-gray-200 rounded-full flex items-center justify-center">
                <User size={80} className="text-gray-400" />
              </div>
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
                  <div className="text-center py-12 text-gray-500">
                    <Package size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>Zimmetlenmiş cihazlar burada görüntülenecek</p>
                  </div>
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
                  <div className="text-center py-12 text-gray-500">
                    <File size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>Evraklar bölümü</p>
                  </div>
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
