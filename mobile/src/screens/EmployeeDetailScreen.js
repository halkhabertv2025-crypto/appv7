import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity, 
  Alert, 
  Modal,
  TextInput,
  Image,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

const EmployeeDetailScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const { user } = useAuth();
  
  const [employee, setEmployee] = useState(null);
  const [zimmetler, setZimmetler] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'zimmetler', 'files'

  // Modals
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrUrl, setQrUrl] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, invRes] = await Promise.all([
        client.get(`/calisanlar/${id}`),
        client.get('/envanterler')
      ]);
      
      setEmployee(empRes.data);

      // Filter zimmetler for this employee
      const employeeItems = invRes.data.filter(item => 
        item.zimmetBilgisi && item.zimmetBilgisi.calisanId === id
      );
      setZimmetler(employeeItems);

      // Fetch documents
      try {
        const docRes = await client.get(`/calisanlar/${id}/belgeler`);
        setDocuments(docRes.data || []);
      } catch (docErr) {
        console.log('Error fetching docs:', docErr);
        // Fallback to empty if endpoint fails or doesn't exist yet
        setDocuments([]);
      }

    } catch (error) {
      console.log('Error fetching details:', error);
      Alert.alert('Hata', 'Çalışan bilgileri getirilemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleDelete = () => {
    if (zimmetler.length > 0) {
      Alert.alert('Hata', 'Üzerinde zimmet bulunan çalışan silinemez.');
      return;
    }

    Alert.alert(
      'Çalışanı Sil',
      'Bu çalışanı silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: async () => {
             try {
               await client.delete(`/calisanlar/${id}`, {
                 data: {
                   userId: user?.id,
                   userName: user?.adSoyad,
                   userRole: user?.adminYetkisi ? 'Admin' : 'Yönetici'
                 }
               });
               navigation.navigate('Employees', { refresh: true });
             } catch (error) {
               Alert.alert('Hata', error.response?.data?.error || 'Silme başarısız.');
             }
          }
        }
      ]
    );
  };

  const handlePasswordReset = async () => {
    if (!newPassword || newPassword.length < 8) {
      Alert.alert('Hata', 'Şifre en az 8 karakter olmalıdır.');
      return;
    }

    try {
      await client.post(`/calisanlar/${id}/reset-password`, { yeniSifre: newPassword });
      Alert.alert('Başarılı', 'Şifre sıfırlandı.');
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (error) {
       Alert.alert('Hata', 'Şifre sıfırlama başarısız.');
    }
  };

  const handleUpload = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('İzin Gerekli', 'Galeriye erişim izni gerekiyor.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      try {
        const asset = result.assets[0];
        const payload = {
          ad: asset.fileName || `belge_${Date.now()}.jpg`,
          tip: 'image/jpeg',
          dosyaVerisi: `data:image/jpeg;base64,${asset.base64}`,
          yukleyenId: user?.id,
          yukleyenAd: user?.adSoyad
        };
        
        await client.post(`/calisanlar/${id}/belgeler`, payload);
        Alert.alert('Başarılı', 'Belge yüklendi.');
        fetchData(); // Refresh documents
      } catch (error) {
        Alert.alert('Hata', 'Yükleme başarısız. (API endpoint mevcut olmayabilir)');
      }
    }
  };

  const handleDeleteDocument = async (docId) => {
    Alert.alert('Belgeyi Sil', 'Emin misiniz?', [
      { text: 'İptal' },
      { text: 'Sil', onPress: async () => {
          try {
            await client.delete(`/calisanlar/belgeler/${docId}`, {
                data: { userId: user?.id, userName: user?.adSoyad }
            });
            fetchData();
          } catch(e) {
            Alert.alert('Hata', 'Silinemedi');
          }
      }}
    ]);
  };

  const handleQrCode = () => {
    // Generate QR URL logic
    // We don't have visual QR lib, so we'll just show the link or similar
    // Actually the web CalisanDetay uses `window.location.origin/calisan-dogrula/:id`
    // We can just show this URL in a modal or copy to clipboard
    const url = `https://zimmet-app.com/calisan-dogrula/${id}`; // Replace with actual domain if known or just placeholders
    setQrUrl(url);
    setShowQrModal(true);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#14b8a6" /></View>;
  if (!employee) return <View style={styles.center}><Text>Çalışan bulunamadı.</Text></View>;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#14b8a6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Çalışan Detayı</Text>
        <View style={styles.headerActions}>
           <TouchableOpacity 
            onPress={() => navigation.navigate('EmployeeForm', { isEdit: true, employeeId: id })} 
            style={styles.headerBtn}
           >
            <Ionicons name="pencil" size={20} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
            <Ionicons name="trash" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'info' && styles.activeTab]} 
          onPress={() => setActiveTab('info')}
        >
           <Text style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>Bilgiler</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'zimmetler' && styles.activeTab]} 
          onPress={() => setActiveTab('zimmetler')}
        >
           <Text style={[styles.tabText, activeTab === 'zimmetler' && styles.activeTabText]}>Zimmetler</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'files' && styles.activeTab]} 
          onPress={() => setActiveTab('files')}
        >
           <Text style={[styles.tabText, activeTab === 'files' && styles.activeTabText]}>Dosyalar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Info Tab */}
        {activeTab === 'info' && (
          <View>
            <View style={styles.card}>
              <View style={styles.avatarContainer}>
                <View style={[styles.avatar, { backgroundColor: employee.durum === 'Aktif' ? '#ccfbf1' : '#f1f5f9' }]}>
                  <Text style={[styles.avatarText, { color: employee.durum === 'Aktif' ? '#14b8a6' : '#64748b' }]}>
                    {employee.adSoyad.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.name}>{employee.adSoyad}</Text>
                  <Text style={styles.role}>{employee.departmanAd}</Text>
                  <View style={styles.statusBadge}>
                     <Text style={[styles.statusText, { color: employee.durum === 'Aktif' ? '#16a34a' : '#475569' }]}>
                       {employee.durum}
                     </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={20} color="#64748b" />
                <Text style={styles.infoText}>{employee.email || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={20} color="#64748b" />
                <Text style={styles.infoText}>{employee.telefon || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={20} color="#64748b" />
                <Text style={styles.infoText}>
                  {employee.iseGirisTarihi ? new Date(employee.iseGirisTarihi).toLocaleDateString('tr-TR') : '-'}
                </Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
               <TouchableOpacity style={styles.actionBtn} onPress={handleQrCode}>
                 <Ionicons name="qr-code-outline" size={22} color="#0f172a" />
                 <Text style={styles.actionBtnText}>QR Kod</Text>
               </TouchableOpacity>
               {user?.adminYetkisi && (
                 <TouchableOpacity style={styles.actionBtn} onPress={() => setShowPasswordModal(true)}>
                   <Ionicons name="key-outline" size={22} color="#0f172a" />
                   <Text style={styles.actionBtnText}>Şifre Değiştir</Text>
                 </TouchableOpacity>
               )}
            </View>
          </View>
        )}

        {/* Zimmetler Tab */}
        {activeTab === 'zimmetler' && (
          <View>
             {zimmetler.length > 0 ? (
                zimmetler.map(item => (
                  <TouchableOpacity 
                    key={item.id}
                    style={styles.zimmetCard}
                    onPress={() => navigation.navigate('InventoryDetail', { id: item.id, title: `${item.marka} ${item.model}` })}
                  >
                    <View>
                      <Text style={styles.zimmetBrand}>{item.marka} {item.model}</Text>
                      <Text style={styles.zimmetSerial}>{item.seriNumarasi}</Text>
                      <Text style={styles.zimmetDate}>
                        {new Date(item.zimmetBilgisi.zimmetTarihi).toLocaleDateString('tr-TR')}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                  </TouchableOpacity>
                ))
             ) : (
                <Text style={styles.emptyText}>Zimmetli envanter bulunamadı.</Text>
             )}
          </View>
        )}

        {/* Files Tab */}
        {activeTab === 'files' && (
          <View>
             <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload}>
               <Ionicons name="cloud-upload-outline" size={20} color="white" />
               <Text style={styles.uploadBtnText}>Belge Yükle / Fotoğraf Çek</Text>
             </TouchableOpacity>

             {documents.length > 0 ? (
               documents.map(doc => (
                 <View key={doc.id} style={styles.fileCard}>
                   <View style={styles.fileIcon}>
                     <Ionicons name="document-text-outline" size={24} color="#64748b" />
                   </View>
                   <View style={styles.fileInfo}>
                     <Text style={styles.fileName} numberOfLines={1}>{doc.ad}</Text>
                     <Text style={styles.fileDate}>{new Date(doc.createdAt).toLocaleDateString('tr-TR')}</Text>
                   </View>
                   <TouchableOpacity onPress={() => handleDeleteDocument(doc.id)} style={styles.deleteFileBtn}>
                     <Ionicons name="trash-outline" size={20} color="#ef4444" />
                   </TouchableOpacity>
                 </View>
               ))
             ) : (
               <Text style={styles.emptyText}>Belge bulunamadı.</Text>
             )}
          </View>
        )}

      </ScrollView>

      {/* Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="fade" onRequestClose={() => setShowPasswordModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Şifre Değiştir</Text>
            <TextInput 
              style={styles.input}
              placeholder="Yeni Şifre"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePasswordReset} style={styles.modalSubmit}>
                <Text style={styles.modalSubmitText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QR Modal */}
      <Modal visible={showQrModal} transparent animationType="fade" onRequestClose={() => setShowQrModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Doğrulama Linki</Text>
            <Text style={styles.qrText}>{qrUrl}</Text>
            <TouchableOpacity onPress={() => setShowQrModal(false)} style={styles.modalSubmit}>
              <Text style={styles.modalSubmitText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  headerActions: { flexDirection: 'row', gap: 12 },
  headerBtn: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 8 },
  
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: { borderBottomColor: '#14b8a6' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  activeTabText: { color: '#14b8a6' },

  content: { padding: 16 },
  
  // Info Tab
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: { fontSize: 24, fontWeight: 'bold' },
  profileInfo: { flex: 1 },
  name: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  role: { fontSize: 14, color: '#64748b', marginTop: 2 },
  statusBadge: { 
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  infoText: { fontSize: 16, color: '#334155' },
  
  actionButtons: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionBtn: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: '#0f172a' },

  // Zimmet Tab
  zimmetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  zimmetBrand: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  zimmetSerial: { fontSize: 12, color: '#64748b', marginTop: 2 },
  zimmetDate: { fontSize: 12, color: '#14b8a6', marginTop: 4, fontWeight: '500' },

  // Files Tab
  uploadBtn: {
    backgroundColor: '#14b8a6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  uploadBtnText: { color: 'white', fontWeight: 'bold' },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fileIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  fileDate: { fontSize: 12, color: '#64748b' },
  deleteFileBtn: { padding: 8 },

  emptyText: { textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', marginTop: 20 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 8 },
  modalSubmit: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#14b8a6', borderRadius: 8 },
  modalCancelText: { color: '#64748b', fontWeight: 'bold' },
  modalSubmitText: { color: 'white', fontWeight: 'bold' },
  qrText: { textAlign: 'center', marginBottom: 20, color: '#3b82f6' },
});

export default EmployeeDetailScreen;
