# HALK_v8.1 - Zimmet ve Envanter Takip Sistemi

Web tabanlı bir zimmet ve envanter takip sistemi. İşyerindeki cihazları çalışanlara zimmetleyip takip edebilirsiniz.

## Özellikler

### ✅ Tamamlanan Özellikler

#### 1. Dashboard (Anasayfa)
- Toplam envanter sayısı
- Zimmetli envanter sayısı
- Depodaki envanter sayısı
- Arızalı/Kayıp envanter sayısı
- Son 10 zimmet hareketi listesi
- İstatistik kartları (yüzde göstergeli)

#### 2. Departman Yönetimi
- Departman listesi (arama, sıralama)
- Yeni departman ekleme
- Departman düzenleme
- Departman silme (soft delete)
- Form validasyonları (benzersiz departman adı)

#### 3. Çalışan Yönetimi
- Çalışan listesi (arama, filtreleme)
- Yeni çalışan ekleme
- Çalışan düzenleme
- Çalışan silme (soft delete)
- Departman ilişkilendirme
- Durum yönetimi (Aktif/Pasif)
- Email benzersizlik kontrolü

#### 4. Envanter Tipi Yönetimi
- Envanter tipi listesi
- Her tip için istatistikler (Toplam, Zimmetli, Depoda, Arızalı/Kayıp)
- Genişletilebilir satırlar (tip bazında cihaz listesi)
- Yeni envanter tipi ekleme
- Envanter tipi düzenleme
- Envanter tipi silme (soft delete)

#### 5. Envanter Yönetimi
- Envanter listesi (arama, filtreleme)
- Tip bazlı filtreleme
- Durum bazlı filtreleme (Depoda, Zimmetli, Arızalı, Kayıp)
- Zimmet bilgisi gösterimi (zimmetli kişi, tarih)
- Yeni envanter ekleme
- Envanter düzenleme
- Envanter silme (soft delete)
- CSV export özelliği
- Seri numarası benzersizlik kontrolü

#### 6. Zimmet Yönetimi
- Zimmet listesi (arama, filtreleme)
- Detaylı envanter ve çalışan bilgileri
- Yeni zimmet oluşturma
- İade alma işlemi
- PDF export (zimmet formu - imza alanı ile)
- Zimmet durumu takibi (Aktif/İade Edildi)
- Otomatik envanter durum güncellemesi

#### 7. PDF Export
- Zimmet detayları
- Çalışan bilgileri
- Envanter bilgileri
- İmza alanı
- Profesyonel görünüm

### 📊 Veri Modeli

#### Departman
- id, ad (unique), aciklama
- createdAt, updatedAt, deletedAt

#### Çalışan
- id, adSoyad, email (unique), telefon
- departmanId (FK), durum (Aktif/Pasif)
- createdAt, updatedAt, deletedAt

#### EnvanterTipi
- id, ad (unique), aciklama
- createdAt, updatedAt, deletedAt

#### Envanter
- id, envanterTipiId (FK)
- marka, model, seriNumarasi (unique)
- durum (Depoda/Zimmetli/Arızalı/Kayıp)
- notlar
- createdAt, updatedAt, deletedAt

#### Zimmet
- id, envanterId (FK), calisanId (FK)
- zimmetTarihi, iadeTarihi
- durum (Aktif/İade Edildi)
- aciklama
- createdAt, updatedAt, deletedAt

## İş Kuralları

1. **Benzersizlik Kontrolü**
   - Departman adları benzersiz olmalı
   - Email adresleri benzersiz olmalı
   - Seri numaraları benzersiz olmalı

2. **Zimmet Kuralları**
   - Bir envanter aynı anda sadece 1 kişiye zimmetli olabilir
   - Zimmet oluşturulunca envanter "Zimmetli" durumuna geçer
   - İade edilince zimmet "İade Edildi" olur
   - Envanter durumu kullanıcı seçimine göre güncellenir (Depoda/Arızalı/Kayıp)

3. **Soft Delete**
   - Tüm silme işlemleri geri alınabilir (soft delete)
   - Veriler fiziksel olarak silinmez, sadece deletedAt alanı güncellenir

## Teknoloji Stack

- **Frontend:** Next.js 14 (App Router), React
- **Backend:** Next.js API Routes
- **Database:** MongoDB
- **UI Framework:** Tailwind CSS + shadcn/ui
- **Icons:** Lucide React
- **PDF:** jsPDF

## Kurulum

### Gereksinimler
- Node.js 18+
- MongoDB
- Yarn

### Adımlar

