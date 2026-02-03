import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, FlatList, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import client from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const DigitalAssetFormScreen = ({ route, navigation }) => {
  const { isEdit, assetId } = route.params || {};
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Data lists
  const [categories, setCategories] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    ad: '',
    kategoriId: '',
    hesapEmail: '',
    hesapKullaniciAdi: '',
    hesapSifre: '',
    keyBilgisi: '',
    envanterId: '',
    calisanId: '',
    lisansTipi: 'Süresiz',
    baslangicTarihi: new Date(),
    bitisTarihi: new Date(),
    durum: 'Aktif',
    notlar: ''
  });

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // UI State
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [catRes, invRes, empRes] = await Promise.all([
        client.get('/dijital-varlik-kategorileri'),
        client.get('/envanterler'),
        client.get('/calisanlar')
      ]);

      setCategories(catRes.data);
      // Filter computers/laptops usually? Web code does: 
      // e.envanterTipiAd?.toLowerCase().includes('laptop') || e.envanterTipiAd?.toLowerCase().includes('bilgisayar')
      // For mobile, let's just list all or meaningful ones.
      const computers = invRes.data.filter(e => 
         e.envanterTipiAd?.toLowerCase().includes('laptop') || 
         e.envanterTipiAd?.toLowerCase().includes('bilgisayar') ||
         e.envanterTipiAd?.toLowerCase().includes('masaüstü')
      );
      setInventories(computers.length > 0 ? computers : invRes.data);
      
      setEmployees(empRes.data.filter(c => c.durum === 'Aktif'));

      if (isEdit && assetId) {
        const assetRes = await client.get(`/dijital-varliklar/${assetId}`);
        const asset = assetRes.data;
        
        setFormData({
          ad: asset.ad,
          kategoriId: asset.kategoriId,
          hesapEmail: asset.hesapEmail || '',
          hesapKullaniciAdi: asset.hesapKullaniciAdi || '',
          hesapSifre: asset.hesapSifre || '',
          keyBilgisi: asset.keyBilgisi || '',
          envanterId: asset.envanterId || '',
          calisanId: asset.calisanId || '',
          lisansTipi: asset.lisansTipi || 'Süresiz',
          baslangicTarihi: asset.baslangicTarihi ? new Date(asset.baslangicTarihi) : new Date(),
          bitisTarihi: asset.bitisTarihi ? new Date(asset.bitisTarihi) : new Date(),
          durum: asset.durum || 'Aktif',
          notlar: asset.notlar || ''
        });

        // Pre-select dropwdowns
        setSelectedCategory(catRes.data.find(c => c.id === asset.kategoriId));
        setSelectedInventory(invRes.data.find(i => i.id === asset.envanterId));
        setSelectedEmployee(empRes.data.find(e => e.id === asset.calisanId));
      }

    } catch (error) {
      console.log('Error fetching form data:', error);
      Alert.alert('Hata', 'Veriler yüklenemedi.');
    } finally {
      setInitialLoading(false);
    }
  };

  const updateField = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.ad || !selectedCategory) {
      Alert.alert('Hata', 'Varlık adı ve kategori zorunludur.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        kategoriId: selectedCategory.id,
        envanterId: selectedInventory?.id || null,
        calisanId: selectedEmployee?.id || null,
        baslangicTarihi: formData.lisansTipi !== 'Süresiz' ? formData.baslangicTarihi.toISOString().split('T')[0] : null,
        bitisTarihi: formData.lisansTipi !== 'Süresiz' ? formData.bitisTarihi.toISOString().split('T')[0] : null,
        userId: user?.id,
        userName: user?.adSoyad
      };

      if (isEdit) {
        await client.put(`/dijital-varliklar/${assetId}`, payload);
        Alert.alert('Başarılı', 'Güncellendi.', [
          { text: 'Tamam', onPress: () => navigation.navigate('DigitalAssetDetail', { id: assetId, refresh: true }) }
        ]);
      } else {
        await client.post('/dijital-varliklar', payload);
        Alert.alert('Başarılı', 'Oluşturuldu.', [
          { text: 'Tamam', onPress: () => navigation.navigate('DigitalAssets', { refresh: true }) }
        ]);
      }
    } catch (error) {
       Alert.alert('Hata', error.response?.data?.error || 'Kaydetme başarısız.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (key, setShow) => (event, date) => {
    setShow(false);
    if (date) updateField(key, date);
  };

  const SelectionModal = ({ visible, onClose, data, onSelect, titleKey = 'ad', subtitleKey }) => (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seçiniz</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={data}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <View>
                   <Text style={styles.modalItemText}>{item[titleKey]}</Text>
                   {subtitleKey && <Text style={styles.modalItemSub}>{item[subtitleKey]}</Text>}
                </View>
                {/* Optional: Checkmark if selected */}
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.clearSelection} onPress={() => { onSelect(null); onClose(); }}>
            <Text style={styles.clearSelectionText}>Seçimi Temizle</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (initialLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#14b8a6" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>İptal</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Varlık Düzenle' : 'Yeni Varlık'}</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#14b8a6" /> : <Text style={styles.saveButtonText}>Kaydet</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Temel Bilgiler</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Varlık Adı *</Text>
            <TextInput 
              style={styles.input} 
              value={formData.ad} 
              onChangeText={t => updateField('ad', t)}
              placeholder="Örn: Adobe Photoshop"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Kategori *</Text>
            <TouchableOpacity style={styles.selectButton} onPress={() => setShowCategoryModal(true)}>
              <Text style={selectedCategory ? styles.selectText : styles.placeholderText}>
                {selectedCategory ? selectedCategory.ad : 'Kategori Seçiniz'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Durum</Text>
             <View style={styles.row}>
               {['Aktif', 'Pasif'].map(status => (
                 <TouchableOpacity 
                   key={status}
                   style={[styles.radioBtn, formData.durum === status && styles.activeRadio]}
                   onPress={() => updateField('durum', status)}
                 >
                   <Text style={[styles.radioText, formData.durum === status && styles.activeRadioText]}>{status}</Text>
                 </TouchableOpacity>
               ))}
             </View>
          </View>
        </View>

        {/* Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hesap Bilgileri</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput 
              style={styles.input} 
              value={formData.hesapEmail} 
              onChangeText={t => updateField('hesapEmail', t)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Kullanıcı Adı</Text>
            <TextInput 
              style={styles.input} 
              value={formData.hesapKullaniciAdi} 
              onChangeText={t => updateField('hesapKullaniciAdi', t)}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Şifre</Text>
            <View style={styles.passwordContainer}>
              <TextInput 
                style={styles.passwordInput} 
                value={formData.hesapSifre} 
                onChangeText={t => updateField('hesapSifre', t)}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Lisans Key / Seri No</Text>
            <TextInput 
              style={styles.input} 
              value={formData.keyBilgisi} 
              onChangeText={t => updateField('keyBilgisi', t)}
              placeholder="XXXX-XXXX-XXXX-XXXX"
            />
          </View>
        </View>

        {/* Usage Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kullanım</Text>
          
          <View style={styles.formGroup}>
             <Text style={styles.label}>Cihaz (Opsiyonel)</Text>
             <TouchableOpacity style={styles.selectButton} onPress={() => setShowInventoryModal(true)}>
              <Text style={selectedInventory ? styles.selectText : styles.placeholderText}>
                {selectedInventory ? `${selectedInventory.marka} ${selectedInventory.model}` : 'Cihaz Seçiniz'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
             <Text style={styles.label}>Kişi (Opsiyonel)</Text>
             <TouchableOpacity style={styles.selectButton} onPress={() => setShowEmployeeModal(true)}>
              <Text style={selectedEmployee ? styles.selectText : styles.placeholderText}>
                {selectedEmployee ? selectedEmployee.adSoyad : 'Kişi Seçiniz'}
              </Text>
               <Ionicons name="chevron-down" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* License Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lisans Süresi</Text>
           <View style={styles.formGroup}>
             <Text style={styles.label}>Lisans Tipi</Text>
             <View style={styles.row}>
               {['Süresiz', 'Yıllık', 'Aylık'].map(type => (
                 <TouchableOpacity 
                   key={type}
                   style={[styles.radioBtn, formData.lisansTipi === type && styles.activeRadio]}
                   onPress={() => updateField('lisansTipi', type)}
                 >
                   <Text style={[styles.radioText, formData.lisansTipi === type && styles.activeRadioText]}>{type}</Text>
                 </TouchableOpacity>
               ))}
             </View>
          </View>

          {formData.lisansTipi !== 'Süresiz' && (
            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Başlangıç</Text>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartDatePicker(true)}>
                  <Text>{formData.baslangicTarihi.toLocaleDateString('tr-TR')}</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Bitiş</Text>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndDatePicker(true)}>
                  <Text>{formData.bitisTarihi.toLocaleDateString('tr-TR')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Notlar</Text>
          <TextInput 
            style={[styles.input, { height: 80 }]} 
            value={formData.notlar} 
            onChangeText={t => updateField('notlar', t)}
            multiline
            textAlignVertical="top"
          />
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker value={formData.baslangicTarihi} mode="date" onChange={handleDateChange('baslangicTarihi', setShowStartDatePicker)} />
      )}
      {showEndDatePicker && (
        <DateTimePicker value={formData.bitisTarihi} mode="date" onChange={handleDateChange('bitisTarihi', setShowEndDatePicker)} />
      )}

      {/* Modals */}
      <SelectionModal 
        visible={showCategoryModal} 
        onClose={() => setShowCategoryModal(false)}
        data={categories}
        onSelect={setSelectedCategory}
      />
      <SelectionModal 
        visible={showInventoryModal} 
        onClose={() => setShowInventoryModal(false)}
        data={inventories}
        onSelect={setSelectedInventory}
        titleKey="marka" // using marka as main, will fix render in SelectionModal
        subtitleKey="model" // Creating custom title logic might be better but let's assume one key
      />
      {/* 
        Fixing Inventory modal display to show "Marka Model" 
        Actually SelectionModal uses `titleKey` prop. 
        Inventories have `marka` and `model`.
        I should probably pass a formatted list or improve SelectionModal.
        Let's improve SelectionModal usage by passing a prop or let it handle item text customly?
        For quick fix, I'll pass `titleKey="marka"` but `model` won't show efficiently.
        Wait, I can just modify `inventories` state or pass a wrapper.
        Let's just use `marka` for now or map it.
      */}
      <SelectionModal 
        visible={showEmployeeModal} 
        onClose={() => setShowEmployeeModal(false)}
        data={employees}
        onSelect={setSelectedEmployee}
        titleKey="adSoyad"
      />

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  backButtonText: { color: '#ef4444', fontSize: 16 },
  saveButtonText: { color: '#14b8a6', fontSize: 16, fontWeight: 'bold' },
  content: { padding: 16 },
  section: { marginBottom: 24, backgroundColor: 'white', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 8 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  eyeBtn: { padding: 12 },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
  },
  selectText: { fontSize: 16, color: '#0f172a' },
  placeholderText: { fontSize: 16, color: '#94a3b8' },
  row: { flexDirection: 'row' },
  radioBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  activeRadio: { backgroundColor: '#14b8a6', borderColor: '#14b8a6' },
  radioText: { color: '#64748b' },
  activeRadioText: { color: 'white', fontWeight: 'bold' },
  dateButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalItemText: { fontSize: 16, color: '#0f172a' },
  modalItemSub: { fontSize: 12, color: '#64748b' },
  clearSelection: { padding: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  clearSelectionText: { color: '#ef4444' },
});

export default DigitalAssetFormScreen;
