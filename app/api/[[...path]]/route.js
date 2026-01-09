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

// Audit Log Helper
async function createAuditLog(actorUserId, actorUserName, actionType, entityType, entityId, details = {}) {
  try {
    const db = await connectToMongo()
    const auditLog = {
      id: uuidv4(),
      actorUserId,
      actorUserName,
      actionType,
      entityType,
      entityId,
      details,
      createdAt: new Date()
    }
    await db.collection('audit_logs').insertOne(auditLog)
  } catch (error) {
    console.error('Audit log error:', error)
    // Don't throw - audit should not break main flow
  }
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
      return handleCORS(NextResponse.json({ message: "Halk API v1.0" }))
    }

    // ============= AUTHENTICATION =============
    if (route === '/auth/login' && method === 'POST') {
      const body = await request.json()
      
      if (!body.email || !body.sifre) {
        return handleCORS(NextResponse.json(
          { error: "Email ve şifre zorunludur" },
          { status: 400 }
        ))
      }

      const calisan = await db.collection('calisanlar').findOne({ 
        email: body.email, 
        deletedAt: null 
      })

      if (!calisan) {
        return handleCORS(NextResponse.json(
          { error: "Email veya şifre hatalı" },
          { status: 401 }
        ))
      }

      if (calisan.sifre !== body.sifre) {
        return handleCORS(NextResponse.json(
          { error: "Email veya şifre hatalı" },
          { status: 401 }
        ))
      }

      if (calisan.durum !== 'Aktif') {
        return handleCORS(NextResponse.json(
          { error: "Hesabınız aktif değil" },
          { status: 403 }
        ))
      }

      // Check if user has manager or admin permission
      if (!calisan.yoneticiYetkisi && !calisan.adminYetkisi) {
        return handleCORS(NextResponse.json(
          { error: "Bu sisteme giriş yapmak için yönetici veya admin yetkisi gereklidir" },
          { status: 403 }
        ))
      }

      // Get department name
      const departman = await db.collection('departmanlar').findOne({ id: calisan.departmanId })

      const userData = {
        id: calisan.id,
        adSoyad: calisan.adSoyad,
        email: calisan.email,
        departmanId: calisan.departmanId,
        departmanAd: departman?.ad || 'Bilinmiyor',
        yoneticiYetkisi: calisan.yoneticiYetkisi,
        adminYetkisi: calisan.adminYetkisi,
        token: uuidv4() // Simple token for session
      }

      return handleCORS(NextResponse.json(userData))
    }

    if (route === '/auth/me' && method === 'GET') {
      const authHeader = request.headers.get('authorization')
      if (!authHeader) {
        return handleCORS(NextResponse.json(
          { error: "Yetkilendirme gerekli" },
          { status: 401 }
        ))
      }

      // For simplicity, we're using email as identifier
      // In production, use proper JWT tokens
      const email = authHeader.replace('Bearer ', '')
      const calisan = await db.collection('calisanlar').findOne({ 
        email, 
        deletedAt: null 
      })

      if (!calisan) {
        return handleCORS(NextResponse.json(
          { error: "Kullanıcı bulunamadı" },
          { status: 404 }
        ))
      }

      const departman = await db.collection('departmanlar').findOne({ id: calisan.departmanId })

      return handleCORS(NextResponse.json({
        id: calisan.id,
        adSoyad: calisan.adSoyad,
        email: calisan.email,
        departmanId: calisan.departmanId,
        departmanAd: departman?.ad || 'Bilinmiyor',
        yoneticiYetkisi: calisan.yoneticiYetkisi,
        adminYetkisi: calisan.adminYetkisi
      }))
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
      
      // Audit log
      await createAuditLog(
        body.userId || 'system',
        body.userName || 'System',
        'CREATE_DEPARTMENT',
        'Department',
        departman.id,
        { departmentName: departman.ad }
      )
      
      const { _id, ...result } = departman
      return handleCORS(NextResponse.json(result))
    }

    if (route.startsWith('/departmanlar/') && method === 'PUT') {
      const id = route.split('/')[2]
      const body = await request.json()

      const existingDept = await db.collection('departmanlar').findOne({ id, deletedAt: null })

      const { userId, userName, ...updateFields } = body
      const updateData = {
        ...updateFields,
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

      // Audit log
      await createAuditLog(
        userId || 'system',
        userName || 'System',
        'UPDATE_DEPARTMENT',
        'Department',
        id,
        { departmentName: updateFields.ad || existingDept?.ad }
      )

      return handleCORS(NextResponse.json({ success: true }))
    }

    if (route.startsWith('/departmanlar/') && method === 'DELETE') {
      const id = route.split('/')[2]
      const body = await request.json().catch(() => ({}))

      const existingDept = await db.collection('departmanlar').findOne({ id, deletedAt: null })

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

      // Audit log
      await createAuditLog(
        body.userId || 'system',
        body.userName || 'System',
        'DELETE_DEPARTMENT',
        'Department',
        id,
        { departmentName: existingDept?.ad }
      )

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

      // Check admin authorization for role assignment
      const authHeader = request.headers.get('x-user-id')
      if ((body.adminYetkisi || body.yoneticiYetkisi) && authHeader) {
        const requestingUser = await db.collection('calisanlar').findOne({ 
          id: authHeader, 
          deletedAt: null 
        })
        
        if (!requestingUser || !requestingUser.adminYetkisi) {
          return handleCORS(NextResponse.json(
            { error: "Sadece admin kullanıcılar yetki atayabilir" },
            { status: 403 }
          ))
        }
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
        adminYetkisi: body.adminYetkisi || false,
        sifre: body.sifre || '123456', // Default password
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      }

      await db.collection('calisanlar').insertOne(calisan)
      const { _id, ...result } = calisan

      // Audit log
      const requestingUserForLog = authHeader ? await db.collection('calisanlar').findOne({ id: authHeader }) : null
      await createAuditLog(
        authHeader || body.userId || 'system',
        requestingUserForLog?.adSoyad || body.userName || 'System',
        'CREATE_EMPLOYEE',
        'Employee',
        calisan.id,
        { employeeName: calisan.adSoyad, department: body.departmanId }
      )

      return handleCORS(NextResponse.json(result))
    }

    if (route.startsWith('/calisanlar/') && method === 'PUT') {
      const id = route.split('/')[2]
      const body = await request.json()

      // Check admin authorization for role changes
      const authHeader = request.headers.get('x-user-id')
      const existingCalisan = await db.collection('calisanlar').findOne({ id, deletedAt: null })
      
      if ((body.adminYetkisi !== undefined || body.yoneticiYetkisi !== undefined) && authHeader) {
        if (existingCalisan && 
            (body.adminYetkisi !== existingCalisan.adminYetkisi || 
             body.yoneticiYetkisi !== existingCalisan.yoneticiYetkisi)) {
          const requestingUser = await db.collection('calisanlar').findOne({ 
            id: authHeader, 
            deletedAt: null 
          })
          
          if (!requestingUser || !requestingUser.adminYetkisi) {
            return handleCORS(NextResponse.json(
              { error: "Sadece admin kullanıcılar yetki değiştirebilir" },
              { status: 403 }
            ))
          }
        }
      }

      const { userId, userName, ...updateFields } = body
      const updateData = {
        ...updateFields,
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

      // Audit log
      const requestingUserForLog = authHeader ? await db.collection('calisanlar').findOne({ id: authHeader }) : null
      await createAuditLog(
        authHeader || userId || 'system',
        requestingUserForLog?.adSoyad || userName || 'System',
        'UPDATE_EMPLOYEE',
        'Employee',
        id,
        { employeeName: existingCalisan?.adSoyad }
      )

      return handleCORS(NextResponse.json({ success: true }))
    }

    if (route.startsWith('/calisanlar/') && route.endsWith('/zimmetler') && method === 'GET') {
      const id = route.split('/')[2]
      
      const zimmetler = await db.collection('zimmetler')
        .find({ calisanId: id, deletedAt: null })
        .sort({ createdAt: -1 })
        .toArray()
      
      const enrichedZimmetler = await Promise.all(
        zimmetler.map(async (zimmet) => {
          const envanter = await db.collection('envanterler').findOne({ id: zimmet.envanterId })
          const tip = envanter ? await db.collection('envanter_tipleri').findOne({ id: envanter.envanterTipiId }) : null

          return {
            ...zimmet,
            envanterBilgisi: envanter ? {
              tip: tip?.ad || '',
              marka: envanter.marka,
              model: envanter.model,
              seriNumarasi: envanter.seriNumarasi
            } : null
          }
        })
      )

      return handleCORS(NextResponse.json(enrichedZimmetler.map(({ _id, ...rest }) => rest)))
    }

    if (route.startsWith('/calisanlar/') && route.endsWith('/reset-password') && method === 'POST') {
      const id = route.split('/')[2]
      const body = await request.json()

      if (!body.yeniSifre) {
        return handleCORS(NextResponse.json(
          { error: "Yeni şifre zorunludur" },
          { status: 400 }
        ))
      }

      const result = await db.collection('calisanlar').updateOne(
        { id, deletedAt: null },
        { $set: { sifre: body.yeniSifre, updatedAt: new Date() } }
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
      const body = await request.json().catch(() => ({}))

      // Get employee info before deletion
      const existingCalisan = await db.collection('calisanlar').findOne({ id, deletedAt: null })

      // Check if employee has active zimmet
      const activeZimmet = await db.collection('zimmetler').findOne({
        calisanId: id,
        durum: 'Aktif',
        deletedAt: null
      })

      if (activeZimmet) {
        return handleCORS(NextResponse.json(
          { error: "Bu çalışanın üzerinde aktif zimmet var, silinemez. Önce zimmetleri iade alın." },
          { status: 409 }
        ))
      }

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

      // Audit log
      await createAuditLog(
        body.userId || 'system',
        body.userName || 'System',
        'DELETE_EMPLOYEE',
        'Employee',
        id,
        { employeeName: existingCalisan?.adSoyad }
      )

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
      
      // Audit log
      await createAuditLog(
        body.userId || 'system',
        body.userName || 'System',
        'CREATE_INVENTORY',
        'Inventory',
        envanter.id,
        { 
          marka: envanter.marka, 
          model: envanter.model, 
          seriNumarasi: envanter.seriNumarasi 
        }
      )
      
      const { _id, ...result } = envanter
      return handleCORS(NextResponse.json(result))
    }

    if (route.startsWith('/envanterler/') && method === 'PUT') {
      const id = route.split('/')[2]
      const body = await request.json()

      // Get current envanter for comparison
      const currentEnvanter = await db.collection('envanterler').findOne({ id, deletedAt: null })
      if (!currentEnvanter) {
        return handleCORS(NextResponse.json(
          { error: "Envanter bulunamadı" },
          { status: 404 }
        ))
      }

      // Check if inventory has active zimmet before allowing status change
      if (body.durum && body.durum !== 'Zimmetli' && body.durum !== currentEnvanter.durum) {
        const activeZimmet = await db.collection('zimmetler').findOne({
          envanterId: id,
          durum: 'Aktif',
          deletedAt: null
        })

        if (activeZimmet) {
          return handleCORS(NextResponse.json(
            { error: "Cihaz zimmetliyken durum değiştirilemez. Önce iade alın." },
            { status: 409 }
          ))
        }
      }

      // Remove audit-related fields from update data
      const { userId, userName, oldDurum, logStatusChange, ...cleanBody } = body

      const updateData = {
        ...cleanBody,
        updatedAt: new Date()
      }

      const result = await db.collection('envanterler').updateOne(
        { id, deletedAt: null },
        { $set: updateData }
      )

      // Audit log for status change (Kayıp, Arızalı, Depoda)
      if (logStatusChange && body.durum && body.durum !== oldDurum && body.durum !== 'Zimmetli') {
        await createAuditLog(
          userId || 'system',
          userName || 'System',
          'UPDATE_INVENTORY_STATUS',
          'Inventory',
          id,
          {
            marka: currentEnvanter.marka,
            model: currentEnvanter.model,
            seriNumarasi: currentEnvanter.seriNumarasi,
            previousStatus: oldDurum,
            newStatus: body.durum
          }
        )
      }

      return handleCORS(NextResponse.json({ success: true }))
    }

    if (route.startsWith('/envanterler/') && method === 'DELETE') {
      const id = route.split('/')[2]
      const body = await request.json().catch(() => ({}))

      // Get envanter info before deletion
      const existingEnvanter = await db.collection('envanterler').findOne({ id, deletedAt: null })

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

      // Audit log
      await createAuditLog(
        body.userId || 'system',
        body.userName || 'System',
        'DELETE_INVENTORY',
        'Inventory',
        id,
        { 
          marka: existingEnvanter?.marka,
          model: existingEnvanter?.model,
          seriNumarasi: existingEnvanter?.seriNumarasi
        }
      )

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
          
          // Get iade alan yetkili if exists
          let iadeAlanYetkili = null
          if (zimmet.iadeAlanYetkiliId) {
            const yetkili = await db.collection('calisanlar').findOne({ id: zimmet.iadeAlanYetkiliId })
            if (yetkili) {
              iadeAlanYetkili = {
                id: yetkili.id,
                adSoyad: yetkili.adSoyad
              }
            }
          }

          return {
            ...zimmet,
            envanterBilgisi: envanter ? {
              tip: tip?.ad || '',
              marka: envanter.marka,
              model: envanter.model,
              seriNumarasi: envanter.seriNumarasi
            } : null,
            calisanAd: calisan?.adSoyad || 'Bilinmiyor',
            departmanAd: departman?.ad || 'Bilinmiyor',
            iadeAlanYetkili
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

      // Get envanter and calisan info for audit log
      const envanter = await db.collection('envanterler').findOne({ id: body.envanterId })
      const calisan = await db.collection('calisanlar').findOne({ id: body.calisanId })

      // Audit log
      await createAuditLog(
        body.userId || 'system',
        body.userName || 'System',
        'CREATE_ZIMMET',
        'Zimmet',
        zimmet.id,
        { 
          employee: calisan?.adSoyad,
          inventoryInfo: `${envanter?.marka} ${envanter?.model}`,
          seriNumarasi: envanter?.seriNumarasi
        }
      )

      const { _id, ...result } = zimmet
      return handleCORS(NextResponse.json(result))
    }

    // İade endpoint
    if (route === '/zimmetler/iade' && method === 'POST') {
      const body = await request.json()
      
      if (!body.zimmetId || !body.iadeTarihi || !body.envanterDurumu || !body.iadeAlanYetkiliId) {
        return handleCORS(NextResponse.json(
          { error: "Zimmet ID, iade tarihi, envanter durumu ve yetkili ID zorunludur" },
          { status: 400 }
        ))
      }

      // Yetkili kontrolü - must be manager or admin
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

      if (!yetkili.yoneticiYetkisi && !yetkili.adminYetkisi) {
        return handleCORS(NextResponse.json(
          { error: "Bu işlem için yönetici veya admin yetkisi gereklidir" },
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

      // Audit log - yetkili already fetched above
      const calisan = await db.collection('calisanlar').findOne({ id: zimmet.calisanId })
      await createAuditLog(
        body.iadeAlanYetkiliId,
        yetkili?.adSoyad || 'Unknown',
        'RETURN_ZIMMET',
        'Zimmet',
        body.zimmetId,
        { 
          employee: calisan?.adSoyad,
          inventoryId: zimmet.envanterId,
          returnDate: body.iadeTarihi,
          inventoryStatus: body.envanterDurumu
        }
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
        { id: uuidv4(), adSoyad: 'Admin User', email: 'admin@halktv.com.tr', telefon: '555-9999', departmanId: departmanlar[0].id, durum: 'Aktif', yoneticiYetkisi: true, adminYetkisi: true, sifre: 'admin123', createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        { id: uuidv4(), adSoyad: 'Ahmet Yılmaz', email: 'ahmet@example.com', telefon: '555-0001', departmanId: departmanlar[0].id, durum: 'Aktif', yoneticiYetkisi: true, adminYetkisi: false, sifre: '123456', createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        { id: uuidv4(), adSoyad: 'Ayşe Kaya', email: 'ayse@example.com', telefon: '555-0002', departmanId: departmanlar[1].id, durum: 'Aktif', yoneticiYetkisi: true, adminYetkisi: false, sifre: '123456', createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        { id: uuidv4(), adSoyad: 'Mehmet Demir', email: 'mehmet@example.com', telefon: '555-0003', departmanId: departmanlar[0].id, durum: 'Aktif', yoneticiYetkisi: false, adminYetkisi: false, sifre: '123456', createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        { id: uuidv4(), adSoyad: 'Fatma Şahin', email: 'fatma@example.com', telefon: '555-0004', departmanId: departmanlar[2].id, durum: 'Aktif', yoneticiYetkisi: false, adminYetkisi: false, sifre: '123456', createdAt: new Date(), updatedAt: new Date(), deletedAt: null }
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

    // ============= AUDIT LOGS =============
    if (route === '/audit-logs' && method === 'GET') {
      const { actorUserId, actionType, entityType, startDate, endDate, page = 1, limit = 50 } = 
        Object.fromEntries(new URL(request.url).searchParams)

      const query = {}
      if (actorUserId) query.actorUserId = actorUserId
      if (actionType) query.actionType = actionType
      if (entityType) query.entityType = entityType
      if (startDate || endDate) {
        query.createdAt = {}
        if (startDate) query.createdAt.$gte = new Date(startDate)
        if (endDate) query.createdAt.$lte = new Date(endDate)
      }

      const skip = (parseInt(page) - 1) * parseInt(limit)
      
      const logs = await db.collection('audit_logs')
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray()

      const total = await db.collection('audit_logs').countDocuments(query)

      return handleCORS(NextResponse.json({
        logs: logs.map(({ _id, ...rest }) => rest),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }))
    }

    // ============= ACCESSORIES =============
    if (route.startsWith('/envanterler/') && route.endsWith('/accessories') && method === 'GET') {
      const inventoryId = route.split('/')[2]
      
      const accessories = await db.collection('inventory_accessories')
        .find({ inventoryId, deletedAt: null })
        .sort({ createdAt: -1 })
        .toArray()

      return handleCORS(NextResponse.json(accessories.map(({ _id, ...rest }) => rest)))
    }

    if (route.startsWith('/envanterler/') && route.endsWith('/accessories') && method === 'POST') {
      const inventoryId = route.split('/')[2]
      const body = await request.json()

      if (!body.ad) {
        return handleCORS(NextResponse.json(
          { error: "Aksesuar adı zorunludur" },
          { status: 400 }
        ))
      }

      // Check if serial number is unique if provided
      if (body.seriNumarasi) {
        const existing = await db.collection('inventory_accessories').findOne({
          seriNumarasi: body.seriNumarasi,
          deletedAt: null
        })
        if (existing) {
          return handleCORS(NextResponse.json(
            { error: "Bu seri numarası zaten kayıtlı" },
            { status: 400 }
          ))
        }
      }

      const accessory = {
        id: uuidv4(),
        inventoryId,
        ad: body.ad,
        marka: body.marka || '',
        model: body.model || '',
        seriNumarasi: body.seriNumarasi || '',
        durum: body.durum || 'Depoda',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      }

      await db.collection('inventory_accessories').insertOne(accessory)
      const { _id, ...result } = accessory

      return handleCORS(NextResponse.json(result))
    }

    if (route.match(/\/envanterler\/[^/]+\/accessories\/[^/]+$/) && method === 'PUT') {
      const parts = route.split('/')
      const accessoryId = parts[4]
      const body = await request.json()

      const updateData = {
        ...body,
        updatedAt: new Date()
      }

      const result = await db.collection('inventory_accessories').updateOne(
        { id: accessoryId, deletedAt: null },
        { $set: updateData }
      )

      if (result.matchedCount === 0) {
        return handleCORS(NextResponse.json(
          { error: "Aksesuar bulunamadı" },
          { status: 404 }
        ))
      }

      return handleCORS(NextResponse.json({ success: true }))
    }

    if (route.match(/\/envanterler\/[^/]+\/accessories\/[^/]+$/) && method === 'DELETE') {
      const parts = route.split('/')
      const accessoryId = parts[4]

      const result = await db.collection('inventory_accessories').updateOne(
        { id: accessoryId, deletedAt: null },
        { $set: { deletedAt: new Date() } }
      )

      if (result.matchedCount === 0) {
        return handleCORS(NextResponse.json(
          { error: "Aksesuar bulunamadı" },
          { status: 404 }
        ))
      }

      return handleCORS(NextResponse.json({ success: true }))
    }

    // ============= DİJİTAL VARLIK KATEGORİLERİ =============
    if (route === '/dijital-varlik-kategorileri' && method === 'GET') {
      const kategoriler = await db.collection('dijital_varlik_kategorileri')
        .find({ deletedAt: null })
        .sort({ ad: 1 })
        .toArray()

      return handleCORS(NextResponse.json(kategoriler.map(({ _id, ...rest }) => rest)))
    }

    if (route === '/dijital-varlik-kategorileri' && method === 'POST') {
      const body = await request.json()

      if (!body.ad) {
        return handleCORS(NextResponse.json(
          { error: "Kategori adı zorunludur" },
          { status: 400 }
        ))
      }

      const kategori = {
        id: uuidv4(),
        ad: body.ad,
        aciklama: body.aciklama || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      }

      await db.collection('dijital_varlik_kategorileri').insertOne(kategori)

      // Audit log
      await createAuditLog(
        body.userId || 'system',
        body.userName || 'System',
        'CREATE_DIGITAL_ASSET_CATEGORY',
        'DigitalAssetCategory',
        kategori.id,
        { categoryName: kategori.ad }
      )

      const { _id, ...result } = kategori
      return handleCORS(NextResponse.json(result))
    }

    if (route.startsWith('/dijital-varlik-kategorileri/') && method === 'DELETE') {
      const id = route.split('/')[2]
      const body = await request.json().catch(() => ({}))

      const result = await db.collection('dijital_varlik_kategorileri').updateOne(
        { id, deletedAt: null },
        { $set: { deletedAt: new Date() } }
      )

      if (result.matchedCount === 0) {
        return handleCORS(NextResponse.json(
          { error: "Kategori bulunamadı" },
          { status: 404 }
        ))
      }

      return handleCORS(NextResponse.json({ success: true }))
    }

    // ============= DİJİTAL VARLIKLAR =============
    if (route === '/dijital-varliklar' && method === 'GET') {
      const dijitalVarliklar = await db.collection('dijital_varliklar')
        .find({ deletedAt: null })
        .sort({ createdAt: -1 })
        .toArray()

      // Enrich with related data
      const kategoriler = await db.collection('dijital_varlik_kategorileri').find({ deletedAt: null }).toArray()
      const envanterler = await db.collection('envanterler').find({ deletedAt: null }).toArray()
      const calisanlar = await db.collection('calisanlar').find({ deletedAt: null }).toArray()

      const enrichedData = dijitalVarliklar.map(dv => {
        const kategori = kategoriler.find(k => k.id === dv.kategoriId)
        const envanter = envanterler.find(e => e.id === dv.envanterId)
        const calisan = calisanlar.find(c => c.id === dv.calisanId)

        return {
          ...dv,
          kategoriAd: kategori?.ad || '-',
          envanterBilgisi: envanter ? {
            marka: envanter.marka,
            model: envanter.model,
            seriNumarasi: envanter.seriNumarasi
          } : null,
          calisanAd: calisan?.adSoyad || '-'
        }
      })

      return handleCORS(NextResponse.json(enrichedData.map(({ _id, ...rest }) => rest)))
    }

    if (route === '/dijital-varliklar' && method === 'POST') {
      const body = await request.json()

      if (!body.ad || !body.kategoriId) {
        return handleCORS(NextResponse.json(
          { error: "Dijital varlık adı ve kategorisi zorunludur" },
          { status: 400 }
        ))
      }

      const dijitalVarlik = {
        id: uuidv4(),
        ad: body.ad,
        kategoriId: body.kategoriId,
        hesapEmail: body.hesapEmail || '',
        hesapKullaniciAdi: body.hesapKullaniciAdi || '',
        hesapSifre: body.hesapSifre || '',
        keyBilgisi: body.keyBilgisi || '',
        envanterId: body.envanterId || null,
        calisanId: body.calisanId || null,
        lisansTipi: body.lisansTipi || 'Süresiz', // Süresiz, Yıllık, Aylık
        baslangicTarihi: body.baslangicTarihi ? new Date(body.baslangicTarihi) : null,
        bitisTarihi: body.bitisTarihi ? new Date(body.bitisTarihi) : null,
        durum: body.durum || 'Aktif', // Aktif, Pasif, Süresi Dolmuş
        notlar: body.notlar || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      }

      await db.collection('dijital_varliklar').insertOne(dijitalVarlik)

      // Audit log
      await createAuditLog(
        body.userId || 'system',
        body.userName || 'System',
        'CREATE_DIGITAL_ASSET',
        'DigitalAsset',
        dijitalVarlik.id,
        { assetName: dijitalVarlik.ad, category: body.kategoriId }
      )

      const { _id, ...result } = dijitalVarlik
      return handleCORS(NextResponse.json(result))
    }

    if (route.startsWith('/dijital-varliklar/') && method === 'PUT') {
      const id = route.split('/')[2]
      const body = await request.json()

      const { userId, userName, ...updateFields } = body

      const updateData = {
        ...updateFields,
        baslangicTarihi: updateFields.baslangicTarihi ? new Date(updateFields.baslangicTarihi) : null,
        bitisTarihi: updateFields.bitisTarihi ? new Date(updateFields.bitisTarihi) : null,
        updatedAt: new Date()
      }

      const result = await db.collection('dijital_varliklar').updateOne(
        { id, deletedAt: null },
        { $set: updateData }
      )

      if (result.matchedCount === 0) {
        return handleCORS(NextResponse.json(
          { error: "Dijital varlık bulunamadı" },
          { status: 404 }
        ))
      }

      // Audit log
      await createAuditLog(
        userId || 'system',
        userName || 'System',
        'UPDATE_DIGITAL_ASSET',
        'DigitalAsset',
        id,
        { assetName: updateFields.ad }
      )

      return handleCORS(NextResponse.json({ success: true }))
    }

    if (route.startsWith('/dijital-varliklar/') && method === 'DELETE') {
      const id = route.split('/')[2]
      const body = await request.json().catch(() => ({}))

      const existing = await db.collection('dijital_varliklar').findOne({ id, deletedAt: null })

      const result = await db.collection('dijital_varliklar').updateOne(
        { id, deletedAt: null },
        { $set: { deletedAt: new Date() } }
      )

      if (result.matchedCount === 0) {
        return handleCORS(NextResponse.json(
          { error: "Dijital varlık bulunamadı" },
          { status: 404 }
        ))
      }

      // Audit log
      await createAuditLog(
        body.userId || 'system',
        body.userName || 'System',
        'DELETE_DIGITAL_ASSET',
        'DigitalAsset',
        id,
        { assetName: existing?.ad }
      )

      return handleCORS(NextResponse.json({ success: true }))
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
