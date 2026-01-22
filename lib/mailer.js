'use server'

import nodemailer from 'nodemailer'

/**
 * Get mail settings from database
 */
export async function getMailSettings(db) {
    const settings = await db.collection('system_settings').findOne({ id: 'mail_settings' })
    return settings || {
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpPassword: '',
        fromEmail: '',
        fromName: 'Halk TV Envanter Sistemi',
        enableSsl: true
    }
}

/**
 * Create nodemailer transporter from settings
 */
export function createTransporter(settings) {
    return nodemailer.createTransport({
        host: settings.smtpHost,
        port: settings.smtpPort,
        secure: settings.enableSsl,
        auth: {
            user: settings.smtpUser,
            pass: settings.smtpPassword
        }
    })
}

/**
 * Send email using stored SMTP settings
 * @param {Object} db - MongoDB database connection
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 */
export async function sendMail(db, to, subject, html) {
    try {
        const settings = await getMailSettings(db)

        if (!settings.smtpHost || !settings.smtpUser) {
            throw new Error('Mail ayarları yapılandırılmamış')
        }

        const transporter = createTransporter(settings)

        const result = await transporter.sendMail({
            from: `"${settings.fromName}" <${settings.fromEmail}>`,
            to,
            subject,
            html
        })

        return { success: true, messageId: result.messageId }
    } catch (error) {
        console.error('Mail gönderimi başarısız:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Send maintenance completion notification to admins
 * @param {Object} db - MongoDB database connection
 * @param {Object} bakimKayit - Maintenance record
 * @param {Object} envanter - Inventory item
 */
export async function sendMaintenanceNotification(db, bakimKayit, envanter) {
    try {
        // Get all admins and managers
        const admins = await db.collection('calisanlar')
            .find({
                $or: [{ adminYetkisi: true }, { yoneticiYetkisi: true }],
                deletedAt: null,
                email: { $exists: true, $ne: '' }
            })
            .toArray()

        if (admins.length === 0) {
            console.log('Bildirim gönderilecek admin/yönetici bulunamadı')
            return { success: false, error: 'Bildirim gönderilecek kullanıcı yok' }
        }

        const envanterAd = envanter ? `${envanter.marka} ${envanter.model}` : 'Bilinmeyen Envanter'
        const servisFirma = bakimKayit.servisFirma || 'Bilinmeyen Firma'

        const subject = 'Servis Bildirimi'
        const html = `
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
              <li>Arıza Türü: ${bakimKayit.arizaTuru || '-'}</li>
              <li>Bitiş Tarihi: ${bakimKayit.bitisTarihi ? new Date(bakimKayit.bitisTarihi).toLocaleDateString('tr-TR') : '-'}</li>
              ${bakimKayit.maliyet ? `<li>Maliyet: ${bakimKayit.maliyet} ${bakimKayit.paraBirimi || 'TRY'}</li>` : ''}
            </ul>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            Bu otomatik bir bildirimdir. Lütfen yanıtlamayınız.
          </p>
        </div>
        <div style="background-color: #e5e7eb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
          © ${new Date().getFullYear()} Halk TV - Envanter Yönetim Sistemi
        </div>
      </div>
    `

        // Send to all admins
        const results = await Promise.all(
            admins.map(admin => sendMail(db, admin.email, subject, html))
        )

        const successCount = results.filter(r => r.success).length
        console.log(`Bakım bildirimi gönderildi: ${successCount}/${admins.length} başarılı`)

        return { success: true, sent: successCount, total: admins.length }
    } catch (error) {
        console.error('Bakım bildirimi gönderilemedi:', error)
        return { success: false, error: error.message }
    }
}
