'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Phone, Printer, Package, User } from 'lucide-react'

export default function CalisanDogrula({ params }) {
    const [calisan, setCalisan] = useState(null)
    const [zimmetler, setZimmetler] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const [calisanRes, zimmetRes] = await Promise.all([
                fetch(`/api/calisanlar/${params.id}`),
                fetch(`/api/calisanlar/${params.id}/zimmetler`)
            ])

            if (!calisanRes.ok) {
                throw new Error('Çalışan bulunamadı')
            }

            const calisanData = await calisanRes.json()
            const zimmetData = await zimmetRes.json()

            setCalisan(calisanData)
            setZimmetler(zimmetData.filter(z => z.durum === 'Aktif')) // Only show active assignments
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
            </div>
        )
    }

    if (error || !calisan) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <Card className="w-full max-w-md mx-4">
                    <CardContent className="p-6 text-center text-red-600">
                        {error || 'Çalışan bulunamadı'}
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center">
            <Card className="w-full max-w-2xl shadow-lg mt-8">
                <CardContent className="p-8 space-y-8">
                    {/* Header */}
                    <div className="text-center border-b border-gray-200 pb-6">
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Halk TV</h1>
                        <p className="text-sm text-gray-500 mt-2">Personel Zimmet Doğrulama</p>
                    </div>

                    {/* Employee Info */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 flex items-start gap-4">
                        <div className="bg-white p-3 rounded-full shadow-sm">
                            <User className="text-teal-600" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">{calisan.adSoyad}</h2>
                            <div className="text-gray-500 text-sm mt-1">{calisan.departmanAd}</div>
                            <div className="text-teal-600 font-medium text-sm mt-2">
                                {zimmetler.length > 0 ? `${zimmetler.length} Adet Zimmetli Cihaz` : 'Zimmetli Cihaz Bulunmamaktadır'}
                            </div>
                        </div>
                    </div>

                    {/* Zimmet List */}
                    {zimmetler.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <Package size={20} className="text-gray-500" />
                                Zimmetli Cihazlar
                            </h3>
                            <div className="space-y-3">
                                {zimmetler.map((zimmet) => (
                                    <div key={zimmet.id} className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    {zimmet.envanterBilgisi?.tip || 'Bilinmiyor'}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {zimmet.envanterBilgisi?.marka} {zimmet.envanterBilgisi?.model}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-gray-400 font-mono">
                                                    S/N: {zimmet.envanterBilgisi?.seriNumarasi}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    {new Date(zimmet.zimmetTarihi).toLocaleDateString('tr-TR')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Footer - Contact Info */}
                    <div className="border-t border-gray-200 pt-6 text-center space-y-4">
                        <h3 className="font-semibold text-gray-900">İletişim Adresimiz</h3>

                        <div className="text-sm text-gray-600 space-y-2">
                            <p className="font-medium text-gray-800">Halk TV</p>
                            <p className="flex items-center justify-center gap-2">
                                <MapPin size={16} className="text-teal-600" />
                                Maltepe Mahallesi, Litros Yolu Sk. No:22, Zeytinburnu/İstanbul
                            </p>
                            <div className="flex items-center justify-center gap-4 mt-2">
                                <p className="flex items-center gap-2">
                                    <Phone size={16} className="text-teal-600" />
                                    +90 212 543 37 75
                                </p>
                                <p>
                                    <span className="font-medium">Faks:</span> 0312 236 64 30
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="mt-8 text-center text-xs text-gray-400">
                &copy; {new Date().getFullYear()} Halk TV Envanter Yönetim Sistemi
            </div>
        </div>
    )
}
