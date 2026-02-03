import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  ActivityIndicator, 
  Modal, 
  FlatList,
  Switch,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';

const EmployeeFormScreen = ({ route, navigation }) => {
  const { isEdit, employeeId } = route.params || {};
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const [departments, setDepartments] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    adSoyad: '',
    email: '',
    telefon: '',
    departmanId: null,
    durum: 'Aktif',
    calisanYetkisi: false,
    yoneticiYetkisi: false,
    adminYetkisi: false,
    sifre: '',
    iseGirisTarihi: new Date()
  });
  
  // Modals
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const deptsRes = await client.get('/departmanlar');
      setDepartments(deptsRes.data);

      if (isEdit && employeeId) {
        const empRes = await client.get(`/calisanlar/${employeeId}`);
        const data = empRes.data;
        
        let deptId = data.departmanId;
        // Fallback for finding dept by name if ID missing/mismatched (legacy data support)
        if (!deptId && data.departmanAd) {
          const d = deptsRes.data.find(x => x.ad === data.departmanAd);
          if (d) deptId = d.id;
        }

        setFormData({
          adSoyad: data.adSoyad,
          email: data.email || '',
          telefon: data.telefon || '',
          departmanId: deptId,
          durum: data.durum || 'Aktif',
          calisanYetkisi: !!data.calisanYetkisi,
          yoneticiYetkisi: !!data.yoneticiYetkisi,
          adminYetkisi: !!data.adminYetkisi,
          sifre: '', // Password not shown on edit
          iseGirisTarihi: data.iseGirisTarihi ? new Date(data.iseGirisTarihi) : new Date()
        });
      }
    } catch (error) {
      console.log('Error fetching form data:', error);
      Alert.alert('Hata', 'Veriler yüklenemedi.');
    } finally {
      setInitialLoading(false);
    }
  };

  const validatePassword = (password) => {
    if (password.length < 8) return 'Şifre en az 8 karakter olmalıdır';
    if (!/[A-Z]/.test(password)) return 'Şifre en az bir büyük harf içermelidir';
    if (!/[0-9]/.test(password)) return 'Şifre en az bir rakam içermelidir';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Şifre en az bir özel karakter içermelidir (!@#$%^&*(),.?":{}|<>)';
    return null;
  };

  const handleSubmit = async () => {
    if (!formData.adSoyad || !formData.email || !formData.departmanId) {
      Alert.alert('Hata', 'Ad Soyad, E-posta ve Departman zorunludur.');
      return;
    }

    if (!isEdit && formData.sifre) {
      const error = validatePassword(formData.sifre);
      if (error) {
        Alert.alert('Hata', error);
        return;
      }
    }

    if (!isEdit && !formData.sifre) {
       Alert.alert('Hata', 'Yeni çalışan için şifre zorunludur.');
       return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        iseGirisTarihi: formData.iseGirisTarihi.toISOString().split('T')[0],
        userId: user?.id,
        userName: user?.adSoyad
      };
      
      // Clean up password from payload if empty (on edit)
      if (isEdit && !payload.sifre) delete payload.sifre;

      if (isEdit) {
        await client.put(`/calisanlar/${employeeId}`, payload);
        Alert.alert('Başarılı', 'Çalışan güncellendi.', [
          { text: 'Tamam', onPress: () => navigation.navigate('EmployeeDetail', { id: employeeId, refresh: true }) }
        ]);
      } else {
        await client.post('/calisanlar', payload);
        Alert.alert('Başarılı', 'Yeni çalışan eklendi.', [
          { text: 'Tamam', onPress: () => navigation.pop() }
        ]);
      }
    } catch (error) {
      console.log('Save error:', error);
      Alert.alert('Hata', error.response?.data?.error || 'Kaydetme işlemi başarısız.');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const getDepartmentName = () => {
    const d = departments.find(x => x.id === formData.departmanId);
    return d ? d.ad : 'Departman Seçiniz';
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      updateField('iseGirisTarihi', selectedDate);
    }
  };

  // Helper for Selection Modal
  const SelectionModal = ({ visible, onClose, data, onSelect, titleKey = 'ad' }) => (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
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
            keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={styles.modalItemText}>{item[titleKey] || item}</Text>
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
        <Text style={styles.headerTitle}>{isEdit ? 'Çalışan Düzenle' : 'Yeni Çalışan'}</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          {loading ? (
             <ActivityIndicator color="#14b8a6" />
          ) : (
             <Text style={styles.saveButtonText}>Kaydet</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Personal Info */}
        <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Ad Soyad *</Text>
          <TextInput 
            style={styles.input} 
            value={formData.adSoyad} 
            onChangeText={(text) => updateField('adSoyad', text)} 
            placeholder="Tam Ad" 
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>E-posta *</Text>
          <TextInput 
            style={styles.input} 
            value={formData.email} 
            onChangeText={(text) => updateField('email', text)} 
            placeholder="email@sirket.com" 
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Telefon</Text>
          <TextInput 
            style={styles.input} 
            value={formData.telefon} 
            onChangeText={(text) => updateField('telefon', text)} 
            placeholder="05XX XXX XX XX" 
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Departman *</Text>
          <TouchableOpacity style={styles.selectButton} onPress={() => setShowDeptModal(true)}>
            <Text style={formData.departmanId ? styles.selectText : styles.placeholderText}>
              {getDepartmentName()}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>İşe Giriş Tarihi</Text>
          <TouchableOpacity style={styles.selectButton} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.selectText}>
              {formData.iseGirisTarihi.toLocaleDateString('tr-TR')}
            </Text>
            <Ionicons name="calendar" size={20} color="#64748b" />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              testID="dateTimePicker"
              value={formData.iseGirisTarihi}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Durum</Text>
          <TouchableOpacity style={styles.selectButton} onPress={() => setShowStatusModal(true)}>
            <Text style={[styles.selectText, formData.durum === 'Aktif' ? {color: '#16a34a'} : {color: '#64748b'}]}>
              {formData.durum}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Security & Roles */}
        <Text style={styles.sectionTitle}>Güvenlik ve Yetkiler</Text>

        {!isEdit && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Şifre *</Text>
            <TextInput 
              style={styles.input} 
              value={formData.sifre} 
              onChangeText={(text) => updateField('sifre', text)} 
              placeholder="Şifre belirleyiniz" 
              secureTextEntry
              autoCapitalize="none"
            />
            <Text style={styles.helperText}>Min 8 karakter, büyük harf, rakam, özel karakter</Text>
          </View>
        )}

        <View style={styles.roleContainer}>
          <View style={styles.roleRow}>
             <Text style={styles.roleLabel}>Çalışan Yetkisi</Text>
             <Switch 
               value={formData.calisanYetkisi}
               onValueChange={(val) => updateField('calisanYetkisi', val)}
               trackColor={{ false: "#e2e8f0", true: "#ccfbf1" }}
               thumbColor={formData.calisanYetkisi ? "#14b8a6" : "#f4f3f4"}
             />
          </View>
          <Text style={styles.roleDesc}>Sisteme giriş yapabilir, kendi zimmetlerini görebilir.</Text>

          <View style={styles.roleRow}>
             <Text style={styles.roleLabel}>Yönetici Yetkisi</Text>
             <Switch 
               value={formData.yoneticiYetkisi}
               onValueChange={(val) => updateField('yoneticiYetkisi', val)}
               trackColor={{ false: "#e2e8f0", true: "#dbeafe" }}
               thumbColor={formData.yoneticiYetkisi ? "#2563eb" : "#f4f3f4"}
             />
          </View>
          <Text style={styles.roleDesc}>Departman çalışanlarını görebilir, zimmet iadesi alabilir.</Text>

          {user?.adminYetkisi && (
            <>
              <View style={styles.roleRow}>
                <Text style={styles.roleLabel}>Admin Yetkisi</Text>
                <Switch 
                  value={formData.adminYetkisi}
                  onValueChange={(val) => updateField('adminYetkisi', val)}
                  trackColor={{ false: "#e2e8f0", true: "#e9d5ff" }}
                  thumbColor={formData.adminYetkisi ? "#9333ea" : "#f4f3f4"}
                />
              </View>
              <Text style={styles.roleDesc}>Tam yetkili kullanıcı.</Text>
            </>
          )}
        </View>

      </ScrollView>

      {/* Modals */}
      <SelectionModal 
        visible={showDeptModal} 
        onClose={() => setShowDeptModal(false)} 
        data={departments} 
        onSelect={(item) => updateField('departmanId', item.id)} 
        titleKey="ad"
      />

      <SelectionModal 
        visible={showStatusModal} 
        onClose={() => setShowStatusModal(false)} 
        data={['Aktif', 'Pasif']} 
        onSelect={(item) => updateField('durum', item)} 
        titleKey={null}
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  backButtonText: { color: '#ef4444', fontSize: 16 },
  saveButtonText: { color: '#14b8a6', fontSize: 16, fontWeight: 'bold' },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 6 },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#0f172a'
  },
  helperText: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
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
  
  // Roles
  roleContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  roleLabel: { fontSize: 16, fontWeight: '500', color: '#334155' },
  roleDesc: { fontSize: 12, color: '#94a3b8', marginBottom: 16 },

  // Modal
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
});

export default EmployeeFormScreen;
