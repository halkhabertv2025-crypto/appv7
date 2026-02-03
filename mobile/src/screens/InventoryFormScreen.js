import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import client from '../api/client';
import { Ionicons } from '@expo/vector-icons';

const InventoryFormScreen = ({ route, navigation }) => {
  const { isEdit, inventoryId } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Financial State
  const [alisFiyati, setAlisFiyati] = useState('');
  const [paraBirimi, setParaBirimi] = useState('TRY');
  const [durum, setDurum] = useState('Depoda');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const currencyOptions = [{ id: 'TRY', ad: 'TRY' }, { id: 'USD', ad: 'USD' }, { id: 'EUR', ad: 'EUR' }, { id: 'GBP', ad: 'GBP' }];
  const statusOptions = [{ id: 'Depoda', ad: 'Depoda' }, { id: 'Arızalı', ad: 'Arızalı' }, { id: 'Kayıp', ad: 'Kayıp' }, { id: 'Servis', ad: 'Servis' }];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [typesRes, deptsRes] = await Promise.all([
        client.get('/envanterler/tipleri'),
        client.get('/departmanlar')
      ]);

      setTypes(typesRes.data);
      setDepartments(deptsRes.data);

      if (isEdit && inventoryId) {
        const invRes = await client.get(`/envanterler/${inventoryId}`);
        const data = invRes.data;
        setMarka(data.marka);
        setModel(data.model);
        setSeriNumarasi(data.seriNumarasi);
        setAlisFiyati(data.alisFiyati ? data.alisFiyati.toString() : '');
        setParaBirimi(data.paraBirimi || 'TRY');
        setDurum(data.durum || 'Depoda');

        // Find matching type
        const type = typesRes.data.find(t => t.ad === data.envanterTipiAd);
        if (type) setSelectedType(type);
        else if (data.envanterTipiId) {
          const typeById = typesRes.data.find(t => t.id === data.envanterTipiId);
          if (typeById) setSelectedType(typeById);
        }

        if (data.alimTarihi) setAlimTarihi(new Date(data.alimTarihi));
        if (data.garantiBitisTarihi) setGarantiTarihi(new Date(data.garantiBitisTarihi));
      }
    } catch (error) {
      console.log('Error fetching form data:', error);
      Alert.alert('Hata', 'Veriler yüklenemedi.');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!marka || !model || !seriNumarasi || !selectedType) {
      Alert.alert('Hata', 'Lütfen zorunlu alanları doldurun (Marka, Model, Seri No, Tip).');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        marka,
        model,
        seriNumarasi,
        envanterTipiId: selectedType.id,
        alimTarihi: alimTarihi.toISOString().split('T')[0],
        garantiBitisTarihi: garantiTarihi.toISOString().split('T')[0],
        alisFiyati: alisFiyati,
        paraBirimi: paraBirimi,
        durum: durum
      };

      if (isEdit) {
        // Handle logic if status changed (e.g. log status change) - handled by Select? 
        // Backend handles audit log usually.
        await client.put(`/envanterler/${inventoryId}`, payload);

        // If status changed to Servis, auto create maintenance record request logic is in Web
        // Should we assume backend handles it? Web code did it explicitly.
        // Let's implement it here if needed, but for now stick to updating inventory.

        Alert.alert('Başarılı', 'Envanter güncellendi.', [
          { text: 'Tamam', onPress: () => navigation.navigate('InventoryDetail', { id: inventoryId, refresh: true }) }
        ]);
      } else {
        const res = await client.post('/envanterler', payload);
        Alert.alert('Başarılı', 'Yeni envanter oluşturuldu.', [
          { text: 'Tamam', onPress: () => navigation.navigate('InventoryList', { refresh: true }) }
        ]);
      }
    } catch (error) {
      console.log('Save error:', error);
      Alert.alert('Hata', error.response?.data?.error || 'Kaydetme işlemi başarısız.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (setter, visibilitySetter) => (event, date) => {
    visibilitySetter(false);
    if (date) setter(date);
  };

  // Helper for Selection Modal
  const SelectionModal = ({ visible, onClose, data, onSelect, titleKey = 'ad' }) => (
    <Modal visible={visible} animationType="slide" transparent={true}>
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
                <Text style={styles.modalItemText}>{item[titleKey]}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  if (initialLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>İptal</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Envanter Düzenle' : 'Yeni Envanter'}</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#14b8a6" />
          ) : (
            <Text style={styles.saveButtonText}>Kaydet</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Marka</Text>
          <TextInput style={styles.input} value={marka} onChangeText={setMarka} placeholder="Örn: Apple" />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Model</Text>
          <TextInput style={styles.input} value={model} onChangeText={setModel} placeholder="Örn: MacBook Pro M1" />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Seri Numarası</Text>
          <TextInput style={styles.input} value={seriNumarasi} onChangeText={setSeriNumarasi} placeholder="Seri no giriniz" />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Envanter Tipi</Text>
          <TouchableOpacity style={styles.selectButton} onPress={() => setShowTypeModal(true)}>
            <Text style={selectedType ? styles.selectText : styles.placeholderText}>
              {selectedType ? selectedType.ad : 'Tip Seçiniz'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Alım Tarihi</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowAlimPicker(true)}>
              <Text>{alimTarihi.toLocaleDateString('tr-TR')}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Garanti Bitiş</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowGarantiPicker(true)}>
              <Text>{garantiTarihi.toLocaleDateString('tr-TR')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showAlimPicker && (
          <DateTimePicker value={alimTarihi} mode="date" onChange={handleDateChange(setAlimTarihi, setShowAlimPicker)} />
        )}
        {showGarantiPicker && (
          <DateTimePicker value={garantiTarihi} mode="date" onChange={handleDateChange(setGarantiTarihi, setShowGarantiPicker)} />
        )}

        {/* Financial Info */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>Finansal Bilgiler</Text>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 2, marginRight: 8 }]}>
            <Text style={styles.label}>Alış Fiyatı</Text>
            <TextInput
              style={styles.input}
              value={alisFiyati}
              onChangeText={setAlisFiyati}
              placeholder="0.00"
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>PB</Text>
            <TouchableOpacity style={styles.selectButton} onPress={() => setShowCurrencyModal(true)}>
              <Text style={styles.selectText}>{paraBirimi}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Durum</Text>
          <TouchableOpacity style={styles.selectButton} onPress={() => setShowStatusModal(true)}>
            <Text style={styles.selectText}>{durum}</Text>
            <Ionicons name="chevron-down" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

      </ScrollView>

      <SelectionModal
        visible={showTypeModal}
        onClose={() => setShowTypeModal(false)}
        data={types}
        onSelect={setSelectedType}
      />

      <SelectionModal
        visible={showCurrencyModal}
        onClose={() => setShowCurrencyModal(false)}
        data={currencyOptions}
        onSelect={(item) => setParaBirimi(item.id)}
      />

      <SelectionModal
        visible={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        data={statusOptions}
        onSelect={(item) => setDurum(item.id)}
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
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 6 },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
  },
  selectText: { fontSize: 16, color: '#0f172a' },
  placeholderText: { fontSize: 16, color: '#94a3b8' },
  row: { flexDirection: 'row' },
  dateButton: {
    backgroundColor: 'white',
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
  modalItemText: { fontSize: 16 },
  sectionHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 8,
    marginBottom: 16,
    marginTop: 8,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#334155',
  },
});

export default InventoryFormScreen;
