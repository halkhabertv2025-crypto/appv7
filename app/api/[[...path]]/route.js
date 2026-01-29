import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

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

      // Password verification logic (incl. lazy migration)
      let passwordMatch = false
      let needsMigration = false

      // 1. Try bcrypt compare (for hashed passwords)
      try {
        passwordMatch = await bcrypt.compare(body.sifre, calisan.sifre)
      } catch (e) {
        // Not a valid hash, likely plaintext
      }

      // 2. Fallback: Try plaintext compare (for legacy passwords)
      if (!passwordMatch && calisan.sifre === body.sifre) {
        passwordMatch = true
        needsMigration = true
      }

      if (!passwordMatch) {
        return handleCORS(NextResponse.json(
          { error: "Email veya şifre hatalı" },
          { status: 401 }
        ))
      }

      // 3. Lazy Migration: If it was plaintext, hash and update now
      if (needsMigration) {
        const hashedPassword = await bcrypt.hash(body.sifre, 10)
        await db.collection('calisanlar').updateOne(
          { id: calisan.id },
          { $set: { sifre: hashedPassword } }
        )
      }

      if (calisan.durum !== 'Aktif') {
        return handleCORS(NextResponse.json(
          { error: "Hesabınız aktif değil" },
          { status: 403 }
        ))
      }

      // All active employees can now login

      // Get department name
      const departman = await db.collection('departmanlar').findOne({ id: calisan.departmanId })

      const userData = {
        id: calisan.id,
        adSoyad: calisan.adSoyad,
        email: calisan.email,
        departmanId: calisan.departmanId,
        departmanAd: departman?.ad || 'Bilinmiyor',
        calisanYetkisi: calisan.calisanYetkisi || false,
        yoneticiYetkisi: calisan.yoneticiYetkisi || false,
        adminYetkisi: calisan.adminYetkisi || false,
        sifreDegistirildi: calisan.sifreDegistirildi || false,
        token: uuidv4() // Simple token for session
      }

      // Log login event
      await createAuditLog(
        calisan.id,
        calisan.adSoyad,
        'USER_LOGIN',
        'Auth',
        calisan.id,
        { email: calisan.email }
      )

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

      // Fetch recent logins
      const recentLogins = await db.collection('audit_logs')
        .find({ actionType: 'USER_LOGIN' })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray()

      // Get last login specifically for Tebrikler widget
      const lastLogin = recentLogins.length > 0 ? {
        userId: recentLogins[0].actorUserId,
        userName: recentLogins[0].actorUserName,
        timestamp: recentLogins[0].createdAt
      } : null

      // Fetch active repairs for Service Widget
      const servistekiCihazlar = await db.collection('bakim_kayitlari')
        .find({ durum: 'Serviste', deletedAt: null })
        .sort({ baslangicTarihi: -1 })
        .toArray()

      const enrichedServisteki = await Promise.all(
        servistekiCihazlar.map(async (kayit) => {
          const envanter = await db.collection('envanterler').findOne({ id: kayit.envanterId })
          const envanterTip = envanter ? await db.collection('envanter_tipleri').findOne({ id: envanter.envanterTipiId }) : null

          return {
            id: kayit.id,
            envanterAd: envanter ? `${envanterTip?.ad || ''} ${envanter.marka} ${envanter.model}` : 'Bilinmiyor',
            seriNumarasi: envanter?.seriNumarasi || '',
            servisFirma: kayit.servisFirma,
            baslangicTarihi: kayit.baslangicTarihi,
            bitisTarihi: kayit.bitisTarihi,
            tahminiSure: kayit.tahminiSure, // Keeping for backward compatibility
            durum: kayit.durum
          }
        })
      )

      // Recent completed repairs (for Admin notification)
      const finishedRepairs = await db.collection('bakim_kayitlari')
        .find({
          durum: 'Tamamlandı',
          deletedAt: null,
          bitisTarihi: { $gte: new Date(new Date().setDate(new Date().getDate() - 7)) } // Last 7 days
        })
        .sort({ bitisTarihi: -1 })
        .toArray()

      const enrichedFinished = await Promise.all(
        finishedRepairs.map(async (kayit) => {
          const envanter = await db.collection('envanterler').findOne({ id: kayit.envanterId })
          const envanterTip = envanter ? await db.collection('envanter_tipleri').findOne({ id: envanter.envanterTipiId }) : null

          return {
            id: kayit.id,
            envanterAd: envanter ? `${envanterTip?.ad || ''} ${envanter.marka} ${envanter.model}` : 'Bilinmiyor',
            bitisTarihi: kayit.bitisTarihi,
            maliyet: kayit.maliyet,
            paraBirimi: kayit.paraBirimi
          }
        })
      )

      return handleCORS(NextResponse.json({
        stats,
        recentZimmetler: enrichedZimmetler,
        lastLogin,
        recentLogins: recentLogins.map(log => ({
          userId: log.actorUserId,
          userName: log.actorUserName,
          timestamp: log.createdAt
        })),
        servistekiCihazlar: enrichedServisteki,
        tamamlananBakimlar: enrichedFinished
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

      // Audit log with before/after comparison
      const changedFields = {}
      if (updateFields.ad && updateFields.ad !== existingDept?.ad) {
        changedFields.ad = { onceki: existingDept?.ad, yeni: updateFields.ad }
      }
      if (updateFields.aciklama !== undefined && updateFields.aciklama !== existingDept?.aciklama) {
        changedFields.aciklama = { onceki: existingDept?.aciklama || '', yeni: updateFields.aciklama }
      }

      await createAuditLog(
        userId || 'system',
        userName || 'System',
        'UPDATE_DEPARTMENT',
        'Department',
        id,
        {
          departmentName: existingDept?.ad,
          degisiklikler: changedFields
        }
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

      // Get all active zimmetler
      const aktifZimmetler = await db.collection('zimmetler')
        .find({ durum: 'Aktif', deletedAt: null })
        .toArray()

      // Add department names and zimmet count
      const enrichedCalisanlar = await Promise.all(
        calisanlar.map(async (calisan) => {
          const departman = await db.collection('departmanlar').findOne({ id: calisan.departmanId })
          const calisanZimmetleri = aktifZimmetler.filter(z => z.calisanId === calisan.id)
          return {
            ...calisan,
            departmanAd: departman?.ad || 'Bilinmiyor',
            aktifZimmetSayisi: calisanZimmetleri.length,
            zimmetliMi: calisanZimmetleri.length > 0
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
        calisanYetkisi: body.calisanYetkisi || false,
        yoneticiYetkisi: body.yoneticiYetkisi || false,
        adminYetkisi: body.adminYetkisi || false,
        iseGirisTarihi: body.iseGirisTarihi || new Date().toISOString().split('T')[0],
        sifre: await bcrypt.hash(body.sifre || 'Halktv123!', 10), // Hash initial password
        sifreDegistirildi: false,
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

    if (route.match(/\/calisanlar\/[^/]+$/) && method === 'GET') {
      const id = route.split('/')[2]
      const calisan = await db.collection('calisanlar').findOne({ id, deletedAt: null })

      if (!calisan) {
        return handleCORS(NextResponse.json(
          { error: "Çalışan bulunamadı" },
          { status: 404 }
        ))
      }

      const departman = await db.collection('departmanlar').findOne({ id: calisan.departmanId })
      const enrichedCalisan = {
        ...calisan,
        departmanAd: departman?.ad || 'Bilinmiyor'
      }

      const { _id, ...rest } = enrichedCalisan
      return handleCORS(NextResponse.json(rest))
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

      // Check if trying to set employee to Pasif while they have active zimmet
      if (body.durum === 'Pasif' && existingCalisan?.durum !== 'Pasif') {
        const activeZimmet = await db.collection('zimmetler').findOne({
          calisanId: id,
          durum: 'Aktif',
          deletedAt: null
        })

        if (activeZimmet) {
          return handleCORS(NextResponse.json(
            { error: "Üzerinde aktif zimmet olan çalışan pasife alınamaz. Önce zimmetleri iade alın." },
            { status: 409 }
          ))
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

      // Audit log with before/after comparison
      const requestingUserForLog = authHeader ? await db.collection('calisanlar').findOne({ id: authHeader }) : null

      const changedFields = {}
      if (updateFields.adSoyad && updateFields.adSoyad !== existingCalisan?.adSoyad) {
        changedFields.adSoyad = { onceki: existingCalisan?.adSoyad, yeni: updateFields.adSoyad }
      }
      if (updateFields.email && updateFields.email !== existingCalisan?.email) {
        changedFields.email = { onceki: existingCalisan?.email, yeni: updateFields.email }
      }
      if (updateFields.telefon !== undefined && updateFields.telefon !== existingCalisan?.telefon) {
        changedFields.telefon = { onceki: existingCalisan?.telefon || '', yeni: updateFields.telefon }
      }
      if (updateFields.departmanId && updateFields.departmanId !== existingCalisan?.departmanId) {
        changedFields.departmanId = { onceki: existingCalisan?.departmanId, yeni: updateFields.departmanId }
      }
      if (updateFields.durum && updateFields.durum !== existingCalisan?.durum) {
        changedFields.durum = { onceki: existingCalisan?.durum, yeni: updateFields.durum }
      }
      if (updateFields.yoneticiYetkisi !== undefined && updateFields.yoneticiYetkisi !== existingCalisan?.yoneticiYetkisi) {
        changedFields.yoneticiYetkisi = { onceki: existingCalisan?.yoneticiYetkisi, yeni: updateFields.yoneticiYetkisi }
      }
      if (updateFields.adminYetkisi !== undefined && updateFields.adminYetkisi !== existingCalisan?.adminYetkisi) {
        changedFields.adminYetkisi = { onceki: existingCalisan?.adminYetkisi, yeni: updateFields.adminYetkisi }
      }

      await createAuditLog(
        authHeader || userId || 'system',
        requestingUserForLog?.adSoyad || userName || 'System',
        'UPDATE_EMPLOYEE',
        'Employee',
        id,
        {
          employeeName: existingCalisan?.adSoyad,
          degisiklikler: changedFields
        }
      )

      return handleCORS(NextResponse.json({ success: true }))
    }

    if (route.startsWith('/calisanlar/') && route.endsWith('/change-password') && method === 'POST') {
      const parts = route.split('/')
      const id = parts[2]
      const body = await request.json()

      if (!body.currentPassword || !body.newPassword) {
        return handleCORS(NextResponse.json(
          { error: "Mevcut şifre ve yeni şifre zorunludur" },
          { status: 400 }
        ))
      }

      const calisan = await db.collection('calisanlar').findOne({ id, deletedAt: null })
      if (!calisan) {
        return handleCORS(NextResponse.json({ error: "Çalışan bulunamadı" }, { status: 404 }))
      }

      // Verify current password (support both hash and plain for transition)
      let currentMatch = false
      try {
        currentMatch = await bcrypt.compare(body.currentPassword, calisan.sifre)
      } catch (e) { }

      if (!currentMatch && calisan.sifre === body.currentPassword) {
        currentMatch = true
      }

      if (!currentMatch) {
        return handleCORS(NextResponse.json({ error: "Mevcut şifreniz hatalı" }, { status: 401 }))
      }

      const newHashedPassword = await bcrypt.hash(body.newPassword, 10)

      await db.collection('calisanlar').updateOne(
        { id },
        {
          $set: {
            sifre: newHashedPassword,
            sifreDegistirildi: true,
            updatedAt: new Date()
          }
        }
      )

      await createAuditLog(
        id,
        calisan.adSoyad,
        'PASSWORD_CHANGE',
        'Employee',
        id,
        { email: calisan.email }
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

    if (route.startsWith('/calisanlar/') && route.endsWith('/belgeler') && method === 'GET') {
      const id = route.split('/')[2]

      const belgeler = await db.collection('calisan_belgeleri')
        .find({ calisanId: id, deletedAt: null })
        .sort({ createdAt: -1 })
        .toArray()

      return handleCORS(NextResponse.json(belgeler.map(({ _id, ...rest }) => rest)))
    }

    if (route.startsWith('/calisanlar/') && route.endsWith('/belgeler') && method === 'POST') {
      const id = route.split('/')[2]
      const body = await request.json()

      if (!body.ad || !body.dosyaVerisi) {
        return handleCORS(NextResponse.json(
          { error: "Dosya adı ve veri zorunludur" },
          { status: 400 }
        ))
      }

      const belge = {
        id: uuidv4(),
        calisanId: id,
        ad: body.ad,
        tip: body.tip || 'file', // pdf, image, etc.
        dosyaVerisi: body.dosyaVerisi, // Base64 content
        yukleyenId: body.yukleyenId || 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      }

      await db.collection('calisan_belgeleri').insertOne(belge)

      // Audit log
      await createAuditLog(
        body.yukleyenId || 'system',
        body.yukleyenAd || 'System',
        'UPLOAD_DOCUMENT',
        'Document',
        belge.id,
        { fileName: belge.ad, employeeId: id }
      )

      const { _id, ...result } = belge
      return handleCORS(NextResponse.json(result))
    }

    if (route.startsWith('/calisanlar/belgeler/') && method === 'DELETE') {
      const id = route.split('/')[3]
      const body = await request.json().catch(() => ({}))

      const existingBelge = await db.collection('calisan_belgeleri').findOne({ id, deletedAt: null })

      const result = await db.collection('calisan_belgeleri').updateOne(
        { id, deletedAt: null },
        { $set: { deletedAt: new Date() } }
      )

      if (result.matchedCount === 0) {
        return handleCORS(NextResponse.json(
          { error: "Belge bulunamadı" },
          { status: 404 }
        ))
      }

      // Audit log
      await createAuditLog(
        body.userId || 'system',
        body.userName || 'System',
        'DELETE_DOCUMENT',
        'Document',
        id,
        { fileName: existingBelge?.ad }
      )

      return handleCORS(NextResponse.json({ success: true }))
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
        { $set: { deletedAt: new Date(), deletedBy: body.userName || 'Bilinmiyor', deletedByRole: body.userRole || '' } }
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
        // Financial/Depreciation fields
        alisFiyati: body.alisFiyati || null,
        paraBirimi: body.paraBirimi || 'TRY',
        alisTarihi: body.alisTarihi ? new Date(body.alisTarihi) : null,
        amortismanOrani: body.amortismanOrani || 20, // Default 20% per year
        ekonomikOmur: body.ekonomikOmur || 5, // Default 5 years
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

      // Send email notification for new inventory
      const mailSettings = await db.collection('system_settings').findOne({ id: 'mail_settings' })

      if (mailSettings && mailSettings.smtpHost && mailSettings.smtpUser) {
        try {
          const nodemailer = require('nodemailer')
          const envanterTip = await db.collection('envanter_tipleri').findOne({ id: envanter.envanterTipiId })

          // Get all admins and managers emails
          const admins = await db.collection('calisanlar')
            .find({
              $or: [{ adminYetkisi: true }, { yoneticiYetkisi: true }],
              deletedAt: null,
              email: { $exists: true, $ne: '' }
            })
            .toArray()

          if (admins.length > 0) {
            const transporter = nodemailer.createTransport({
              host: mailSettings.smtpHost,
              port: mailSettings.smtpPort,
              secure: mailSettings.enableSsl,
              auth: {
                user: mailSettings.smtpUser,
                pass: mailSettings.smtpPassword
              }
            })

            const emailContent = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #14b8a6; color: white; padding: 20px; text-align: center;">
                  <h1 style="margin: 0;">Halk TV Envanter Sistemi</h1>
                </div>
                <div style="padding: 20px; background-color: #f9fafb;">
                  <h2 style="color: #1f2937;">Yeni Envanter Eklendi</h2>
                  <div style="margin-top: 20px; padding: 15px; background-color: #e0f2fe; border-left: 4px solid #0284c7; border-radius: 4px;">
                    <p style="margin: 0; color: #0369a1;"><strong>Envanter Detayları:</strong></p>
                    <ul style="color: #0c4a6e; margin-top: 10px;">
                      <li>Tip: ${envanterTip?.ad || '-'}</li>
                      <li>Marka: ${envanter.marka}</li>
                      <li>Model: ${envanter.model}</li>
                      <li>Seri No: ${envanter.seriNumarasi}</li>
                      <li>Durum: ${envanter.durum}</li>
                      ${envanter.alisFiyati ? `<li>Alış Fiyatı: ${envanter.alisFiyati} ${envanter.paraBirimi}</li>` : ''}
                    </ul>
                  </div>
                  <div style="margin-top: 15px; padding: 10px; background-color: #f3f4f6; border-radius: 4px;">
                    <p style="margin: 0; color: #4b5563; font-size: 14px;">
                      <strong>Ekleyen:</strong> ${body.userName || 'Bilinmiyor'}<br/>
                      <strong>Eklenme Tarihi:</strong> ${new Date().toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>
              </div>
            `

            // Send to all admins
            for (const admin of admins) {
              try {
                await transporter.sendMail({
                  from: `"${mailSettings.fromName}" <${mailSettings.fromEmail}>`,
                  to: admin.email,
                  subject: 'Yeni Envanter Eklendi',
                  html: emailContent
                })
              } catch (mailError) {
                console.error(`Mail gönderilemedi (${admin.email}):`, mailError)
              }
            }
            console.log(`Yeni envanter bildirimi gönderildi: ${admins.length} kişiye`)
          }
        } catch (error) {
          console.error('Envanter bildirimi gönderilemedi:', error)
          // Don't fail the request if email fails
        }
      }

      const { _id, ...result } = envanter
      return handleCORS(NextResponse.json(result))
    }

    if (route.startsWith('/envanterler/') && method === 'GET' && !route.endsWith('/accessories')) {
      const id = route.split('/')[2]

      const envanter = await db.collection('envanterler').findOne({ id, deletedAt: null })

      if (!envanter) {
        return handleCORS(NextResponse.json(
          { error: "Envanter bulunamadı" },
          { status: 404 }
        ))
      }

      // Envanter tipi
      const tip = await db.collection('envanter_tipleri').findOne({ id: envanter.envanterTipiId })

      // Active zimmet info
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

      return handleCORS(NextResponse.json({
        ...envanter,
        envanterTipiAd: tip?.ad || 'Bilinmiyor',
        zimmetBilgisi
      }))
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

      // Audit log with before/after comparison
      const changedFields = {}
      if (cleanBody.marka && cleanBody.marka !== currentEnvanter.marka) {
        changedFields.marka = { onceki: currentEnvanter.marka, yeni: cleanBody.marka }
      }
      if (cleanBody.model && cleanBody.model !== currentEnvanter.model) {
        changedFields.model = { onceki: currentEnvanter.model, yeni: cleanBody.model }
      }
      if (cleanBody.seriNumarasi && cleanBody.seriNumarasi !== currentEnvanter.seriNumarasi) {
        changedFields.seriNumarasi = { onceki: currentEnvanter.seriNumarasi, yeni: cleanBody.seriNumarasi }
      }
      if (cleanBody.durum && cleanBody.durum !== currentEnvanter.durum) {
        changedFields.durum = { onceki: currentEnvanter.durum, yeni: cleanBody.durum }
      }
      if (cleanBody.notlar !== undefined && cleanBody.notlar !== currentEnvanter.notlar) {
        changedFields.notlar = { onceki: currentEnvanter.notlar || '', yeni: cleanBody.notlar }
      }
      if (cleanBody.envanterTipiId && cleanBody.envanterTipiId !== currentEnvanter.envanterTipiId) {
        changedFields.envanterTipiId = { onceki: currentEnvanter.envanterTipiId, yeni: cleanBody.envanterTipiId }
      }

      // Only log if there are actual changes
      if (Object.keys(changedFields).length > 0) {
        await createAuditLog(
          userId || 'system',
          userName || 'System',
          'UPDATE_INVENTORY',
          'Inventory',
          id,
          {
            marka: currentEnvanter.marka,
            model: currentEnvanter.model,
            seriNumarasi: currentEnvanter.seriNumarasi,
            degisiklikler: changedFields
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

      // Check if envanter has active zimmet - cannot delete if assigned
      const activeZimmet = await db.collection('zimmetler').findOne({
        envanterId: id,
        durum: 'Aktif',
        deletedAt: null
      })

      if (activeZimmet) {
        return handleCORS(NextResponse.json(
          { error: "Zimmetli envanter silinemez. Önce iade alın." },
          { status: 409 }
        ))
      }

      const result = await db.collection('envanterler').updateOne(
        { id, deletedAt: null },
        { $set: { deletedAt: new Date(), deletedBy: body.userName || 'Bilinmiyor', deletedByRole: body.userRole || '' } }
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

    // ============= ENVANTER GEÇMİŞİ =============
    if (route.match(/^\/envanterler\/[^/]+\/gecmis$/) && method === 'GET') {
      const id = route.split('/')[2]

      // Check if envanter exists
      const envanter = await db.collection('envanterler').findOne({ id, deletedAt: null })
      if (!envanter) {
        return handleCORS(NextResponse.json(
          { error: "Envanter bulunamadı" },
          { status: 404 }
        ))
      }

      // Get all zimmet records for this inventory (including returned ones)
      const zimmetler = await db.collection('zimmetler')
        .find({ envanterId: id, deletedAt: null })
        .sort({ zimmetTarihi: -1 })
        .toArray()

      // Enrich zimmet records with employee and department info
      const enrichedZimmetler = await Promise.all(
        zimmetler.map(async (zimmet) => {
          const calisan = await db.collection('calisanlar').findOne({ id: zimmet.calisanId })
          const departman = calisan ? await db.collection('departmanlar').findOne({ id: calisan.departmanId }) : null
          
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
            id: zimmet.id,
            calisanAd: calisan?.adSoyad || 'Bilinmiyor',
            departmanAd: departman?.ad || 'Bilinmiyor',
            zimmetTarihi: zimmet.zimmetTarihi,
            iadeTarihi: zimmet.iadeTarihi,
            durum: zimmet.durum,
            aciklama: zimmet.aciklama,
            iadeAlanYetkili,
            createdAt: zimmet.createdAt
          }
        })
      )

      // Get audit logs for this inventory
      const auditLogs = await db.collection('audit_logs')
        .find({ 
          entityId: id,
          entityType: 'Inventory'
        })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray()

      const formattedLogs = auditLogs.map(log => ({
        id: log.id,
        actionType: log.actionType,
        actorUserName: log.actorUserName,
        details: log.details,
        createdAt: log.createdAt
      }))

      return handleCORS(NextResponse.json({
        envanter: {
          id: envanter.id,
          marka: envanter.marka,
          model: envanter.model,
          seriNumarasi: envanter.seriNumarasi
        },
        zimmetGecmisi: enrichedZimmetler,
        islemLoglari: formattedLogs
      }))
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

    if (route.startsWith('/dijital-varlik-kategorileri/') && method === 'PUT') {
      const id = route.split('/')[2]
      const body = await request.json()

      const { userId, userName, ...updateFields } = body
      const updateData = {
        ...updateFields,
        updatedAt: new Date()
      }

      const result = await db.collection('dijital_varlik_kategorileri').updateOne(
        { id, deletedAt: null },
        { $set: updateData }
      )

      if (result.matchedCount === 0) {
        return handleCORS(NextResponse.json(
          { error: "Kategori bulunamadı" },
          { status: 404 }
        ))
      }

      return handleCORS(NextResponse.json({ success: true }))
    }

    if (route.startsWith('/dijital-varlik-kategorileri/') && method === 'DELETE') {
      const id = route.split('/')[2]
      const body = await request.json().catch(() => ({}))

      // Check if category is used
      const usedByAsset = await db.collection('dijital_varliklar').findOne({
        kategoriId: id,
        deletedAt: null
      })

      if (usedByAsset) {
        return handleCORS(NextResponse.json(
          { error: "Bu kategoriye bağlı dijital varlıklar var. Önce onları silin veya kategorisini değiştirin." },
          { status: 409 }
        ))
      }

      const categoryToDelete = await db.collection('dijital_varlik_kategorileri').findOne({ id, deletedAt: null })

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

      // Audit log
      await createAuditLog(
        body.userId || 'system',
        body.userName || 'System',
        'DELETE_DIGITAL_ASSET_CATEGORY',
        'DigitalAssetCategory',
        id,
        { categoryName: categoryToDelete?.ad }
      )

      return handleCORS(NextResponse.json({ success: true }))
    }

    // ============= SİLİNENLERİ GERİ YÜKLEME =============
    if (route === '/deleted/envanterler' && method === 'GET') {
      const deleted = await db.collection('envanterler')
        .find({ deletedAt: { $ne: null } })
        .sort({ deletedAt: -1 })
        .toArray()

      const envanterTipleri = await db.collection('envanter_tipleri').find({}).toArray()
      const enriched = deleted.map(env => ({
        ...env,
        envanterTipiAd: envanterTipleri.find(t => t.id === env.envanterTipiId)?.ad || 'Bilinmiyor'
      }))

      return handleCORS(NextResponse.json(enriched.map(({ _id, ...rest }) => rest)))
    }

    if (route === '/deleted/calisanlar' && method === 'GET') {
      const deleted = await db.collection('calisanlar')
        .find({ deletedAt: { $ne: null } })
        .sort({ deletedAt: -1 })
        .toArray()

      const departmanlar = await db.collection('departmanlar').find({}).toArray()
      const enriched = deleted.map(cal => ({
        ...cal,
        departmanAd: departmanlar.find(d => d.id === cal.departmanId)?.ad || 'Bilinmiyor'
      }))

      return handleCORS(NextResponse.json(enriched.map(({ _id, ...rest }) => rest)))
    }

    if (route.startsWith('/restore/envanter/') && method === 'POST') {
      const id = route.split('/')[3]
      const body = await request.json().catch(() => ({}))

      const result = await db.collection('envanterler').updateOne(
        { id, deletedAt: { $ne: null } },
        { $set: { deletedAt: null, updatedAt: new Date() } }
      )

      if (result.matchedCount === 0) {
        return handleCORS(NextResponse.json(
          { error: "Envanter bulunamadı" },
          { status: 404 }
        ))
      }

      await createAuditLog(
        body.userId || 'system',
        body.userName || 'System',
        'RESTORE_INVENTORY',
        'Inventory',
        id,
        { action: 'Geri yüklendi' }
      )

      return handleCORS(NextResponse.json({ success: true }))
    }

    if (route.startsWith('/restore/calisan/') && method === 'POST') {
      const id = route.split('/')[3]
      const body = await request.json().catch(() => ({}))

      const result = await db.collection('calisanlar').updateOne(
        { id, deletedAt: { $ne: null } },
        { $set: { deletedAt: null, updatedAt: new Date() } }
      )

      if (result.matchedCount === 0) {
        return handleCORS(NextResponse.json(
          { error: "Çalışan bulunamadı" },
          { status: 404 }
        ))
      }

      await createAuditLog(
        body.userId || 'system',
        body.userName || 'System',
        'RESTORE_EMPLOYEE',
        'Employee',
        id,
        { action: 'Geri yüklendi' }
      )

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

      // Get current dijital varlik for comparison
      const currentDijitalVarlik = await db.collection('dijital_varliklar').findOne({ id, deletedAt: null })

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

      // Audit log with before/after comparison
      const changedFields = {}
      if (updateFields.ad && updateFields.ad !== currentDijitalVarlik?.ad) {
        changedFields.ad = { onceki: currentDijitalVarlik?.ad, yeni: updateFields.ad }
      }
      if (updateFields.hesapEmail !== undefined && updateFields.hesapEmail !== currentDijitalVarlik?.hesapEmail) {
        changedFields.hesapEmail = { onceki: currentDijitalVarlik?.hesapEmail || '', yeni: updateFields.hesapEmail }
      }
      if (updateFields.hesapKullaniciAdi !== undefined && updateFields.hesapKullaniciAdi !== currentDijitalVarlik?.hesapKullaniciAdi) {
        changedFields.hesapKullaniciAdi = { onceki: currentDijitalVarlik?.hesapKullaniciAdi || '', yeni: updateFields.hesapKullaniciAdi }
      }
      if (updateFields.durum && updateFields.durum !== currentDijitalVarlik?.durum) {
        changedFields.durum = { onceki: currentDijitalVarlik?.durum, yeni: updateFields.durum }
      }
      if (updateFields.lisansTipi && updateFields.lisansTipi !== currentDijitalVarlik?.lisansTipi) {
        changedFields.lisansTipi = { onceki: currentDijitalVarlik?.lisansTipi, yeni: updateFields.lisansTipi }
      }
      if (updateFields.calisanId !== undefined && updateFields.calisanId !== currentDijitalVarlik?.calisanId) {
        changedFields.calisanId = { onceki: currentDijitalVarlik?.calisanId, yeni: updateFields.calisanId }
      }
      if (updateFields.envanterId !== undefined && updateFields.envanterId !== currentDijitalVarlik?.envanterId) {
        changedFields.envanterId = { onceki: currentDijitalVarlik?.envanterId, yeni: updateFields.envanterId }
      }

      await createAuditLog(
        userId || 'system',
        userName || 'System',
        'UPDATE_DIGITAL_ASSET',
        'DigitalAsset',
        id,
        {
          assetName: currentDijitalVarlik?.ad,
          degisiklikler: changedFields
        }
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

    // Backup Stats Endpoint
    if (route === '/backup/stats' && method === 'GET') {
      const envanterler = await db.collection('envanterler').countDocuments({ deletedAt: null })
      const calisanlar = await db.collection('calisanlar').countDocuments({ deletedAt: null })
      const zimmetler = await db.collection('zimmetler').countDocuments({ deletedAt: null })
      const departmanlar = await db.collection('departmanlar').countDocuments({ deletedAt: null })
      const envanterTipleri = await db.collection('envanter_tipleri').countDocuments({ deletedAt: null })
      const auditLogs = await db.collection('audit_logs').countDocuments({})
      const digitalAssets = await db.collection('digital_assets').countDocuments({ deletedAt: null })
      const digitalAssetCategories = await db.collection('digital_asset_categories').countDocuments({ deletedAt: null })

      return handleCORS(NextResponse.json({
        envanterler,
        calisanlar,
        zimmetler,
        departmanlar,
        envanterTipleri,
        auditLogs,
        digitalAssets,
        digitalAssetCategories
      }))
    }

    // Backup Export Endpoint
    if (route === '/backup/export' && method === 'GET') {
      const envanterler = await db.collection('envanterler').find({ deletedAt: null }).toArray()
      const calisanlar = await db.collection('calisanlar').find({ deletedAt: null }).toArray()
      const zimmetler = await db.collection('zimmetler').find({ deletedAt: null }).toArray()
      const departmanlar = await db.collection('departmanlar').find({ deletedAt: null }).toArray()
      const envanterTipleri = await db.collection('envanter_tipleri').find({ deletedAt: null }).toArray()
      const auditLogs = await db.collection('audit_logs').find({}).toArray()
      const digitalAssets = await db.collection('digital_assets').find({ deletedAt: null }).toArray()
      const digitalAssetCategories = await db.collection('digital_asset_categories').find({ deletedAt: null }).toArray()

      await createAuditLog(
        'system',
        'System',
        'EXPORT_SYSTEM_BACKUP',
        'System',
        'backup',
        {
          timestamp: new Date(),
          recordCounts: {
            envanterler: envanterler.length,
            calisanlar: calisanlar.length,
            zimmetler: zimmetler.length,
            departmanlar: departmanlar.length,
            envanterTipleri: envanterTipleri.length,
            auditLogs: auditLogs.length,
            digitalAssets: digitalAssets.length,
            digitalAssetCategories: digitalAssetCategories.length
          }
        }
      )

      return handleCORS(NextResponse.json({
        exportDate: new Date().toISOString(),
        version: '1.0',
        collections: {
          envanterler: envanterler.map(({ _id, ...rest }) => rest),
          calisanlar: calisanlar.map(({ _id, ...rest }) => rest),
          zimmetler: zimmetler.map(({ _id, ...rest }) => rest),
          departmanlar: departmanlar.map(({ _id, ...rest }) => rest),
          envanterTipleri: envanterTipleri.map(({ _id, ...rest }) => rest),
          auditLogs: auditLogs.map(({ _id, ...rest }) => rest),
          digitalAssets: digitalAssets.map(({ _id, ...rest }) => rest),
          digitalAssetCategories: digitalAssetCategories.map(({ _id, ...rest }) => rest)
        }
      }))
    }

    // ============= AMORTISMAN (Depreciation) =============
    if (route === '/amortisman-raporu' && method === 'GET') {
      const envanterler = await db.collection('envanterler')
        .find({ deletedAt: null, alisFiyati: { $gt: 0 } })
        .toArray()

      const today = new Date()
      const enrichedEnvanterler = await Promise.all(
        envanterler.map(async (envanter) => {
          const tip = await db.collection('envanter_tipleri').findOne({ id: envanter.envanterTipiId })

          // Calculate depreciation
          const alisFiyati = envanter.alisFiyati || 0
          const amortismanOrani = envanter.amortismanOrani || 20
          const alisTarihi = envanter.alisTarihi ? new Date(envanter.alisTarihi) : null

          let gecenYil = 0
          let yillikAmortisman = 0
          let birikimliAmortisman = 0
          let kalanDeger = alisFiyati

          if (alisTarihi && alisFiyati > 0) {
            gecenYil = (today.getTime() - alisTarihi.getTime()) / (1000 * 60 * 60 * 24 * 365)
            yillikAmortisman = alisFiyati * (amortismanOrani / 100)
            birikimliAmortisman = Math.min(yillikAmortisman * gecenYil, alisFiyati)
            kalanDeger = Math.max(alisFiyati - birikimliAmortisman, 0)
          }

          return {
            id: envanter.id,
            envanterTipiAd: tip?.ad || 'Bilinmiyor',
            marka: envanter.marka,
            model: envanter.model,
            seriNumarasi: envanter.seriNumarasi,
            durum: envanter.durum,
            alisFiyati,
            paraBirimi: envanter.paraBirimi || 'TRY',
            alisTarihi: envanter.alisTarihi,
            amortismanOrani,
            ekonomikOmur: envanter.ekonomikOmur || 5,
            gecenYil: Math.round(gecenYil * 10) / 10,
            yillikAmortisman: Math.round(yillikAmortisman * 100) / 100,
            birikimliAmortisman: Math.round(birikimliAmortisman * 100) / 100,
            kalanDeger: Math.round(kalanDeger * 100) / 100
          }
        })
      )

      // Summary by currency
      const ozet = {
        TRY: { toplamAlis: 0, toplamKalan: 0, toplamAmortisman: 0 },
        USD: { toplamAlis: 0, toplamKalan: 0, toplamAmortisman: 0 },
        EUR: { toplamAlis: 0, toplamKalan: 0, toplamAmortisman: 0 },
        GBP: { toplamAlis: 0, toplamKalan: 0, toplamAmortisman: 0 }
      }

      enrichedEnvanterler.forEach(e => {
        const pb = e.paraBirimi || 'TRY'
        if (ozet[pb]) {
          ozet[pb].toplamAlis += e.alisFiyati
          ozet[pb].toplamKalan += e.kalanDeger
          ozet[pb].toplamAmortisman += e.birikimliAmortisman
        }
      })

      return handleCORS(NextResponse.json({
        envanterler: enrichedEnvanterler,
        ozet,
        raporTarihi: today.toISOString()
      }))
    }

    // ============= BAKIM/ONARIM (Maintenance) =============
    if (route === '/bakim-kayitlari' && method === 'GET') {
      const kayitlar = await db.collection('bakim_kayitlari')
        .find({ deletedAt: null })
        .sort({ createdAt: -1 })
        .toArray()

      // Enrich with inventory info
      const enrichedKayitlar = await Promise.all(
        kayitlar.map(async (kayit) => {
          const envanter = await db.collection('envanterler').findOne({ id: kayit.envanterId })
          const envanterTip = envanter ? await db.collection('envanter_tipleri').findOne({ id: envanter.envanterTipiId }) : null

          return {
            ...kayit,
            envanterBilgisi: envanter ? {
              tip: envanterTip?.ad || '',
              marka: envanter.marka,
              model: envanter.model,
              seriNumarasi: envanter.seriNumarasi
            } : null
          }
        })
      )

      return handleCORS(NextResponse.json(enrichedKayitlar.map(({ _id, ...rest }) => rest)))
    }

    if (route === '/bakim-kayitlari' && method === 'POST') {
      const body = await request.json()

      if (!body.envanterId || !body.arizaTuru) {
        return handleCORS(NextResponse.json(
          { error: "Envanter ve arıza türü zorunludur" },
          { status: 400 }
        ))
      }

      const kayit = {
        id: uuidv4(),
        envanterId: body.envanterId,
        arizaTuru: body.arizaTuru, // "Donanım", "Yazılım", "Hasar", "Bakım"
        aciklama: body.aciklama || '',
        bildirilenTarih: body.bildirilenTarih ? new Date(body.bildirilenTarih) : new Date(),
        servisFirma: body.servisFirma || '',
        maliyet: body.maliyet || 0,
        paraBirimi: body.paraBirimi || 'TRY', // TRY, USD, EUR, GBP
        tahminiSure: body.tahminiSure || null, // Days
        baslangicTarihi: body.baslangicTarihi ? new Date(body.baslangicTarihi) : null,
        bitisTarihi: body.bitisTarihi ? new Date(body.bitisTarihi) : null,
        durum: body.durum || 'Beklemede', // "Beklemede", "Serviste", "Tamamlandı", "İptal"
        servisFisi: body.servisFisi || null, // File path for uploaded receipt
        notlar: body.notlar || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      }

      await db.collection('bakim_kayitlari').insertOne(kayit)

      // Update envanter status automatically if status is 'Serviste'
      if (body.durum === 'Serviste') {
        await db.collection('envanterler').updateOne(
          { id: body.envanterId },
          { $set: { durum: 'Servis', updatedAt: new Date() } }
        )
      }

      // Audit log
      await createAuditLog(
        body.userId || 'system',
        body.userName || 'System',
        'CREATE_MAINTENANCE',
        'Maintenance',
        kayit.id,
        { envanterId: body.envanterId, arizaTuru: body.arizaTuru }
      )

      const { _id, ...result } = kayit
      return handleCORS(NextResponse.json(result))
    }

    if (route.startsWith('/bakim-kayitlari/') && method === 'PUT') {
      const id = route.split('/')[2]
      const body = await request.json()

      const { userId, userName, ...updateFields } = body
      const updateData = {
        ...updateFields,
        updatedAt: new Date()
      }

      // Handle date fields
      if (updateData.bildirilenTarih) updateData.bildirilenTarih = new Date(updateData.bildirilenTarih)
      if (updateData.baslangicTarihi) updateData.baslangicTarihi = new Date(updateData.baslangicTarihi)
      if (updateData.bitisTarihi) updateData.bitisTarihi = new Date(updateData.bitisTarihi)

      const result = await db.collection('bakim_kayitlari').updateOne(
        { id, deletedAt: null },
        { $set: updateData }
      )

      if (result.matchedCount === 0) {
        return handleCORS(NextResponse.json(
          { error: "Bakım kaydı bulunamadı" },
          { status: 404 }
        ))
      }

      // If status changed to Serviste, update envanter status
      if (updateFields.durum === 'Serviste') {
        const kayit = await db.collection('bakim_kayitlari').findOne({ id })
        if (kayit) {
          await db.collection('envanterler').updateOne(
            { id: kayit.envanterId },
            { $set: { durum: 'Servis', updatedAt: new Date() } }
          )
        }
      }

      // If status changed to Tamamlandı, optionally update envanter status
      if (updateFields.durum === 'Tamamlandı' && updateFields.restoreEnvanterDurum) {
        const kayit = await db.collection('bakim_kayitlari').findOne({ id })
        if (kayit) {
          await db.collection('envanterler').updateOne(
            { id: kayit.envanterId },
            { $set: { durum: 'Depoda', updatedAt: new Date() } }
          )
        }
      }

      // Send email notification when status changes to Tamamlandı
      if (updateFields.durum === 'Tamamlandı') {
        const kayit = await db.collection('bakim_kayitlari').findOne({ id })
        const envanter = kayit ? await db.collection('envanterler').findOne({ id: kayit.envanterId }) : null

        // Get mail settings
        const mailSettings = await db.collection('system_settings').findOne({ id: 'mail_settings' })

        if (mailSettings && mailSettings.smtpHost && mailSettings.smtpUser) {
          try {
            const nodemailer = require('nodemailer')

            // Get all admins and managers emails
            const admins = await db.collection('calisanlar')
              .find({
                $or: [{ adminYetkisi: true }, { yoneticiYetkisi: true }],
                deletedAt: null,
                email: { $exists: true, $ne: '' }
              })
              .toArray()

            if (admins.length > 0) {
              const transporter = nodemailer.createTransport({
                host: mailSettings.smtpHost,
                port: mailSettings.smtpPort,
                secure: mailSettings.enableSsl,
                auth: {
                  user: mailSettings.smtpUser,
                  pass: mailSettings.smtpPassword
                }
              })

              const envanterAd = envanter ? `${envanter.marka} ${envanter.model}` : 'Bilinmeyen Envanter'
              const servisFirma = kayit.servisFirma || 'Bilinmeyen Firma'

              const emailContent = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background-color: #14b8a6; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0;">Halk TV Envanter Sistemi</h1>
                  </div>
                  <div style="padding: 20px; background-color: #f9fafb;">
                    <h2 style="color: #1f2937;">Servis Bildirimi</h2>
                    <p style="color: #4b5563; font-size: 16px;">
                      <strong>${envanterAd}</strong> envanteri <strong>${servisFirma}</strong> firmasından, arıza işlemi tamamlanmıştır.
                    </p>
                    <div style="margin-top: 20px; padding: 15px; background-color: #ecfdf5; border-left: 4px solid #10b981; border-radius: 4px;">
                      <p style="margin: 0; color: #065f46;"><strong>Detaylar:</strong></p>
                      <ul style="color: #047857; margin-top: 10px;">
                        <li>Arıza Türü: ${kayit.arizaTuru || '-'}</li>
                        <li>Bitiş Tarihi: ${kayit.bitisTarihi ? new Date(kayit.bitisTarihi).toLocaleDateString('tr-TR') : '-'}</li>
                        ${kayit.maliyet ? `<li>Maliyet: ${kayit.maliyet} ${kayit.paraBirimi || 'TRY'}</li>` : ''}
                      </ul>
                    </div>
                  </div>
                </div>
              `

              // Send to all admins
              for (const admin of admins) {
                try {
                  await transporter.sendMail({
                    from: `"${mailSettings.fromName}" <${mailSettings.fromEmail}>`,
                    to: admin.email,
                    subject: 'Servis Bildirimi',
                    html: emailContent
                  })
                } catch (mailError) {
                  console.error(`Mail gönderilemedi (${admin.email}):`, mailError)
                }
              }
              console.log(`Bakım bildirimi gönderildi: ${admins.length} kişiye`)
            }
          } catch (error) {
            console.error('Bakım bildirimi gönderilemedi:', error)
            // Don't fail the request if email fails
          }
        }
      }

      await createAuditLog(
        userId || 'system',
        userName || 'System',
        'UPDATE_MAINTENANCE',
        'Maintenance',
        id,
        { updates: Object.keys(updateFields) }
      )

      return handleCORS(NextResponse.json({ success: true }))
    }

    if (route.startsWith('/bakim-kayitlari/') && method === 'DELETE') {
      const id = route.split('/')[2]
      const body = await request.json().catch(() => ({}))

      const result = await db.collection('bakim_kayitlari').updateOne(
        { id, deletedAt: null },
        { $set: { deletedAt: new Date() } }
      )

      if (result.matchedCount === 0) {
        return handleCORS(NextResponse.json(
          { error: "Bakım kaydı bulunamadı" },
          { status: 404 }
        ))
      }

      await createAuditLog(
        body.userId || 'system',
        body.userName || 'System',
        'DELETE_MAINTENANCE',
        'Maintenance',
        id,
        {}
      )

      return handleCORS(NextResponse.json({ success: true }))
    }

    // Bakım İstatistikleri
    if (route === '/bakim-istatistikleri' && method === 'GET') {
      const kayitlar = await db.collection('bakim_kayitlari')
        .find({ deletedAt: null })
        .toArray()

      const stats = {
        toplamKayit: kayitlar.length,
        beklemede: kayitlar.filter(k => k.durum === 'Beklemede').length,
        serviste: kayitlar.filter(k => k.durum === 'Serviste').length,
        tamamlanan: kayitlar.filter(k => k.durum === 'Tamamlandı').length,
        toplamMaliyet: {
          TRY: kayitlar.filter(k => k.paraBirimi === 'TRY').reduce((sum, k) => sum + (k.maliyet || 0), 0),
          USD: kayitlar.filter(k => k.paraBirimi === 'USD').reduce((sum, k) => sum + (k.maliyet || 0), 0),
          EUR: kayitlar.filter(k => k.paraBirimi === 'EUR').reduce((sum, k) => sum + (k.maliyet || 0), 0),
          GBP: kayitlar.filter(k => k.paraBirimi === 'GBP').reduce((sum, k) => sum + (k.maliyet || 0), 0)
        },
        arizaTiplerineGore: {
          donanim: kayitlar.filter(k => k.arizaTuru === 'Donanım').length,
          yazilim: kayitlar.filter(k => k.arizaTuru === 'Yazılım').length,
          hasar: kayitlar.filter(k => k.arizaTuru === 'Hasar').length,
          bakim: kayitlar.filter(k => k.arizaTuru === 'Bakım').length
        }
      }

      return handleCORS(NextResponse.json(stats))
    }

    // ============= MAIL SETTINGS =============
    if (route === '/settings/mail' && method === 'GET') {
      const settings = await db.collection('system_settings').findOne({ id: 'mail_settings' })

      // Return settings without password for security
      const safeSettings = settings ? {
        smtpHost: settings.smtpHost || '',
        smtpPort: settings.smtpPort || 587,
        smtpUser: settings.smtpUser || '',
        smtpPassword: settings.smtpPassword ? '********' : '', // Masked
        fromEmail: settings.fromEmail || '',
        fromName: settings.fromName || 'Halk TV Envanter Sistemi',
        enableSsl: settings.enableSsl !== false,
        hasPassword: !!settings.smtpPassword
      } : {
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpPassword: '',
        fromEmail: '',
        fromName: 'Halk TV Envanter Sistemi',
        enableSsl: true,
        hasPassword: false
      }

      return handleCORS(NextResponse.json(safeSettings))
    }

    if (route === '/settings/mail' && method === 'PUT') {
      const body = await request.json()

      const updateData = {
        id: 'mail_settings',
        smtpHost: body.smtpHost || '',
        smtpPort: parseInt(body.smtpPort) || 587,
        smtpUser: body.smtpUser || '',
        fromEmail: body.fromEmail || '',
        fromName: body.fromName || 'Halk TV Envanter Sistemi',
        enableSsl: body.enableSsl !== false,
        updatedAt: new Date()
      }

      // Only update password if a new one is provided (not the masked placeholder)
      if (body.smtpPassword && body.smtpPassword !== '********') {
        updateData.smtpPassword = body.smtpPassword
      }

      await db.collection('system_settings').updateOne(
        { id: 'mail_settings' },
        { $set: updateData },
        { upsert: true }
      )

      return handleCORS(NextResponse.json({ success: true }))
    }

    if (route === '/settings/mail/test' && method === 'POST') {
      const body = await request.json()
      const testEmail = body.testEmail

      if (!testEmail) {
        return handleCORS(NextResponse.json(
          { error: "Test email adresi zorunludur" },
          { status: 400 }
        ))
      }

      // Get current settings
      const settings = await db.collection('system_settings').findOne({ id: 'mail_settings' })

      if (!settings || !settings.smtpHost || !settings.smtpUser) {
        return handleCORS(NextResponse.json(
          { error: "Mail ayarları yapılandırılmamış. Önce SMTP ayarlarını kaydedin." },
          { status: 400 }
        ))
      }

      try {
        // Dynamic import for nodemailer
        const nodemailer = require('nodemailer')

        const transporter = nodemailer.createTransport({
          host: settings.smtpHost,
          port: settings.smtpPort,
          secure: settings.enableSsl,
          auth: {
            user: settings.smtpUser,
            pass: settings.smtpPassword
          }
        })

        await transporter.sendMail({
          from: `"${settings.fromName}" <${settings.fromEmail}>`,
          to: testEmail,
          subject: 'Halk TV - Mail Test',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #14b8a6; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">Halk TV Envanter Sistemi</h1>
              </div>
              <div style="padding: 20px; background-color: #f9fafb;">
                <h2 style="color: #1f2937;">✅ Mail Testi Başarılı</h2>
                <p style="color: #4b5563;">Bu bir test mailidir. Mail ayarlarınız doğru yapılandırılmıştır.</p>
                <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                  Test tarihi: ${new Date().toLocaleString('tr-TR')}
                </p>
              </div>
            </div>
          `
        })

        return handleCORS(NextResponse.json({ success: true, message: 'Test maili gönderildi' }))
      } catch (error) {
        console.error('Mail test error:', error)
        return handleCORS(NextResponse.json(
          { error: `Mail gönderilemedi: ${error.message}` },
          { status: 500 }
        ))
      }
    }

    // ============= BACKUP SYSTEM =============
    if (route === '/backup/stats' && method === 'GET') {
      const [envanterler, calisanlar, zimmetler, departmanlar, envanterTipleri, auditLogs, digitalAssets, digitalAssetCategories] = await Promise.all([
        db.collection('envanterler').countDocuments({ deletedAt: null }),
        db.collection('calisanlar').countDocuments({ deletedAt: null }),
        db.collection('zimmetler').countDocuments({ deletedAt: null }),
        db.collection('departmanlar').countDocuments({ deletedAt: null }),
        db.collection('envanter_tipleri').countDocuments({ deletedAt: null }),
        db.collection('audit_logs').countDocuments({}),
        db.collection('dijital_varliklar').countDocuments({ deletedAt: null }),
        db.collection('dijital_varlik_kategorileri').countDocuments({ deletedAt: null })
      ])

      return handleCORS(NextResponse.json({
        envanterler,
        calisanlar,
        zimmetler,
        departmanlar,
        envanterTipleri,
        auditLogs,
        digitalAssets,
        digitalAssetCategories
      }))
    }

    if (route === '/backup/export' && method === 'GET') {
      const [envanterler, calisanlar, zimmetler, departmanlar, envanterTipleri, auditLogs, dijitalVarliklar, dijitalKategoriler, bakimKayitlari] = await Promise.all([
        db.collection('envanterler').find({ deletedAt: null }).toArray(),
        db.collection('calisanlar').find({ deletedAt: null }).toArray(),
        db.collection('zimmetler').find({ deletedAt: null }).toArray(),
        db.collection('departmanlar').find({ deletedAt: null }).toArray(),
        db.collection('envanter_tipleri').find({ deletedAt: null }).toArray(),
        db.collection('audit_logs').find({}).sort({ createdAt: -1 }).limit(1000).toArray(),
        db.collection('dijital_varliklar').find({ deletedAt: null }).toArray(),
        db.collection('dijital_varlik_kategorileri').find({ deletedAt: null }).toArray(),
        db.collection('bakim_kayitlari').find({ deletedAt: null }).toArray()
      ])

      // Remove MongoDB _id from all documents
      const cleanIds = (arr) => arr.map(({ _id, ...rest }) => rest)

      return handleCORS(NextResponse.json({
        version: '1.0',
        exportDate: new Date().toISOString(),
        data: {
          envanterler: cleanIds(envanterler),
          calisanlar: cleanIds(calisanlar),
          zimmetler: cleanIds(zimmetler),
          departmanlar: cleanIds(departmanlar),
          envanterTipleri: cleanIds(envanterTipleri),
          auditLogs: cleanIds(auditLogs),
          dijitalVarliklar: cleanIds(dijitalVarliklar),
          dijitalKategoriler: cleanIds(dijitalKategoriler),
          bakimKayitlari: cleanIds(bakimKayitlari)
        }
      }))
    }

    if (route === '/backup/import' && method === 'POST') {
      const body = await request.json()

      if (!body.version || !body.data) {
        return handleCORS(NextResponse.json(
          { error: "Geçersiz yedek dosyası formatı" },
          { status: 400 }
        ))
      }

      const { data } = body
      let totalImported = 0

      try {
        // Import each collection (upsert by id)
        const collections = [
          { name: 'envanterler', data: data.envanterler },
          { name: 'calisanlar', data: data.calisanlar },
          { name: 'zimmetler', data: data.zimmetler },
          { name: 'departmanlar', data: data.departmanlar },
          { name: 'envanter_tipleri', data: data.envanterTipleri },
          { name: 'dijital_varliklar', data: data.dijitalVarliklar },
          { name: 'dijital_varlik_kategorileri', data: data.dijitalKategoriler },
          { name: 'bakim_kayitlari', data: data.bakimKayitlari }
        ]

        for (const col of collections) {
          if (col.data && Array.isArray(col.data) && col.data.length > 0) {
            for (const item of col.data) {
              if (item.id) {
                await db.collection(col.name).updateOne(
                  { id: item.id },
                  { $set: item },
                  { upsert: true }
                )
                totalImported++
              }
            }
          }
        }

        return handleCORS(NextResponse.json({
          success: true,
          imported: { total: totalImported }
        }))
      } catch (error) {
        console.error('Backup import error:', error)
        return handleCORS(NextResponse.json(
          { error: `İçe aktarma hatası: ${error.message}` },
          { status: 500 }
        ))
      }
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
