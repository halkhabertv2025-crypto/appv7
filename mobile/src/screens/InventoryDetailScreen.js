import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Button, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../api/client';
import { Ionicons } from '@expo/vector-icons';

const InventoryDetailScreen = ({ route, navigation }) => {
  const { id, title } = route.params;
  const [inventory, setInventory] = useState(null);
  const [accessories, setAccessories] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      // 1. Fetch inventory details
      const invResponse = await client.get(`/envanterler/${id}`);
      setInventory(invResponse.data);

      // 2. Fetch accessories
      const accResponse = await client.get(`/envanterler/${id}/accessories`);
      setAccessories(accResponse.data);

      // 3. Fetch history
      const histResponse = await client.get(`/envanterler/${id}/gecmis`);
      // Sort history by date desc
      const sortedHistory = (histResponse.data || []).sort((a, b) =>
        new Date(b.tarih) - new Date(a.tarih)
      );
      setHistory(sortedHistory);

    } catch (error) {
      console.log('Error fetching details:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleDelete = () => {
    Alert.alert(
      'Envanteri Sil',
      'Bu envanteri silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await client.delete(`/envanterler/${id}`);
              navigation.navigate('InventoryList', { refresh: true });
            } catch (error) {
              console.log('Delete error:', error);
              Alert.alert('Hata', 'Silme işlemi başarısız oldu.');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Zimmetli': return '#3b82f6'; // blue
      case 'Depoda': return '#22c55e'; // green
      case 'Arızalı': return '#ef4444'; // red
      case 'Kayıp': return '#f97316'; // orange
      default: return '#64748b'; // gray
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  if (!inventory) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Envanter bulunamadı.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#14b8a6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Envanter Detayı</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('InventoryForm', { isEdit: true, inventoryId: id })} style={styles.headerBtn}>
            <Ionicons name="pencil" size={22} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
            <Ionicons name="trash" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Main Info Card */}
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.brand}>{inventory.marka}</Text>
              <Text style={styles.model}>{inventory.model}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: getStatusColor(inventory.durum) }]}>
              <Text style={styles.badgeText}>{inventory.durum}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Seri No</Text>
              <Text style={styles.value}>{inventory.seriNumarasi}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Tür</Text>
              <Text style={styles.value}>{inventory.envanterTipiAd || '-'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Alım Tarihi</Text>
              <Text style={styles.value}>{inventory.alimTarihi || '-'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Garanti</Text>
              <Text style={styles.value}>{inventory.garantiBitisTarihi || '-'}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionContainer}>
          {inventory.durum === 'Depoda' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.zimmetButton]}
              onPress={() => navigation.navigate('ZimmetScreen', {
                inventoryId: inventory.id,
                inventoryTitle: `${inventory.marka} ${inventory.model}`
              })}
            >
              <Text style={styles.actionButtonText}>Zimmetle</Text>
            </TouchableOpacity>
          )}

          {inventory.durum === 'Zimmetli' && inventory.zimmetBilgisi && (
            <TouchableOpacity
              style={[styles.actionButton, styles.returnButton]}
              onPress={() => navigation.navigate('ReturnScreen', {
                inventoryId: inventory.id,
                inventoryTitle: `${inventory.marka} ${inventory.model}`,
                zimmetId: inventory.zimmetBilgisi.id
              })}
            >
              <Text style={styles.actionButtonText}>İade Al</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Current Assignment */}
        {inventory.zimmetBilgisi && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mevcut Zimmet</Text>
            <View style={styles.card}>
              <Text style={styles.assignedName}>{inventory.zimmetBilgisi.calisanAd}</Text>
              <Text style={styles.assignedDate}>{inventory.zimmetBilgisi.zimmetTarihi} tarihinde zimmetlendi</Text>
            </View>
          </View>
        )}

        {/* Accessories */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Aksesuarlar ({accessories.length})</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AccessoryForm', { inventoryId: id })}
              style={{ padding: 4 }}
            >
              <Ionicons name="add-circle" size={24} color="#14b8a6" />
            </TouchableOpacity>
          </View>

          {accessories.length > 0 ? (
            accessories.map((acc, index) => (
              <TouchableOpacity
                key={acc.id || index}
                style={styles.accessoryCard}
                onPress={() => navigation.navigate('AccessoryForm', {
                  isEdit: true,
                  inventoryId: id,
                  accessoryId: acc.id,
                  accessoryData: acc
                })}
              >
                <Text style={styles.accName}>{acc.ad || acc.tur || 'Aksesuar'}</Text>
                <Text style={styles.accDesc}>{acc.marka} {acc.model}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>Aksesuar yok.</Text>
          )}
        </View>

        {/* History Summary */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>İşlem Geçmişi</Text>
            <TouchableOpacity onPress={() => navigation.navigate('History', { inventoryId: id, inventoryTitle: `${inventory.marka} ${inventory.model}` })}>
              <Text style={{ color: '#3b82f6', fontWeight: '600' }}>Tümünü Gör</Text>
            </TouchableOpacity>
          </View>
          {history.slice(0, 5).map((item, index) => (
            <View key={index} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyType}>{item.islemTuru}</Text>
                <Text style={styles.historyDate}>{new Date(item.tarih).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.historyDesc}>{item.aciklama || item.detay}</Text>
              <Text style={styles.historyUser}>İşlemi Yapan: {item.islemYapan}</Text>
            </View>
          ))}
          {history.length === 0 && <Text style={styles.emptyText}>Geçmiş kaydı bulunamadı.</Text>}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 8,
  },
  backButtonText: {
    color: '#14b8a6',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBtn: {
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brand: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  model: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoItem: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
  },
  section: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 12,
    marginLeft: 4,
  },
  assignedName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  assignedDate: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  accessoryCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#14b8a6',
  },
  accName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334155',
  },
  accDesc: {
    fontSize: 14,
    color: '#64748b',
  },
  emptyText: {
    color: '#94a3b8',
    fontStyle: 'italic',
    marginLeft: 4,
  },
  historyCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#cbd5e1',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334155',
  },
  historyDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  historyDesc: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 4,
  },
  historyUser: {
    fontSize: 12,
    color: '#94a3b8',
  },
  actionContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  zimmetButton: {
    backgroundColor: '#14b8a6', // teal
  },
  returnButton: {
    backgroundColor: '#ef4444', // red
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#ef4444',
  }
});

export default InventoryDetailScreen;
