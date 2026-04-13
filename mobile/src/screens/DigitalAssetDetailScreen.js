import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Clipboard, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const DigitalAssetDetailScreen = ({ route, navigation }) => {
  const { id, title } = route.params;
  const { user } = useAuth();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    fetchAsset();
  }, [id]);

  const fetchAsset = async () => {
    try {
      const response = await client.get(`/dijital-varliklar/${id}`);
      setAsset(response.data);
    } catch (error) {
      console.log('Error fetching asset:', error);
      Alert.alert('Hata', 'Dijital varlık bilgileri alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Varlığı Sil',
      'Bu dijital varlığı silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: async () => {
             try {
               await client.delete(`/dijital-varliklar/${id}`, {
                 data: { userId: user?.id, userName: user?.adSoyad }
               });
               navigation.navigate('DigitalAssets', { refresh: true });
             } catch (error) {
               Alert.alert('Hata', 'Silme işlemi başarısız.');
             }
          }
        }
      ]
    );
  };

  const copyToClipboard = (text, label) => {
    Clipboard.setString(text);
    Alert.alert('Kopyalandı', `${label} panoya kopyalandı.`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Aktif': return '#22c55e';
      case 'Pasif': return '#64748b';
      case 'Süresi Dolmuş': return '#ef4444';
      default: return '#64748b';
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  if (!asset) {
    return (
      <View style={styles.center}>
        <Text>Varlık bulunamadı.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#14b8a6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Varlık Detayı</Text>
        <View style={styles.headerActions}>
           <TouchableOpacity 
            onPress={() => navigation.navigate('DigitalAssetForm', { isEdit: true, assetId: id })} 
            style={styles.headerBtn}
           >
            <Ionicons name="pencil" size={20} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
            <Ionicons name="trash" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Main Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.assetName}>{asset.ad}</Text>
              <Text style={styles.assetCategory}>{asset.kategoriAd}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: getStatusColor(asset.durum) }]}>
              <Text style={styles.badgeText}>{asset.durum}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Account Info */}
          <Text style={styles.sectionTitle}>Hesap Bilgileri</Text>
          
          {asset.hesapEmail && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value} selectable>{asset.hesapEmail}</Text>
              <TouchableOpacity onPress={() => copyToClipboard(asset.hesapEmail, 'Email')}>
                <Ionicons name="copy-outline" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          )}

          {asset.hesapKullaniciAdi && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Kullanıcı Adı:</Text>
              <Text style={styles.value} selectable>{asset.hesapKullaniciAdi}</Text>
              <TouchableOpacity onPress={() => copyToClipboard(asset.hesapKullaniciAdi, 'Kullanıcı Adı')}>
                <Ionicons name="copy-outline" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          )}

          {asset.hesapSifre && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Şifre:</Text>
              <Text style={styles.value}>
                {showPassword ? asset.hesapSifre : '••••••••'}
              </Text>
              <View style={styles.rowActions}>
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ marginRight: 8 }}>
                   <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#64748b" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => copyToClipboard(asset.hesapSifre, 'Şifre')}>
                   <Ionicons name="copy-outline" size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {asset.keyBilgisi && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Lisans Key:</Text>
              <Text style={[styles.value, { fontFamily: 'monospace' }]}>
                {showKey ? asset.keyBilgisi : '••••-••••-••••-••••'}
              </Text>
              <View style={styles.rowActions}>
                <TouchableOpacity onPress={() => setShowKey(!showKey)} style={{ marginRight: 8 }}>
                   <Ionicons name={showKey ? "eye-off-outline" : "eye-outline"} size={20} color="#64748b" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => copyToClipboard(asset.keyBilgisi, 'Key')}>
                   <Ionicons name="copy-outline" size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.divider} />

          {/* Usage Info */}
          <Text style={styles.sectionTitle}>Kullanım Bilgileri</Text>
          
          <View style={styles.infoRow}>
             <Text style={styles.label}>Kullanıldığı Cihaz:</Text>
             <Text style={styles.value}>
               {asset.envanterBilgisi 
                 ? `${asset.envanterBilgisi.marka} ${asset.envanterBilgisi.model}` 
                 : '-'}
             </Text>
          </View>

          <View style={styles.infoRow}>
             <Text style={styles.label}>Kullanan Kişi:</Text>
             <Text style={styles.value}>{asset.calisanAd || '-'}</Text>
          </View>

          <View style={styles.divider} />

          {/* License Info */}
          <Text style={styles.sectionTitle}>Lisans Bilgileri</Text>
          
          <View style={styles.infoRow}>
             <Text style={styles.label}>Lisans Tipi:</Text>
             <Text style={styles.value}>{asset.lisansTipi}</Text>
          </View>

          {asset.lisansTipi !== 'Süresiz' && (
            <>
              <View style={styles.infoRow}>
                 <Text style={styles.label}>Başlangıç:</Text>
                 <Text style={styles.value}>
                   {asset.baslangicTarihi ? new Date(asset.baslangicTarihi).toLocaleDateString('tr-TR') : '-'}
                 </Text>
              </View>
              <View style={styles.infoRow}>
                 <Text style={styles.label}>Bitiş:</Text>
                 <Text style={[styles.value, isExpiringSoon(asset.bitisTarihi) && { color: '#dc2626', fontWeight: 'bold' }]}>
                   {asset.bitisTarihi ? new Date(asset.bitisTarihi).toLocaleDateString('tr-TR') : '-'}
                 </Text>
              </View>
            </>
          )}

          {asset.notlar && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Notlar:</Text>
              <Text style={styles.noteText}>{asset.notlar}</Text>
            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const isExpiringSoon = (dateStr) => {
  if (!dateStr) return false;
  const diff = new Date(dateStr) - new Date();
  const days = diff / (1000 * 60 * 60 * 24);
  return days > 0 && days <= 30;
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
  content: { padding: 16 },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  assetName: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  assetCategory: { fontSize: 14, color: '#64748b', marginTop: 2 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginBottom: 12 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 4,
  },
  label: { fontSize: 14, color: '#64748b', flex: 1 },
  value: { fontSize: 14, color: '#0f172a', fontWeight: '500', flex: 2, textAlign: 'right', marginRight: 8 },
  rowActions: { flexDirection: 'row', alignItems: 'center' },
  noteText: { fontSize: 14, color: '#334155', backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, marginTop: 4, fontStyle: 'italic' },
});

export default DigitalAssetDetailScreen;
