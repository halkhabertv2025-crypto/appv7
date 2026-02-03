import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import client from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const MaintenanceFormScreen = ({ route, navigation }) => {
  const { isEdit, recordId } = route.params || {};
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const [inventories, setInventories] = useState([]);
  
  // Form State
  const [formData, setFormData] = useState({
    envanterId: '',
    arizaTuru: '',
    aciklama: '',
    bildirilenTarih: new Date(),
    servisFirma: '',
    maliyet: '',
    paraBirimi: 'TRY',
    baslangicTarihi: null,
    bitisTarihi: null,
    durum: 'Beklemede',
    notlar: ''
  });

  const [selectedInventory, setSelectedInventory] = useState(null);

  // UI State
  const [showReportDatePicker, setShowReportDatePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  // Modals
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  
  // Search state for inventory modal
  const [inventorySearch, setInventorySearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const invRes = await client.get('/envanterler');
      setInventories(invRes.data);

      if (isEdit && recordId) {
        const res = await client.get(`/bakim-kayitlari/${recordId}`);
        const data = res.data;
        
        setFormData({
          envanterId: data.envanterId,
          arizaTuru: data.arizaTuru,
          aciklama: data.aciklama || '',
          bildirilenTarih: data.bildirilenTarih ? new Date(data.bildirilenTarih) : new Date(),
          servisFirma: data.servisFirma || '',
          maliyet: data.maliyet ? data.maliyet.toString() : '',
          paraBirimi: data.paraBirimi || 'TRY',
          baslangicTarihi: data.baslangicTarihi ? new Date(data.baslangicTarihi) : null,
          bitisTarihi: data.bitisTarihi ? new Date(data.bitisTarihi) : null,
          durum: data.durum || 'Beklemede',
          notlar: data.notlar || ''
        });

        setSelectedInventory(invRes.data.find(i => i.id === data.envanterId));
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
    if (!selectedInventory || !formData.arizaTuru) {
      Alert.alert('Hata', 'Envanter ve Arıza Türü zorunludur.');
      return;
    }

    setLoading(true);
    try {
        const payload = {
        ...formData,
        envanterId: selectedInventory.id,
        maliyet: parseFloat(formData.maliyet) || 0,
        bildirilenTarih: formData.bildirilenTarih.toISOString().split('T')[0],
        baslangicTarihi: formData.baslangicTarihi ? formData.baslangicTarihi.toISOString().split('T')[0] : null,
        bitisTarihi: formData.bitisTarihi ? formData.bitisTarihi.toISOString().split('T')[0] : null,
        userId: user?.id,
        userName: user?.adSoyad
      };

      if (isEdit) {
        await client.put(`/bakim-kayitlari/${recordId}`, payload);
        Alert.alert('Başarılı', 'Kayıt güncellendi.', [
          { text: 'Tamam', onPress: () => navigation.navigate('MaintenanceDetail', { id: recordId, refresh: true }) }
        ]);
      } else {
        await client.post('/bakim-kayitlari', payload);
        Alert.alert('Başarılı', 'Kayıt oluşturuldu.', [
          { text: 'Tamam', onPress: () => navigation.navigate('Maintenance', { refresh: true }) }
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

  // Helper Modal
  const SelectionModal = ({ visible, onClose, data, onSelect, titleKey = 'ad', searchEnabled = false }) => {
     const [search, setSearch] = useState('');
     
     const filteredData = searchEnabled 
        ? data.filter(item => 
             item[titleKey]?.toLowerCase().includes(search.toLowerCase()) || 
             item.marka?.toLowerCase().includes(search.toLowerCase()) ||
             item.model?.toLowerCase().includes(search.toLowerCase()) ||
             item.seriNumarasi?.toLowerCase().includes(search.toLowerCase())
          )
        : data;

     return (
        <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Seçiniz</Text>
                <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#0f172a" />
                </TouchableOpacity>
            </View>
            
            {searchEnabled && (
                <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                    <TextInput 
                        style={styles.input} 
                        placeholder="Ara..." 
                        value={search} 
                        onChangeText={setSearch} 
                    />
                </View>
            )}

            <FlatList
                data={filteredData}
                keyExtractor={item => (item.id || item.value).toString()}
                renderItem={({ item }) => (
                <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                        onSelect(item);
                        onClose();
                    }}
                >
                   {/* Custom render for inventory or simple text */}
                   {item.marka ? (
                       <View>
                           <Text style={styles.modalItemText}>{item.envanterTipiAd} {item.marka} {item.model}</Text>
                           <Text style={styles.modalItemSub}>{item.seriNumarasi}</Text>
                       </View>
                   ) : (
                       <Text style={styles.modalItemText}>{item[titleKey] || item.label || item}</Text>
                   )}
                </TouchableOpacity>
                )}
            />
            </View>
        </View>
        </Modal>
     );
  };

  if (initialLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#14b8a6" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>İptal</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Kayıt Düzenle' : 'Yeni Kayıt'}</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#14b8a6" /> : <Text style={styles.saveButtonText}>Kaydet</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.section}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Envanter *</Text>
            <TouchableOpacity style={styles.selectButton} onPress={() => setShowInventoryModal(true)}>
              <Text style={selectedInventory ? styles.selectText : styles.placeholderText}>
                {selectedInventory ? `${selectedInventory.marka} ${selectedInventory.model}` : 'Envanter Seçiniz'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Arıza Türü *</Text>
            <TouchableOpacity style={styles.selectButton} onPress={() => setShowTypeModal(true)}>
              <Text style={formData.arizaTuru ? styles.selectText : styles.placeholderText}>
                {formData.arizaTuru || 'Tür Seçiniz'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
             <Text style={styles.label}>Durum</Text>
             <TouchableOpacity style={styles.selectButton} onPress={() => setShowStatusModal(true)}>
              <Text style={styles.selectText}>{formData.durum}</Text>
              <Ionicons name="chevron-down" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
          
           <View style={styles.formGroup}>
            <Text style={styles.label}>Açıklama</Text>
            <TextInput 
              style={[styles.input, { height: 60 }]} 
              value={formData.aciklama} 
              onChangeText={t => updateField('aciklama', t)}
              multiline
              textAlignVertical="top"
              placeholder="Arıza detayları..."
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Servis Detayları</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Servis Firması</Text>
            <TextInput 
              style={styles.input} 
              value={formData.servisFirma} 
              onChangeText={t => updateField('servisFirma', t)}
            />
          </View>

          <View style={styles.row}>
             <View style={[styles.formGroup, { flex: 2, marginRight: 8 }]}>
                <Text style={styles.label}>Maliyet</Text>
                <TextInput 
                    style={styles.input} 
                    value={formData.maliyet} 
                    onChangeText={t => updateField('maliyet', t)}
                    keyboardType="numeric"
                    placeholder="0.00"
                />
             </View>
             <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Para Birimi</Text>
                 <TouchableOpacity style={styles.selectButton} onPress={() => setShowCurrencyModal(true)}>
                    <Text style={styles.selectText}>{formData.paraBirimi}</Text>
                    <Ionicons name="chevron-down" size={20} color="#64748b" />
                </TouchableOpacity>
             </View>
          </View>

          <View style={styles.row}>
             <View style={[styles.formGroup, { flex: 1, marginRight: 4 }]}>
                <Text style={styles.label}>Bildirim Tarihi</Text>
                 <TouchableOpacity style={styles.dateButton} onPress={() => setShowReportDatePicker(true)}>
                  <Text>{formData.bildirilenTarih.toLocaleDateString('tr-TR')}</Text>
                </TouchableOpacity>
             </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 4 }]}>
                <Text style={styles.label}>Servis Başlangıç</Text>
                 <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartDatePicker(true)}>
                  <Text>{formData.baslangicTarihi ? formData.baslangicTarihi.toLocaleDateString('tr-TR') : 'Seçiniz'}</Text>
                </TouchableOpacity>
             </View>
             
              <View style={[styles.formGroup, { flex: 1, marginLeft: 4 }]}>
                <Text style={styles.label}>Servis Bitiş</Text>
                 <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndDatePicker(true)}>
                  <Text>{formData.bitisTarihi ? formData.bitisTarihi.toLocaleDateString('tr-TR') : 'Seçiniz'}</Text>
                </TouchableOpacity>
             </View>
          </View>
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
      {showReportDatePicker && (
        <DateTimePicker value={formData.bildirilenTarih} mode="date" onChange={handleDateChange('bildirilenTarih', setShowReportDatePicker)} />
      )}
      {showStartDatePicker && (
        <DateTimePicker value={formData.baslangicTarihi || new Date()} mode="date" onChange={handleDateChange('baslangicTarihi', setShowStartDatePicker)} />
      )}
      {showEndDatePicker && (
        <DateTimePicker value={formData.bitisTarihi || new Date()} mode="date" onChange={handleDateChange('bitisTarihi', setShowEndDatePicker)} />
      )}

      {/* Modals */}
      <SelectionModal 
        visible={showInventoryModal} 
        onClose={() => setShowInventoryModal(false)}
        data={inventories}
        onSelect={setSelectedInventory}
        searchEnabled
      />
      <SelectionModal 
        visible={showTypeModal} 
        onClose={() => setShowTypeModal(false)}
        data={['Donanım', 'Yazılım', 'Hasar', 'Bakım']}
        onSelect={(item) => updateField('arizaTuru', item)}
      />
      <SelectionModal 
        visible={showStatusModal} 
        onClose={() => setShowStatusModal(false)}
        data={['Beklemede', 'Serviste', 'Tamamlandı', 'İptal']}
        onSelect={(item) => updateField('durum', item)}
      />
      <SelectionModal 
        visible={showCurrencyModal} 
        onClose={() => setShowCurrencyModal(false)}
        data={['TRY', 'USD', 'EUR', 'GBP']}
        onSelect={(item) => updateField('paraBirimi', item)}
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
  section: { marginBottom: 16, backgroundColor: 'white', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 8 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
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
  selectText: { fontSize: 14, color: '#0f172a' },
  placeholderText: { fontSize: 14, color: '#94a3b8' },
  row: { flexDirection: 'row' },
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
});

export default MaintenanceFormScreen;
