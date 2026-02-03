import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  TextInput, 
  Alert, 
  ActivityIndicator,
  Modal,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

const BenimSayfamScreen = ({ navigation }) => {
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState('temel-bilgiler');
  const [zimmetler, setZimmetler] = useState([]);
  const [evraklar, setEvraklar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({ 
    currentPassword: '', 
    newPassword: '', 
    confirmPassword: '' 
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchUserData();
      loadProfileImage();
    }
  }, [user]);

  useEffect(() => {
      // Force password change check
      if (user && user.sifreDegistirildi === false) {
          setShowPasswordDialog(true);
      }
  }, [user]);

  const loadProfileImage = async () => {
    try {
      const savedImage = await AsyncStorage.getItem(`profileImage_${user.id}`);
      if (savedImage) {
        setProfileImage(savedImage);
      }
    } catch (error) {
      console.log('Error loading profile image:', error);
    }
  };

  const fetchUserData = async () => {
    try {
      setLoading(true);
      // Run promises in parallel
      const [zimmetRes, evrakRes] = await Promise.all([
        client.get(`/calisanlar/${user.id}/zimmetler`).catch(e => ({ data: [] })),
        client.get(`/calisanlar/${user.id}/belgeler`).catch(e => ({ data: [] })),
      ]);

      if (zimmetRes.data) {
        setZimmetler(zimmetRes.data.filter(z => z.durum === 'Aktif'));
      }
      
      if (evrakRes.data) {
        setEvraklar(evrakRes.data);
      }
    } catch (error) {
      console.error('Veri çekilemedi:', error);
      Alert.alert('Hata', 'Kullanıcı verileri yüklenirken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('İzin Gerekli', 'Galeriye erişim izni vermeniz gerekiyor.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setProfileImage(base64Image);
      try {
        await AsyncStorage.setItem(`profileImage_${user.id}`, base64Image);
        Alert.alert('Başarılı', 'Profil resmi güncellendi');
      } catch (error) {
        console.log('Error saving image:', error);
      }
    }
  };

  const handlePasswordChange = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordData;

    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Hata', 'Yeni şifreler eşleşmiyor');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Hata', 'Şifre en az 8 karakter olmalıdır');
      return;
    }

    try {
      const response = await client.post(`/calisanlar/${user.id}/change-password`, {
        currentPassword,
        newPassword
      });

      Alert.alert('Başarılı', 'Şifreniz başarıyla değiştirildi');
      
      // Update local user state if needed (e.g. remove "force change" flag)
      const updatedUser = { ...user, sifreDegistirildi: true };
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser)); // Update stored user

      setShowPasswordDialog(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });

    } catch (error) {
      Alert.alert('Hata', error.response?.data?.error || 'Şifre değiştirilemedi');
    }
  };

  // Helper to get initials if no image
  const getInitials = () => {
    const ad = user?.adSoyad?.split(' ')[0] || '';
    const soyad = user?.adSoyad?.split(' ').slice(1).join(' ') || '';
    return `${ad.charAt(0)}${soyad.charAt(0)}`.toUpperCase();
  };

  const tabs = [
    { id: 'temel-bilgiler', label: 'Temel Bilgiler' },
    { id: 'zimmetler', label: 'Zimmetler' },
    { id: 'atamalar', label: 'Atamalar' },
    { id: 'iletisim', label: 'İletişim' },
    { id: 'ozel-alanlar', label: 'Özel Alanlar' },
    { id: 'sozlesmelerim', label: 'Sözleşmelerim' },
    { id: 'evraklarim', label: 'Evraklarım' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'temel-bilgiler':
        return (
          <View style={styles.infoContainer}>
            <InfoRow label="Adı" value={user?.adSoyad?.split(' ')[0]} />
            <InfoRow label="Soyadı" value={user?.adSoyad?.split(' ').slice(1).join(' ')} />
            <InfoRow label="Unvanı" value="-" />
            <InfoRow label="Yöneticisi" value="-" />
            <InfoRow label="Departman" value={user?.departmanAd || 'Bilinmiyor'} />
            <InfoRow label="Kurum Sicil No" value="-" />
            <InfoRow label="İş E-Posta" value={user?.email || '-'} />
            <InfoRow label="İş Telefonu" value="-" />
            <InfoRow label="Durum" value="Aktif" badge />
          </View>
        );
      case 'zimmetler':
        return (
          <View>
            {zimmetler.length === 0 ? (
              <EmptyState icon="cube-outline" message="Zimmet ataması beklenmektedir." />
            ) : (
              zimmetler.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.envanterBilgisi?.marka} {item.envanterBilgisi?.model}</Text>
                    <Text style={styles.cardType}>{item.envanterBilgisi?.tip}</Text>
                  </View>
                  <Text style={styles.cardDetail}>SN: {item.envanterBilgisi?.seriNumarasi}</Text>
                  <Text style={styles.cardDate}>
                    Zimmet Tarihi: {item.zimmetTarihi ? new Date(item.zimmetTarihi).toLocaleDateString('tr-TR') : '-'}
                  </Text>
                </View>
              ))
            )}
          </View>
        );
      case 'atamalar':
        return <EmptyState icon="briefcase-outline" message="Geçmiş atama bilgileri bulunmamaktadır." />;
      case 'iletisim':
         return (
          <View style={styles.infoContainer}>
            <InfoRow label="E-Posta" value={user?.email || '-'} />
            <InfoRow label="Telefon" value="-" />
          </View>
         );
      case 'ozel-alanlar':
        return <EmptyState icon="newspaper-outline" message="Özel alan bilgileri bulunmamaktadır." />;
      case 'sozlesmelerim':
        return <EmptyState icon="document-text-outline" message="Aktif sözleşme bulunmamaktadır." />;
      case 'evraklarim':
        return (
          <View>
             {evraklar.length === 0 ? (
                <EmptyState icon="folder-open-outline" message="Henüz evrak eklenmemiştir." />
             ) : (
               evraklar.map((evrak) => (
                 <View key={evrak.id} style={styles.card}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Ionicons name="document-text" size={24} color="#0f766e" style={{ marginRight: 10 }}/>
                        <View style={{flex: 1}}>
                            <Text style={styles.cardTitle}>{evrak.dosyaAdi}</Text>
                            <Text style={styles.cardDetail}>{new Date(evrak.createdAt).toLocaleDateString('tr-TR')}</Text>
                        </View>
                        {/* Download not fully supported in simple mock, shows logic */}
                        <TouchableOpacity onPress={() => Alert.alert('İndir', 'Dosya indirme özelliği yakında eklenecektir.')}> 
                            <Ionicons name="cloud-download-outline" size={24} color="#0f766e" />
                        </TouchableOpacity>
                    </View>
                 </View>
               ))
             )}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
           <Ionicons name="arrow-back" size={24} color="#334155" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Benim Sayfam</Text>
        <TouchableOpacity onPress={() => setShowPasswordDialog(true)} style={styles.passwordButton}>
           <Ionicons name="key-outline" size={24} color="#0f766e" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity onPress={handleImageUpload} style={styles.avatarContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.placeholderAvatar]}>
                <Text style={styles.avatarText}>{getInitials()}</Text>
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={20} color="white" />
            </View>
          </TouchableOpacity>
          
          <Text style={styles.name}>{user?.adSoyad}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <Text style={styles.department}>{user?.departmanAd}</Text>
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
          {tabs.map(tab => (
            <TouchableOpacity 
              key={tab.id} 
              style={[styles.tab, activeTab === tab.id && styles.activeTab]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tab Content */}
        <View style={styles.tabContent}>
           {loading ? <ActivityIndicator size="large" color="#14b8a6" style={{marginTop: 20}} /> : renderTabContent()}
        </View>

      </ScrollView>

      {/* Password Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPasswordDialog}
        onRequestClose={() => {
             if (user?.sifreDegistirildi !== false) setShowPasswordDialog(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Şifre Değiştir</Text>
            {user?.sifreDegistirildi === false && (
                <Text style={styles.warningText}>İlk girişiniz için şifrenizi değiştirmeniz zorunludur.</Text>
            )}

            <TextInput
              style={styles.input}
              placeholder="Mevcut Şifre"
              secureTextEntry
              value={passwordData.currentPassword}
              onChangeText={(text) => setPasswordData(prev => ({ ...prev, currentPassword: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Yeni Şifre"
              secureTextEntry
              value={passwordData.newPassword}
              onChangeText={(text) => setPasswordData(prev => ({ ...prev, newPassword: text }))}
            />
             <Text style={styles.hint}>En az 8 karakter</Text>

             <TextInput
              style={styles.input}
              placeholder="Yeni Şifre (Tekrar)"
              secureTextEntry
              value={passwordData.confirmPassword}
              onChangeText={(text) => setPasswordData(prev => ({ ...prev, confirmPassword: text }))}
            />

            <View style={styles.modalButtons}>
              {user?.sifreDegistirildi !== false && (
                <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowPasswordDialog(false)}
                >
                    <Text style={styles.cancelButtonText}>İptal</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={handlePasswordChange}
              >
                <Text style={styles.saveButtonText}>Güncelle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const InfoRow = ({ label, value, badge }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    {badge ? (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{value}</Text>
      </View>
    ) : (
      <Text style={styles.value}>{value || '-'}</Text>
    )}
  </View>
);

const EmptyState = ({ icon, message }) => (
  <View style={styles.emptyContainer}>
    <Ionicons name={icon} size={48} color="#cbd5e1" />
    <Text style={styles.emptyText}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
      padding: 4,
  },
  passwordButton: {
      padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  content: {
    paddingBottom: 24,
  },
  profileCard: {
    backgroundColor: 'white',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  placeholderAvatar: {
    backgroundColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    color: 'white',
    fontWeight: 'bold',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0f766e',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  department: {
    fontSize: 14,
    color: '#0f766e',
    fontWeight: '600',
  },
  tabsContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  activeTab: {
    backgroundColor: '#e0f2fe',
  },
  tabText: {
    color: '#64748b',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#0ea5e9',
    fontWeight: 'bold',
  },
  tabContent: {
    padding: 16,
  },
  infoContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  label: {
    fontSize: 14,
    color: '#64748b',
  },
  value: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  badge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  cardType: {
    fontSize: 12,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardDetail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 14,
    color: '#0f766e',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
    textAlign: 'center',
  },
  warningText: {
      color: '#b91c1c',
      backgroundColor: '#fef2f2',
      padding: 10,
      borderRadius: 8,
      marginBottom: 16,
      textAlign: 'center',
      fontSize: 14,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 16,
    textAlign: 'right',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  saveButton: {
    backgroundColor: '#0f766e',
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '600',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default BenimSayfamScreen;