1. Bağımlılıkları yükleyin:
\`\`\`bash
yarn install
\`\`\`

2. Environment variables'ı ayarlayın (.env):
\`\`\`env
MONGO_URL=mongodb://localhost:27017
DB_NAME=zimmet_db
NEXT_PUBLIC_BASE_URL=http://localhost:3000
CORS_ORIGINS=*
\`\`\`

3. Örnek verileri yükleyin:
\`\`\`bash
curl -X POST http://localhost:3000/api/seed
\`\`\`

4. Uygulamayı başlatın:
\`\`\`bash
yarn dev
\`\`\`

5. Tarayıcıda açın: http://localhost:3000

## API Endpoints

### Dashboard
- \`GET /api/dashboard\` - Dashboard istatistikleri ve son zimmetler

### Departmanlar
- \`GET /api/departmanlar\` - Tüm departmanları listele
- \`POST /api/departmanlar\` - Yeni departman oluştur
- \`PUT /api/departmanlar/:id\` - Departman güncelle
- \`DELETE /api/departmanlar/:id\` - Departman sil (soft delete)

### Çalışanlar
- \`GET /api/calisanlar\` - Tüm çalışanları listele
- \`POST /api/calisanlar\` - Yeni çalışan oluştur
- \`PUT /api/calisanlar/:id\` - Çalışan güncelle
- \`DELETE /api/calisanlar/:id\` - Çalışan sil (soft delete)

### Envanter Tipleri
- \`GET /api/envanter-tipleri\` - Tüm envanter tiplerini listele
- \`POST /api/envanter-tipleri\` - Yeni envanter tipi oluştur
- \`PUT /api/envanter-tipleri/:id\` - Envanter tipi güncelle
- \`DELETE /api/envanter-tipleri/:id\` - Envanter tipi sil (soft delete)

### Envanterler
- \`GET /api/envanterler\` - Tüm envanterleri listele
- \`POST /api/envanterler\` - Yeni envanter oluştur
- \`PUT /api/envanterler/:id\` - Envanter güncelle
- \`DELETE /api/envanterler/:id\` - Envanter sil (soft delete)

### Zimmetler
- \`GET /api/zimmetler\` - Tüm zimmetleri listele
- \`POST /api/zimmetler\` - Yeni zimmet oluştur
- \`POST /api/zimmetler/iade\` - Zimmet iade et
- \`DELETE /api/zimmetler/:id\` - Zimmet sil (soft delete)

### Seed Data
- \`POST /api/seed\` - Örnek verileri yükle

## Örnek Veriler

Seed komutu çalıştırıldığında aşağıdaki veriler oluşturulur:

- **4 Departman:** IT, İnsan Kaynakları, Muhasebe, Pazarlama
- **4 Çalışan:** Her departmanda en az 1 çalışan
- **4 Envanter Tipi:** Laptop, Telefon, Monitör, Klavye
- **5 Envanter:** Farklı markaların cihazları
- **2 Aktif Zimmet:** Örnek zimmet kayıtları

## Kullanım

### Yeni Zimmet Oluşturma

1. Sol menüden "Envanter ve Zimmet" > "Zimmetler" sayfasına gidin
2. "Yeni Zimmet" butonuna tıklayın
3. Formu doldurun:
   - Envanter seçin (sadece depodaki envanterler gösterilir)
   - Çalışan seçin (sadece aktif çalışanlar gösterilir)
   - Zimmet tarihini girin
   - İsteğe bağlı açıklama ekleyin
4. "Oluştur" butonuna tıklayın

### Zimmet İade Etme

1. Zimmetler sayfasında aktif bir zimmeti bulun
2. İşlemler sütununda "İade Al" butonuna tıklayın
3. İade formunu doldurun:
   - İade tarihini girin
   - Envanter durumunu seçin (Depoda/Arızalı/Kayıp)
4. "İade Al" butonuna tıklayın

### PDF Export

1. Zimmetler sayfasında herhangi bir zimmeti bulun
2. İşlemler sütununda PDF ikonu butonuna tıklayın
3. PDF otomatik olarak indirilecektir

## Proje Yapısı

\`\`\`
/app/
├── app/
│   ├── api/[[...path]]/route.js  # Backend API
│   ├── page.js                    # Ana uygulama
│   ├── layout.js                  # Root layout
│   └── globals.css                # Global stiller
├── components/
│   ├── layout/
│   │   ├── Sidebar.jsx            # Sol menü
│   │   └── Header.jsx             # Üst bar
│   ├── pages/
│   │   ├── Dashboard.jsx          # Dashboard
│   │   ├── Departmanlar.jsx       # Departman yönetimi
│   │   ├── Calisanlar.jsx         # Çalışan yönetimi
│   │   ├── EnvanterTipleri.jsx    # Envanter tipi yönetimi
│   │   ├── Envanterler.jsx        # Envanter yönetimi
│   │   ├── Zimmetler.jsx          # Zimmet yönetimi
│   │   └── Ayarlar.jsx            # Ayarlar (placeholder)
│   └── ui/                        # shadcn/ui components
├── lib/
│   └── utils.js                   # Utility functions
├── public/
│   ├── logo.png                   # Logo
│   └── logo-white.svg             # Logo (beyaz)
├── .env                           # Environment variables
├── package.json                   # Dependencies
├── tailwind.config.js             # Tailwind config
└── README.md                      # Bu dosya
\`\`\`

## Lisans

MIT
