import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Modal, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const DigitalAssetsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Category Management Modal
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Listen for focus to refresh if needed (e.g. after add/edit)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // We could allow manual refresh or auto. Let's do auto if time permits/performance is ok
      fetchData();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchData = async () => {
    try {
      const [assetRes, catRes] = await Promise.all([
        client.get('/dijital-varliklar'),
        client.get('/dijital-varlik-kategorileri')
      ]);
      setAssets(assetRes.data);
      setCategories(catRes.data);
    } catch (error) {
      console.log('Error fetching digital assets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Category Management
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      await client.post('/dijital-varlik-kategorileri', {
        ad: newCategoryName,
        aciklama: '',
        userId: user?.id,
        userName: user?.adSoyad
      });
      setNewCategoryName('');
      // Refresh categories
      const catRes = await client.get('/dijital-varlik-kategorileri');
      setCategories(catRes.data);
      Alert.alert('Başarılı', 'Kategori eklendi.');
    } catch (error) {
      Alert.alert('Hata', 'Kategori eklenemedi.');
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    Alert.alert('Sil', 'Kategoriyi silmek istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
          try {
            await client.delete(`/dijital-varlik-kategorileri/${id}`, {
              data: { userId: user?.id, userName: user?.adSoyad }
            });
            const catRes = await client.get('/dijital-varlik-kategorileri');
            setCategories(catRes.data);
          } catch (error) {
            Alert.alert('Hata', 'Kategori silinemedi (Kullanımda olabilir).');
          }
      }}
    ]);
  };

  const filteredAssets = useMemo(() => {
    return assets.filter(item => {
      const searchMatch = !search || 
        item.ad?.toLowerCase().includes(search.toLowerCase()) ||
        item.keyBilgisi?.toLowerCase().includes(search.toLowerCase());
      
      const catMatch = categoryFilter === 'all' || item.kategoriId === categoryFilter;
      const statusMatch = statusFilter === 'all' || item.durum === statusFilter;

      return searchMatch && catMatch && statusMatch;
    });
  }, [assets, search, categoryFilter, statusFilter]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Aktif': return '#22c55e';
      case 'Pasif': return '#64748b';
      case 'Süresi Dolmuş': return '#ef4444';
      default: return '#64748b';
    }
  };

  const isExpiringSoon = (dateStr) => {
    if (!dateStr) return false;
    const diff = new Date(dateStr) - new Date();
    const days = diff / (1000 * 60 * 60 * 24);
    return days > 0 && days <= 30;
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('DigitalAssetDetail', { id: item.id, title: item.ad })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.catBadge}>
            <Text style={styles.catText}>{item.kategoriAd}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.durum) }]}>
          <Text style={styles.statusText}>{item.durum}</Text>
        </View>
      </View>
      
      <Text style={styles.title}>{item.ad}</Text>
      
      {item.kullaniciAdi && (
        <Text style={styles.subtitle}>{item.kullaniciAdi}</Text>
      )}

      <View style={styles.footer}>
         <View style={styles.footerItem}>
             <Ionicons name="time-outline" size={14} color="#64748b" />
             <Text style={styles.footerText}>
               {item.lisansTipi === 'Süresiz' ? 'Süresiz' : (
                 item.bitisTarihi ? new Date(item.bitisTarihi).toLocaleDateString() : '-'
               )}
             </Text>
             {isExpiringSoon(item.bitisTarihi) && (
                 <Ionicons name="warning" size={14} color="#ef4444" style={{ marginLeft: 4 }} />
             )}
         </View>
         {item.calisanAd !== '-' && item.calisanAd && (
            <View style={styles.footerItem}>
                <Ionicons name="person-outline" size={14} color="#64748b" />
                <Text style={styles.footerText} numberOfLines={1}>{item.calisanAd}</Text>
            </View>
         )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dijital Varlıklar</Text>
        <View style={styles.headerButtons}>
           <TouchableOpacity style={styles.iconBtn} onPress={() => setShowCategoryManager(true)}>
             <Ionicons name="library-outline" size={22} color="#64748b" />
           </TouchableOpacity>
           <TouchableOpacity style={styles.iconBtn} onPress={() => setShowFilterModal(true)}>
             <Ionicons name="filter" size={22} color={categoryFilter !== 'all' || statusFilter !== 'all' ? '#14b8a6' : '#64748b'} />
           </TouchableOpacity>
        </View>
      </View>

      {/* Stats Summary could go here but let's stick to list for space */}

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Ara: Varlık Adı, Key..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#14b8a6" /></View>
      ) : (
        <FlatList
          data={filteredAssets}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Kayıt bulunamadı.</Text>}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('DigitalAssetForm')}>
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrele</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}><Ionicons name="close" size={24} color="#0f172a" /></TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.filterLabel}>Kategori</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity 
                  style={[styles.filterOption, categoryFilter === 'all' && styles.activeFilterOption]}
                  onPress={() => setCategoryFilter('all')}
                >
                  <Text style={[styles.filterOptionText, categoryFilter === 'all' && styles.activeFilterOptionText]}>Tümü</Text>
                </TouchableOpacity>
                {categories.map(c => (
                  <TouchableOpacity 
                    key={c.id}
                    style={[styles.filterOption, categoryFilter === c.id && styles.activeFilterOption]}
                    onPress={() => setCategoryFilter(c.id)}
                  >
                    <Text style={[styles.filterOptionText, categoryFilter === c.id && styles.activeFilterOptionText]}>{c.ad}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterLabel}>Durum</Text>
               <View style={styles.filterOptions}>
                {['all', 'Aktif', 'Pasif', 'Süresi Dolmuş'].map(s => (
                  <TouchableOpacity 
                    key={s}
                    style={[styles.filterOption, statusFilter === s && styles.activeFilterOption]}
                    onPress={() => setStatusFilter(s)}
                  >
                    <Text style={[styles.filterOptionText, statusFilter === s && styles.activeFilterOptionText]}>{s === 'all' ? 'Tümü' : s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
             <TouchableOpacity style={styles.clearFilter} onPress={() => { setCategoryFilter('all'); setStatusFilter('all'); setShowFilterModal(false); }}>
                <Text style={styles.clearFilterText}>Temizle</Text>
             </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Category Manager Modal */}
      <Modal visible={showCategoryManager} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowCategoryManager(false)}>
              <Text style={styles.backButtonText}>Kapat</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Kategoriler</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
            <View style={styles.addCatRow}>
              <TextInput 
                style={styles.addCatInput} 
                placeholder="Yeni Kategori Adı" 
                value={newCategoryName}
                onChangeText={setNewCategoryName}
              />
              <TouchableOpacity onPress={handleAddCategory} disabled={creatingCategory} style={styles.addCatBtn}>
                 {creatingCategory ? <ActivityIndicator color="white" /> : <Ionicons name="add" size={24} color="white" />}
              </TouchableOpacity>
            </View>
          </View>
          <FlatList 
            data={categories}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.catItem}>
                <Text style={styles.catItemText}>{item.ad}</Text>
                <TouchableOpacity onPress={() => handleDeleteCategory(item.id)}>
                   <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={{ padding: 16 }}
          />
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  headerButtons: { flexDirection: 'row', gap: 12 },
  iconBtn: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 8 },
  backButtonText: { color: '#ef4444', fontSize: 16 },
  searchContainer: { padding: 16, backgroundColor: 'white' },
  searchBox: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 12, alignItems: 'center' },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16 },
  listContent: { padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#64748b' },
  
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
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  catBadge: { backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  catText: { color: '#0369a1', fontSize: 12, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  title: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 12 },
  footer: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12, gap: 16 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 12, color: '#64748b' },
  
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#14b8a6',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  filterLabel: { padding: 16, paddingBottom: 8, fontSize: 14, fontWeight: '600', color: '#64748b' },
  filterOptions: { paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 16 },
  filterOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  activeFilterOption: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  filterOptionText: { color: '#64748b' },
  activeFilterOptionText: { color: 'white' },
  clearFilter: { margin: 16, padding: 12, backgroundColor: '#f1f5f9', borderRadius: 8, alignItems: 'center' },
  clearFilterText: { color: '#64748b', fontWeight: '600' },

  // Cat Manager Styles
  addCatRow: { flexDirection: 'row', gap: 8 },
  addCatInput: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 8, padding: 12 },
  addCatBtn: { width: 48, backgroundColor: '#14b8a6', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  catItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  catItemText: { fontSize: 16, color: '#0f172a' },
});

export default DigitalAssetsScreen;
