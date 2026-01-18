'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Phone, Printer } from 'lucide-react'

export default function ZimmetDogrula({ params }) {
    const [envanter, setEnvanter] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchEnvanterDetay()
    }, [])

    const fetchEnvanterDetay = async () => {
        try {
            const response = await fetch(`/api/envanterler/${params.id}`)
            if (!response.ok) {
                throw new Error('Envanter bulunamadı')
            }
            const data = await response.json()
            setEnvanter(data)
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

    if (error || !envanter) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <Card className="w-full max-w-md mx-4">
                    <CardContent className="p-6 text-center text-red-600">
                        {error || 'Envanter bulunamadı'}
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center justify-center">
            <Card className="w-full max-w-lg shadow-lg">
                <CardContent className="p-8 space-y-8">
                    {/* Header */}
                    <div className="text-center border-b border-gray-200 pb-6">
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Halk TV</h1>
                        <p className="text-sm text-gray-500 mt-2">Envanter Doğrulama Sistemi</p>
                    </div>

                    {/* Main Content */}
                    <div className="text-center space-y-6">
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-700 mb-2">Cihaz Bilgileri</h2>
                            <div className="text-gray-600">
                                {envanter.envanterTipiAd} {envanter.marka} {envanter.model}
                            </div>
                            <div className="text-sm text-gray-500 mt-1 font-mono">
                                S/N: {envanter.seriNumarasi}
                            </div>
                        </div>

                        <div className="py-2">
                            <div className="text-xl">
                                Bu cihaz:
                            </div>
                            <div className="text-2xl font-bold text-teal-600 mt-2">
                                {envanter.zimmetBilgisi?.calisanAd
                                    ? `${envanter.zimmetBilgisi.calisanAd} Kişisine ait zimmetli cihazlar`
                                    : 'Şu an kimseye zimmetli değildir (Depoda)'
                                }
                            </div>
                            {envanter.zimmetBilgisi?.zimmetTarihi && (
                                <div className="text-sm text-gray-500 mt-2">
                                    Zimmet Tarihi: {new Date(envanter.zimmetBilgisi.zimmetTarihi).toLocaleDateString('tr-TR')}
                                </div>
                            )}
                        </div>
                    </div>

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
