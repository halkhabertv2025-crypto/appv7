import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'

// MongoDB connection
let client
let db

async function connectToMongo() {
  if (!db) {
    if (!client) {
      client = new MongoClient(process.env.MONGO_URL)
      await client.connect()
    }
    db = client.db(process.env.DB_NAME)
  }
  return db
}

// Helper function to handle CORS
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// Route handler function
async function handleRoute(request, { params }) {
  const { path = [] } = params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()

    // Root endpoint
    if (route === '/' && method === 'GET') {
      return handleCORS(NextResponse.json({ message: "HRplan API v1.0" }))
    }

    // ============= DASHBOARD =============
    if (route === '/dashboard' && method === 'GET') {
      const envanterler = await db.collection('envanterler')
        .find({ deletedAt: null })
        .toArray()
      
      const zimmetler = await db.collection('zimmetler')
        .find({ deletedAt: null, durum: 'Aktif' })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray()

      // Zimmetler için çalışan ve envanter bilgilerini ekle
      const enrichedZimmetler = await Promise.all(
        zimmetler.map(async (zimmet) => {
          const envanter = await db.collection('envanterler').findOne({ id: zimmet.envanterId })
          const calisan = await db.collection('calisanlar').findOne({ id: zimmet.calisanId })
          const departman = calisan ? await db.collection('departmanlar').findOne({ id: calisan.departmanId }) : null
          const envanterTip = envanter ? await db.collection('envanter_tipleri').findOne({ id: envanter.envanterTipiId }) : null

          return {
            id: zimmet.id,
            envanterAd: envanter ? `${envanterTip?.ad || ''} ${envanter.marka} ${envanter.model}` : 'Bilinmiyor',
            calisanAd: calisan?.adSoyad || 'Bilinmiyor',
            departmanAd: departman?.ad || 'Bilinmiyor',
            zimmetTarihi: zimmet.zimmetTarihi,
            durum: zimmet.durum
          }
        })
      )

      const stats = {
        total: envanterler.length,
        zimmetli: envanterler.filter(e => e.durum === 'Zimmetli').length,
        depoda: envanterler.filter(e => e.durum === 'Depoda').length,
        arizali: envanterler.filter(e => e.durum === 'Arızalı' || e.durum === 'Kayıp').length
      }

      return handleCORS(NextResponse.json({ 
        stats, 
        recentZimmetler: enrichedZimmetler 
      }))
    }

    // ============= DEPARTMANLAR =============
    if (route === '/departmanlar' && method === 'GET') {
      const departmanlar = await db.collection('departmanlar')
        .find({ deletedAt: null })
        .sort({ createdAt: -1 })
        .toArray()
      
      return handleCORS(NextResponse.json(departmanlar.map(({ _id, ...rest }) => rest)))
    }

    if (route === '/departmanlar' && method === 'POST') {
      const body = await request.json()
      
      if (!body.ad) {
        return handleCORS(NextResponse.json(
          { error: "Departman adı zorunludur" },
          { status: 400 }
        ))
      }

      // Check if departman already exists
      const existing = await db.collection('departmanlar').findOne({ ad: body.ad, deletedAt: null })
      if (existing) {
        return handleCORS(NextResponse.json(
          { error: "Bu isimde bir departman zaten mevcut" },
          { status: 400 }
        ))
      }

      const departman = {
        id: uuidv4(),
        ad: body.ad,
        aciklama: body.aciklama || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      }

      await db.collection('departmanlar').insertOne(departman)
      const { _id, ...result } = departman
      return handleCORS(NextResponse.json(result))
    }

    if (route.startsWith('/departmanlar/') && method === 'PUT') {
      const id = route.split('/')[2]
      const body = await request.json()

      const updateData = {
        ...body,
        updatedAt: new Date()
      }

      const result = await db.collection('departmanlar').updateOne(
        { id, deletedAt: null },
        { $set: updateData }
      )

      if (result.matchedCount === 0) {
        return handleCORS(NextResponse.json(
          { error: "Departman bulunamadı" },
          { status: 404 }
        ))
      }

      return handleCORS(NextResponse.json({ success: true }))
    }

    if (route.startsWith('/departmanlar/') && method === 'DELETE') {
      const id = route.split('/')[2]

      const result = await db.collection('departmanlar').updateOne(
        { id, deletedAt: null },
        { $set: { deletedAt: new Date() } }
      )

      if (result.matchedCount === 0) {
        return handleCORS(NextResponse.json(
          { error: "Departman bulunamadı" },
          { status: 404 }
        ))
      }

      return handleCORS(NextResponse.json({ success: true }))
    }

    // ============= ÇALIŞANLAR =============
    if (route === '/calisanlar' && method === 'GET') {
      const calisanlar = await db.collection('calisanlar')
        .find({ deletedAt: null })
        .sort({ createdAt: -1 })
        .toArray()
      
      // Add department names
      const enrichedCalisanlar = await Promise.all(
        calisanlar.map(async (calisan) => {
          const departman = await db.collection('departmanlar').findOne({ id: calisan.departmanId })
          return {
            ...calisan,
            departmanAd: departman?.ad || 'Bilinmiyor'
          }
        })
      )

      return handleCORS(NextResponse.json(enrichedCalisanlar.map(({ _id, ...rest }) => rest)))
    }

    if (route === '/calisanlar' && method === 'POST') {
      const body = await request.json()
      
      if (!body.adSoyad || !body.departmanId) {
        return handleCORS(NextResponse.json(
          { error: "Ad Soyad ve Departman zorunludur" },
          { status: 400 }
        ))
      }

      // Check email uniqueness if provided
      if (body.email) {
        const existing = await db.collection('calisanlar').findOne({ email: body.email, deletedAt: null })
        if (existing) {
          return handleCORS(NextResponse.json(
            { error: "Bu email adresi zaten kayıtlı" },
            { status: 400 }
          ))
        }
      }

      const calisan = {
        id: uuidv4(),
        adSoyad: body.adSoyad,
        email: body.email || '',
        telefon: body.telefon || '',
        departmanId: body.departmanId,
        durum: body.durum || 'Aktif',
        yoneticiYetkisi: body.yoneticiYetkisi || false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      }

      await db.collection('calisanlar').insertOne(calisan)
      const { _id, ...result } = calisan
      return handleCORS(NextResponse.json(result))
    }

    if (route.startsWith('/calisanlar/') && method === 'PUT') {
      const id = route.split('/')[2]
      const body = await request.json()

      const updateData = {
        ...body,
        updatedAt: new Date()
      }

      const result = await db.collection('calisanlar').updateOne(
        { id, deletedAt: null },
        { $set: updateData }
      )

      if (result.matchedCount === 0) {
        return handleCORS(NextResponse.json(
          { error: "Çalışan bulunamadı" },
          { status: 404 }
        ))
      }

      return handleCORS(NextResponse.json({ success: true }))
    }

    if (route.startsWith('/calisanlar/') && method === 'DELETE') {
      const id = route.split('/')[2]

      const result = await db.collection('calisanlar').updateOne(
        { id, deletedAt: null },
        { $set: { deletedAt: new Date() } }
      )

      if (result.matchedCount === 0) {
        return handleCORS(NextResponse.json(
          { error: "Çalışan bulunamadı" },
          { status: 404 }
        ))
      }

      return handleCORS(NextResponse.json({ success: true }))
    }

    // ============= ENVANTER TİPLERİ =============
    if (route === '/envanter-tipleri' && method === 'GET') {
      const tipler = await db.collection('envanter_tipleri')
        .find({ deletedAt: null })
        .sort({ createdAt: -1 })
        .toArray()
      
      // Add counts for each type
      const enrichedTipler = await Promise.all(
        tipler.map(async (tip) => {
          const envanterler = await db.collection('envanterler')
            .find({ envanterTipiId: tip.id, deletedAt: null })
            .toArray()
          
          return {
            ...tip,
            toplamSayisi: envanterler.length,
            zimmetliSayisi: envanterler.filter(e => e.durum === 'Zimmetli').length,
            depodaSayisi: envanterler.filter(e => e.durum === 'Depoda').length,
            arizaliSayisi: envanterler.filter(e => e.durum === 'Arızalı' || e.durum === 'Kayıp').length
          }
        })
      )

      return handleCORS(NextResponse.json(enrichedTipler.map(({ _id, ...rest }) => rest)))
    }

    if (route === '/envanter-tipleri' && method === 'POST') {
      const body = await request.json()
      
      if (!body.ad) {
        return handleCORS(NextResponse.json(
          { error: "Envanter tipi adı zorunludur" },
          { status: 400 }
        ))
      }

      const existing = await db.collection('envanter_tipleri').findOne({ ad: body.ad, deletedAt: null })
      if (existing) {
        return handleCORS(NextResponse.json(
          { error: "Bu isimde bir envanter tipi zaten mevcut" },
          { status: 400 }
        ))
      }

      const tip = {
        id: uuidv4(),
        ad: body.ad,
        aciklama: body.aciklama || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      }

      await db.collection('envanter_tipleri').insertOne(tip)
      const { _id, ...result } = tip
      return handleCORS(NextResponse.json(result))
    }

    if (route.startsWith('/envanter-tipleri/') && method === 'PUT') {
      const id = route.split('/')[2]
      const body = await request.json()

      const updateData = {
        ...body,
        updatedAt: new Date()
      }

      const result = await db.collection('envanter_tipleri').updateOne(
        { id, deletedAt: null },
        { $set: updateData }
      )

      if (result.matchedCount === 0) {
        return handleCORS(NextResponse.json(
          { error: "Envanter tipi bulunamadı" },
          { status: 404 }
        ))
      }

      return handleCORS(NextResponse.json({ success: true }))
    }

    if (route.startsWith('/envanter-tipleri/') && method === 'DELETE') {
      const id = route.split('/')[2]

      const result = await db.collection('envanter_tipleri').updateOne(
        { id, deletedAt: null },
        { $set: { deletedAt: new Date() } }
      )

      if (result.matchedCount === 0) {
        return handleCORS(NextResponse.json(
          { error: "Envanter tipi bulunamadı" },
          { status: 404 }
        ))
      }

      return handleCORS(NextResponse.json({ success: true }))
    }

    // ============= ENVANTERLER =============
    if (route === '/envanterler' && method === 'GET') {
      const envanterler = await db.collection('envanterler')
        .find({ deletedAt: null })
        .sort({ createdAt: -1 })
        .toArray()
      
      const enrichedEnvanterler = await Promise.all(
        envanterler.map(async (envanter) => {
          const tip = await db.collection('envanter_tipleri').findOne({ id: envanter.envanterTipiId })
          
          // Find active zimmet if any
          const activeZimmet = await db.collection('zimmetler').findOne({ 
            envanterId: envanter.id, 
            durum: 'Aktif',
            deletedAt: null 
          })
          
          let zimmetBilgisi = null
          if (activeZimmet) {
            const calisan = await db.collection('calisanlar').findOne({ id: activeZimmet.calisanId })
            zimmetBilgisi = {
              calisanAd: calisan?.adSoyad || 'Bilinmiyor',
              zimmetTarihi: activeZimmet.zimmetTarihi
            }
          }

          return {
            ...envanter,
            envanterTipiAd: tip?.ad || 'Bilinmiyor',
            zimmetBilgisi
          }
        })
      )

      return handleCORS(NextResponse.json(enrichedEnvanterler.map(({ _id, ...rest }) => rest)))
    }

    if (route === '/envanterler' && method === 'POST') {
      const body = await request.json()
      
      if (!body.envanterTipiId || !body.marka || !body.model || !body.seriNumarasi) {
        return handleCORS(NextResponse.json(
          { error: "Envanter tipi, marka, model ve seri numarası zorunludur" },
          { status: 400 }
        ))
      }

      // Check serial number uniqueness
      const existing = await db.collection('envanterler').findOne({ 
        seriNumarasi: body.seriNumarasi, 
        deletedAt: null 
      })
      if (existing) {
        return handleCORS(NextResponse.json(
          { error: "Bu seri numarası zaten kayıtlı" },
          { status: 400 }
        ))
      }

      const envanter = {
        id: uuidv4(),
        envanterTipiId: body.envanterTipiId,
        marka: body.marka,
        model: body.model,
        seriNumarasi: body.seriNumarasi,
        durum: body.durum || 'Depoda',
        notlar: body.notlar || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      }

      await db.collection('envanterler').insertOne(envanter)
      const { _id, ...result } = envanter
      return handleCORS(NextResponse.json(result))
    }

    if (route.startsWith('/envanterler/') && method === 'PUT') {
      const id = route.split('/')[2]
      const body = await request.json()

      const updateData = {
        ...body,
        updatedAt: new Date()
      }

      const result = await db.collection('envanterler').updateOne(
        { id, deletedAt: null },
        { $set: updateData }
      )

      if (result.matchedCount === 0) {
        return handleCORS(NextResponse.json(
          { error: "Envanter bulunamadı" },
          { status: 404 }
        ))
      }

      return handleCORS(NextResponse.json({ success: true }))
    }

    if (route.startsWith('/envanterler/') && method === 'DELETE') {
      const id = route.split('/')[2]

      const result = await db.collection('envanterler').updateOne(
        { id, deletedAt: null },
        { $set: { deletedAt: new Date() } }
      )

      if (result.matchedCount === 0) {
        return handleCORS(NextResponse.json(
          { error: "Envanter bulunamadı" },
          { status: 404 }
        ))
      }

      return handleCORS(NextResponse.json({ success: true }))
    }

    // ============= ZİMMETLER =============
    if (route === '/zimmetler' && method === 'GET') {
      const zimmetler = await db.collection('zimmetler')
        .find({ deletedAt: null })
        .sort({ createdAt: -1 })
        .toArray()
      
      const enrichedZimmetler = await Promise.all(
        zimmetler.map(async (zimmet) => {
          const envanter = await db.collection('envanterler').findOne({ id: zimmet.envanterId })
          const calisan = await db.collection('calisanlar').findOne({ id: zimmet.calisanId })
          const departman = calisan ? await db.collection('departmanlar').findOne({ id: calisan.departmanId }) : null
          const tip = envanter ? await db.collection('envanter_tipleri').findOne({ id: envanter.envanterTipiId }) : null

          return {
            ...zimmet,
            envanterBilgisi: envanter ? {
              tip: tip?.ad || '',
              marka: envanter.marka,
              model: envanter.model,
              seriNumarasi: envanter.seriNumarasi
            } : null,
            calisanAd: calisan?.adSoyad || 'Bilinmiyor',
            departmanAd: departman?.ad || 'Bilinmiyor'
          }
        })
      )

      return handleCORS(NextResponse.json(enrichedZimmetler.map(({ _id, ...rest }) => rest)))
    }

    if (route === '/zimmetler' && method === 'POST') {
      const body = await request.json()
      
      if (!body.envanterId || !body.calisanId || !body.zimmetTarihi) {
        return handleCORS(NextResponse.json(
          { error: "Envanter, çalışan ve zimmet tarihi zorunludur" },
          { status: 400 }
        ))
      }

      // Check if envanter is already assigned
      const activeZimmet = await db.collection('zimmetler').findOne({
        envanterId: body.envanterId,
        durum: 'Aktif',
        deletedAt: null
      })

      if (activeZimmet) {
        return handleCORS(NextResponse.json(
          { error: "Bu envanter zaten zimmetli durumda" },
          { status: 400 }
        ))
      }

      const zimmet = {
        id: uuidv4(),
        envanterId: body.envanterId,
        calisanId: body.calisanId,
        zimmetTarihi: new Date(body.zimmetTarihi),
        iadeTarihi: null,
        durum: 'Aktif',
        aciklama: body.aciklama || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      }

      await db.collection('zimmetler').insertOne(zimmet)

      // Update envanter status to Zimmetli
      await db.collection('envanterler').updateOne(
        { id: body.envanterId },
        { $set: { durum: 'Zimmetli', updatedAt: new Date() } }
      )

      const { _id, ...result } = zimmet
      return handleCORS(NextResponse.json(result))
    }

    // İade endpoint
    if (route === '/zimmetler/iade' && method === 'POST') {
      const body = await request.json()
      
      if (!body.zimmetId || !body.iadeTarihi || !body.envanterDurumu || !body.iadeAlanYetkiliId) {
        return handleCORS(NextResponse.json(
          { error: "Zimmet ID, iade tarihi, envanter durumu ve iade alan yetkili zorunludur" },
          { status: 400 }
        ))
      }

      // Check if yetkili has manager permission
      const yetkili = await db.collection('calisanlar').findOne({ 
        id: body.iadeAlanYetkiliId, 
        deletedAt: null 
      })

      if (!yetkili) {
        return handleCORS(NextResponse.json(
          { error: "Yetkili bulunamadı" },
          { status: 404 }
        ))
      }

      if (!yetkili.yoneticiYetkisi) {
        return handleCORS(NextResponse.json(
          { error: "Bu işlem için yönetici yetkisi gereklidir" },
          { status: 403 }
        ))
      }

      const zimmet = await db.collection('zimmetler').findOne({ 
        id: body.zimmetId, 
        deletedAt: null 
      })

      if (!zimmet) {
        return handleCORS(NextResponse.json(
          { error: "Zimmet bulunamadı" },
          { status: 404 }
        ))
      }

      // Update zimmet
      await db.collection('zimmetler').updateOne(
        { id: body.zimmetId },
        { 
          $set: { 
            iadeTarihi: new Date(body.iadeTarihi),
            iadeAlanYetkiliId: body.iadeAlanYetkiliId,
            durum: 'İade Edildi',
            updatedAt: new Date()
          } 
        }
      )

      // Update envanter status
      await db.collection('envanterler').updateOne(
        { id: zimmet.envanterId },
        { $set: { durum: body.envanterDurumu, updatedAt: new Date() } }
      )

      return handleCORS(NextResponse.json({ success: true }))
    }

    if (route.startsWith('/zimmetler/') && method === 'DELETE') {
      const id = route.split('/')[2]

      const result = await db.collection('zimmetler').updateOne(
        { id, deletedAt: null },
        { $set: { deletedAt: new Date() } }
      )

      if (result.matchedCount === 0) {
        return handleCORS(NextResponse.json(
          { error: "Zimmet bulunamadı" },
          { status: 404 }
        ))
      }

      return handleCORS(NextResponse.json({ success: true }))
    }

    // ============= SEED DATA =============
    if (route === '/seed' && method === 'POST') {
      // Clear existing data
      await db.collection('departmanlar').deleteMany({})
      await db.collection('calisanlar').deleteMany({})
      await db.collection('envanter_tipleri').deleteMany({})
      await db.collection('envanterler').deleteMany({})
      await db.collection('zimmetler').deleteMany({})

      // Seed Departmanlar
      const departmanlar = [
        { id: uuidv4(), ad: 'IT', aciklama: 'Bilgi Teknolojileri', createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        { id: uuidv4(), ad: 'İnsan Kaynakları', aciklama: 'İK Departmanı', createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        { id: uuidv4(), ad: 'Muhasebe', aciklama: 'Muhasebe ve Finans', createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        { id: uuidv4(), ad: 'Pazarlama', aciklama: 'Pazarlama ve Satış', createdAt: new Date(), updatedAt: new Date(), deletedAt: null }
      ]
      await db.collection('departmanlar').insertMany(departmanlar)

      // Seed Çalışanlar
      const calisanlar = [
        { id: uuidv4(), adSoyad: 'Ahmet Yılmaz', email: 'ahmet@example.com', telefon: '555-0001', departmanId: departmanlar[0].id, durum: 'Aktif', createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        { id: uuidv4(), adSoyad: 'Ayşe Kaya', email: 'ayse@example.com', telefon: '555-0002', departmanId: departmanlar[1].id, durum: 'Aktif', createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        { id: uuidv4(), adSoyad: 'Mehmet Demir', email: 'mehmet@example.com', telefon: '555-0003', departmanId: departmanlar[0].id, durum: 'Aktif', createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        { id: uuidv4(), adSoyad: 'Fatma Şahin', email: 'fatma@example.com', telefon: '555-0004', departmanId: departmanlar[2].id, durum: 'Aktif', createdAt: new Date(), updatedAt: new Date(), deletedAt: null }
      ]
      await db.collection('calisanlar').insertMany(calisanlar)

      // Seed Envanter Tipleri
      const tipler = [
        { id: uuidv4(), ad: 'Laptop', aciklama: 'Dizüstü Bilgisayarlar', createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        { id: uuidv4(), ad: 'Telefon', aciklama: 'Akıllı Telefonlar', createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        { id: uuidv4(), ad: 'Monitör', aciklama: 'Bilgisayar Monitörleri', createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        { id: uuidv4(), ad: 'Klavye', aciklama: 'Klavyeler', createdAt: new Date(), updatedAt: new Date(), deletedAt: null }
      ]
      await db.collection('envanter_tipleri').insertMany(tipler)

      // Seed Envanterler
      const envanterler = [
        { id: uuidv4(), envanterTipiId: tipler[0].id, marka: 'Apple', model: 'MacBook Pro 16"', seriNumarasi: 'MBA123456', durum: 'Zimmetli', notlar: '', createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        { id: uuidv4(), envanterTipiId: tipler[0].id, marka: 'Dell', model: 'XPS 15', seriNumarasi: 'DXP789012', durum: 'Depoda', notlar: '', createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        { id: uuidv4(), envanterTipiId: tipler[1].id, marka: 'Apple', model: 'iPhone 14 Pro', seriNumarasi: 'IPH345678', durum: 'Zimmetli', notlar: '', createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        { id: uuidv4(), envanterTipiId: tipler[2].id, marka: 'LG', model: '27" UltraWide', seriNumarasi: 'LGM901234', durum: 'Depoda', notlar: '', createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        { id: uuidv4(), envanterTipiId: tipler[0].id, marka: 'Lenovo', model: 'ThinkPad X1', seriNumarasi: 'LTP567890', durum: 'Arızalı', notlar: 'Ekran kırık', createdAt: new Date(), updatedAt: new Date(), deletedAt: null }
      ]
      await db.collection('envanterler').insertMany(envanterler)

      // Seed Zimmetler
      const zimmetler = [
        { 
          id: uuidv4(), 
          envanterId: envanterler[0].id, 
          calisanId: calisanlar[0].id, 
          zimmetTarihi: new Date('2024-01-15'), 
          iadeTarihi: null, 
          durum: 'Aktif', 
          aciklama: '', 
          createdAt: new Date(), 
          updatedAt: new Date(), 
          deletedAt: null 
        },
        { 
          id: uuidv4(), 
          envanterId: envanterler[2].id, 
          calisanId: calisanlar[1].id, 
          zimmetTarihi: new Date('2024-02-10'), 
          iadeTarihi: null, 
          durum: 'Aktif', 
          aciklama: '', 
          createdAt: new Date(), 
          updatedAt: new Date(), 
          deletedAt: null 
        }
      ]
      await db.collection('zimmetler').insertMany(zimmetler)

      return handleCORS(NextResponse.json({ 
        message: "Örnek veriler başarıyla oluşturuldu",
        counts: {
          departmanlar: departmanlar.length,
          calisanlar: calisanlar.length,
          envanterTipleri: tipler.length,
          envanterler: envanterler.length,
          zimmetler: zimmetler.length
        }
      }))
    }

    // Route not found
    return handleCORS(NextResponse.json(
      { error: `Route ${route} not found` }, 
      { status: 404 }
    ))

  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json(
      { error: "Internal server error", details: error.message }, 
      { status: 500 }
    ))
  }
}

// Export all HTTP methods
export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
