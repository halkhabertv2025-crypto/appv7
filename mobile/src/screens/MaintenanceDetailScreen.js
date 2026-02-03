import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const MaintenanceDetailScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const { user } = useAuth();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecord();
  }, [id]);

  const fetchRecord = async () => {
    try {
      const response = await client.get(`/bakim-kayitlari/${id}`);
      setRecord(response.data);
    } catch (error) {
      console.log('Error fetching maintenance record:', error);
      Alert.alert('Hata', 'Bakım kaydı alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Kaydı Sil',
      'Bu bakım kaydını silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: async () => {
             try {
               await client.delete(`/bakim-kayitlari/${id}`, {
                 data: { userId: user?.id, userName: user?.adSoyad }
               });
               navigation.navigate('Maintenance', { refresh: true });
             } catch (error) {
               Alert.alert('Hata', 'Silme işlemi başarısız.');
             }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
        case 'Beklemede': return '#eab308'; // yellow
        case 'Serviste': return '#3b82f6'; // blue
        case 'Tamamlandı': return '#22c55e'; // green
        case 'İptal': return '#64748b'; // gray
        default: return '#64748b';
    }
  };

  const formatCurrency = (amount, currency) => {
     const symbols = { TRY: '₺', USD: '$', EUR: '€', GBP: '£' };
     return `${symbols[currency] || ''}${amount?.toLocaleString('tr-TR') || '0'}`;
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#14b8a6" /></View>;
  if (!record) return <View style={styles.center}><Text>Kayıt bulunamadı.</Text></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#14b8a6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bakım Detayı</Text>
        <View style={styles.headerActions}>
           <TouchableOpacity 
            onPress={() => navigation.navigate('MaintenanceForm', { isEdit: true, recordId: id })} 
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
              <Text style={styles.type}>{record.arizaTuru}</Text>
              <Text style={styles.date}>{new Date(record.bildirilenTarih).toLocaleDateString()}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: getStatusColor(record.durum) }]}>
              <Text style={styles.badgeText}>{record.durum}</Text>
            </View>
          </View>
          
          <Text style={styles.desc}>{record.aciklama}</Text>

          <View style={styles.divider} />

          {/* Inventory Info */}
          <Text style={styles.sectionTitle}>İlgili Envanter</Text>
          {record.envanterBilgisi ? (
             <View style={styles.invCard}>
               <Ionicons name="cube-outline" size={24} color="#64748b" style={{ marginRight: 12 }} />
               <View>
                 <Text style={styles.invTitle}>{record.envanterBilgisi.marka} {record.envanterBilgisi.model}</Text>
                 <Text style={styles.invSub}>{record.envanterBilgisi.seriNumarasi}</Text>
               </View>
             </View>
          ) : (
            <Text style={styles.value}>-</Text>
          )}

          {/* Service Info */}
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Servis Detayları</Text>
          
          <View style={styles.infoRow}>
             <Text style={styles.label}>Firma:</Text>
             <Text style={styles.value}>{record.servisFirma || '-'}</Text>
          </View>

          <View style={styles.infoRow}>
             <Text style={styles.label}>Maliyet:</Text>
             <Text style={[styles.value, { fontWeight: 'bold' }]}>
               {record.maliyet > 0 ? formatCurrency(record.maliyet, record.paraBirimi) : '-'}
             </Text>
          </View>

           <View style={styles.infoRow}>
             <Text style={styles.label}>Başlangıç:</Text>
             <Text style={styles.value}>
               {record.baslangicTarihi ? new Date(record.baslangicTarihi).toLocaleDateString() : '-'}
             </Text>
          </View>

          <View style={styles.infoRow}>
             <Text style={styles.label}>Bitiş:</Text>
             <Text style={styles.value}>
               {record.bitisTarihi ? new Date(record.bitisTarihi).toLocaleDateString() : '-'}
             </Text>
          </View>

          {record.notlar && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Notlar:</Text>
              <Text style={styles.noteText}>{record.notlar}</Text>
            </View>
          )}
        </View>
      </ScrollView>
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
    marginBottom: 12,
  },
  type: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  date: { fontSize: 14, color: '#64748b', marginTop: 2 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  desc: { fontSize: 16, color: '#334155', marginBottom: 16, lineHeight: 22 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginBottom: 12 },
  invCard: {
     flexDirection: 'row',
     alignItems: 'center',
     backgroundColor: '#f8fafc',
     padding: 12,
     borderRadius: 8,
     borderWidth: 1,
     borderColor: '#e2e8f0'
  },
  invTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  invSub: { fontSize: 14, color: '#64748b' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 4,
  },
  label: { fontSize: 14, color: '#64748b', flex: 1 },
  value: { fontSize: 14, color: '#0f172a', fontWeight: '500', flex: 2, textAlign: 'right' },
  noteText: { fontSize: 14, color: '#334155', backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, marginTop: 4, fontStyle: 'italic' },
});

export default MaintenanceDetailScreen;
