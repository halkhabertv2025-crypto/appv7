import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Image, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import client from '../api/client';
import { Ionicons } from '@expo/vector-icons';

const ZimmetScreen = ({ route, navigation }) => {
  const { inventoryId: paramInventoryId, inventoryTitle: paramInventoryTitle } = route.params || {};

  const [inventoryId, setInventoryId] = useState(paramInventoryId);
  const [inventoryTitle, setInventoryTitle] = useState(paramInventoryTitle || 'Yeni Zimmet');

  const [employees, setEmployees] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Selection States
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [showInventoryDropdown, setShowInventoryDropdown] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');

  // Form State
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [image, setImage] = useState(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [empRes, invRes] = await Promise.all([
        client.get('/calisanlar'),
        // Only fetch inventories if we are in "select mode" (no pre-selected ID) 
        // OR we can just fetch them always to be safe if user wants to change (though usually locked if started from detail)
        !paramInventoryId ? client.get('/envanterler') : Promise.resolve({ data: [] })
      ]);

      setEmployees(empRes.data);
      if (!paramInventoryId) {
        // Filter only 'Depoda' status
        setInventories(invRes.data.filter(inv => inv.durum === 'Depoda'));
      }
    } catch (error) {
      console.log('Error fetching data:', error);
      Alert.alert('Hata', 'Veriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const pickImage = async () => {
    // Request permission
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("İzin Gerekli", "Kamera erişim izni vermeniz gerekiyor.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!inventoryId) {
      Alert.alert('Hata', 'Lütfen bir envanter seçin.');
      return;
    }
    if (!selectedEmployee) {
      Alert.alert('Hata', 'Lütfen bir çalışan seçin.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        envanterId: inventoryId,
        calisanId: selectedEmployee.id,
        zimmetTarihi: date.toISOString().split('T')[0],
        aciklama: note,
        zimmetFoto: image ? `data:image/jpeg;base64,${image.base64}` : null,
      };

      await client.post('/zimmetler', payload);

      Alert.alert('Başarılı', 'Zimmet işlemi başarıyla tamamlandı.', [
        {
          text: 'Tamam', onPress: () => {
            if (paramInventoryId) {
              navigation.navigate('InventoryDetail', { id: inventoryId, refresh: true });
            } else {
              navigation.goBack(); // Back to list
            }
          }
        }
      ]);
    } catch (error) {
      console.log('Zimmet submit error:', error);
      Alert.alert('Hata', error.response?.data?.error || 'Zimmet işlemi başarısız oldu.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.adSoyad.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>İptal</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Zimmetle</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#14b8a6" />
          ) : (
            <Text style={styles.saveButtonText}>Kaydet</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.inventoryTitle}>{inventoryTitle}</Text>

        {!paramInventoryId && (
          <View style={styles.section}>
            <Text style={styles.label}>Envanter Seçin</Text>
            {selectedInventory ? (
              <View style={styles.selectedEmployee}>
                <View>
                  <Text style={styles.selectedName}>{selectedInventory.marka} {selectedInventory.model}</Text>
                  <Text style={{ fontSize: 12, color: 'gray' }}>{selectedInventory.seriNumarasi}</Text>
                </View>
                <TouchableOpacity onPress={() => { setSelectedInventory(null); setInventoryId(null); setInventorySearch(''); }}>
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <TextInput
                  style={styles.input}
                  placeholder="Marka, model veya seri no ara..."
                  value={inventorySearch}
                  onChangeText={(text) => { setInventorySearch(text); setShowInventoryDropdown(true); }}
                  onFocus={() => setShowInventoryDropdown(true)}
                />
                {showInventoryDropdown && inventorySearch.length > 0 && (
                  <View style={styles.dropdown}>
                    {inventories
                      .filter(inv =>
                        inv.marka?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                        inv.model?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                        inv.seriNumarasi?.toLowerCase().includes(inventorySearch.toLowerCase())
                      )
                      .map(inv => (
                        <TouchableOpacity
                          key={inv.id}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setSelectedInventory(inv);
                            setInventoryId(inv.id);
                            setInventorySearch('');
                            setShowInventoryDropdown(false);
                          }}
                        >
                          <Text style={{ fontWeight: 'bold' }}>{inv.marka} {inv.model}</Text>
                          <Text style={{ fontSize: 12, color: 'gray' }}>{inv.seriNumarasi}</Text>
                        </TouchableOpacity>
                      ))}
                    {inventories.filter(inv => inv.marka?.toLowerCase().includes(inventorySearch.toLowerCase())).length === 0 && (
                      <Text style={{ padding: 12, color: 'gray' }}>Sonuç bulunamadı</Text>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Employee Search/Select */}
        <View style={styles.section}>
          <Text style={styles.label}>Çalışan Seçin</Text>
          {selectedEmployee ? (
            <View style={styles.selectedEmployee}>
              <Text style={styles.selectedName}>{selectedEmployee.adSoyad}</Text>
              <TouchableOpacity onPress={() => { setSelectedEmployee(null); setSearchQuery(''); }}>
                <Ionicons name="close-circle" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <TextInput
                style={styles.input}
                placeholder="Çalışan ara..."
                value={searchQuery}
                onChangeText={(text) => { setSearchQuery(text); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
              />
              {showDropdown && searchQuery.length > 0 && (
                <View style={styles.dropdown}>
                  {filteredEmployees.map(emp => (
                    <TouchableOpacity
                      key={emp.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedEmployee(emp);
                        setSearchQuery('');
                        setShowDropdown(false);
                      }}
                    >
                      <Text>{emp.adSoyad}</Text>
                    </TouchableOpacity>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <Text style={{ padding: 12, color: 'gray' }}>Sonuç bulunamadı</Text>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Date Picker */}
        <View style={styles.section}>
          <Text style={styles.label}>Zimmet Tarihi</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text>{date.toLocaleDateString('tr-TR')}</Text>
            <Ionicons name="calendar-outline" size={20} color="#64748b" />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
            />
          )}
        </View>

        {/* Note */}
        <View style={styles.section}>
          <Text style={styles.label}>Açıklama (Opsiyonel)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Not ekleyin..."
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Photo Upload */}
        <View style={styles.section}>
          <Text style={styles.label}>Fotoğraf (Opsiyonel)</Text>
          <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
            <Ionicons name="camera" size={24} color="white" />
            <Text style={styles.photoButtonText}>Fotoğraf Çek</Text>
          </TouchableOpacity>

          {image && (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: image.uri }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removePhoto}
                onPress={() => setImage(null)}
              >
                <Ionicons name="trash" size={20} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButtonText: { color: '#ef4444', fontSize: 16 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  saveButtonText: { color: '#14b8a6', fontSize: 16, fontWeight: 'bold' },
  content: { padding: 16 },
  inventoryTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: '#334155' },
  section: { marginBottom: 20, position: 'relative' },
  label: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  dropdown: {
    position: 'absolute',
    top: 75,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    zIndex: 1000,
    maxHeight: 200,
    elevation: 5,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  selectedEmployee: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e0f2fe',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  selectedName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0369a1',
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#64748b',
    padding: 12,
    borderRadius: 8,
  },
  photoButtonText: { color: 'white', marginLeft: 8, fontWeight: 'bold' },
  imagePreviewContainer: { marginTop: 12, position: 'relative', alignItems: 'center' },
  previewImage: { width: '100%', height: 200, borderRadius: 8, resizeMode: 'cover' },
  removePhoto: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    padding: 8,
    borderRadius: 20,
  }
});

export default ZimmetScreen;
