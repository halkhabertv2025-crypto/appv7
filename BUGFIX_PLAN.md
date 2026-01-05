# Bug Fix & Enhancement Implementation Plan

## 🔍 Root Cause Analysis Summary

### Bug #1: Zimmet İade Hatası
**Problem:** "iadeAlanYetkiliId zorunludur" hatası
**Kök Neden:** Zimmetler.jsx line 177'de form state'inde gereksiz `iadeAlanYetkiliId: ''` field'ı
**Çözüm:** Form state'inden kaldır, sadece handleIade'de user.id kullan

### Bug #2-3: Zimmetli Envanter Durum Değişikliği
**Problem:** Zimmetli cihazın durumu değiştirilebiliyor
**Kök Neden:** Backend'de envanter update endpoint'inde zimmet kontrolü yok
**Çözüm:** 
- Backend: Envanter update öncesi aktif zimmet kontrolü
- Frontend: UI'da durum dropdown disabled (zimmetli ise)

### Bug #4: Çalışan Silme Kısıtı
**Problem:** Zimmetli çalışan silinebiliyor
**Kök Neden:** DELETE endpoint'inde aktif zimmet kontrolü yok
**Çözüm:** Silme öncesi aktif zimmet kontrolü

### Bug #5: Admin Yetkilendirme
**Problem:** Backend'de admin kontrolü eksik
**Çözüm:** Rol atama endpoint'lerinde admin kontrolü

### Bug #6: Audit Log
**Problem:** İşlem geçmişi yok
**Çözüm:** Yeni AuditLog collection + helper fonksiyon

### Bug #7: Aksesuar Yönetimi
**Problem:** Envanter aksesuarları yok
**Çözüm:** Yeni InventoryAccessory collection + UI

## 📝 Implementation Checklist

### Phase 1: Critical Bug Fixes (P0)
- [x] #1: Fix zimmet iade validation
- [ ] #2-3: Zimmetli envanter durum kısıtı
- [ ] #4: Çalışan silme kısıtı

### Phase 2: Security & RBAC (P0)
- [ ] #5: Admin yetkilendirme

### Phase 3: New Features (P1)
- [ ] #6: Audit log
- [ ] #7: Aksesuar yönetimi

## 🗄️ Database Schema Changes

### AuditLog Collection
```javascript
{
  id: UUID,
  actorUserId: UUID,
  actorUserName: String,
  actionType: String, // CREATE_EMPLOYEE, UPDATE_INVENTORY, etc.
  entityType: String, // Employee, Inventory, Zimmet, etc.
  entityId: UUID,
  details: JSON, // {before, after, metadata}
  createdAt: Date
}
```

### InventoryAccessory Collection
```javascript
{
  id: UUID,
  inventoryId: UUID (FK),
  ad: String,
  marka: String (optional),
  model: String (optional),
  seriNumarasi: String (optional, unique),
  durum: String, // Depoda, Zimmetli, Arızalı, Kayıp
  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date
}
```

## 🔧 API Changes

### Modified Endpoints
1. `PUT /api/envanterler/:id` - Add zimmet check
2. `DELETE /api/calisanlar/:id` - Add aktif zimmet check
3. `POST /api/zimmetler/iade` - Already correct, just fix frontend
4. `POST /api/calisanlar` - Add admin check for role assignment
5. `PUT /api/calisanlar/:id` - Add admin check for role changes

### New Endpoints
1. `GET /api/audit-logs` - List audit logs with filters
2. `POST /api/envanterler/:id/accessories` - Add accessory
3. `GET /api/envanterler/:id/accessories` - List accessories
4. `PUT /api/envanterler/:id/accessories/:accessoryId` - Update accessory
5. `DELETE /api/envanterler/:id/accessories/:accessoryId` - Delete accessory

## 🎨 Frontend Changes

### Components to Update
1. **Zimmetler.jsx**
   - Remove iadeAlanYetkiliId from form state
   
2. **Envanterler.jsx**
   - Disable durum dropdown if zimmetli
   - Add accessories section
   
3. **Calisanlar.jsx**
   - Show error on delete if has aktif zimmet
   - Hide role assignment if not admin
   
4. **Ayarlar.jsx**
   - Add Audit Log tab

## ✅ Test Plan

### Unit Tests
1. Zimmet iade validation
2. Envanter durum değişikliği kontrolü
3. Çalışan silme kontrolü
4. Admin yetkilendirme
5. Audit log creation

### Integration Tests
1. Full zimmet iade flow
2. Zimmetli envanter durum değiştirme (should fail)
3. Zimmetli çalışan silme (should fail)
4. Non-admin rol atama (should fail)
5. Audit log recording on all actions

### E2E Tests
1. Complete zimmet lifecycle with accessories
2. Audit log viewing and filtering
3. Multi-accessory zimmet flow
