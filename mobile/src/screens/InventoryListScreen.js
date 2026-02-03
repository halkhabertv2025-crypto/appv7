import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  RefreshControl,
  Modal,
  ScrollView
} from 'react-native';
import client from '../api/client';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const InventoryListScreen = ({ navigation, route }) => {
  const [inventories, setInventories] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all'); // all, Depoda, Zimmetli, Arızalı, Kayıp
  const [typeFilter, setTypeFilter] = useState('all');
  const [showFilterModal, setShowFilterModal] = useState(false);

  const fetchInventories = async () => {
    try {
      const [invRes, typeRes] = await Promise.all([
        client.get('/envanterler'),
        client.get('/envanter-tipleri')
      ]);
      setInventories(invRes.data);
      setTypes(typeRes.data);
      
      // Initial search param
      if (route.params?.searchQuery) {
        setSearch(route.params.searchQuery);
      }

    } catch (error) {
      console.log('Error fetching inventories:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInventories();
  }, [route.params?.searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInventories();
  };

  const filteredInventories = useMemo(() => {
    return inventories.filter(item => {
      // Search
      const searchMatch = !search || 
        item.marka?.toLowerCase().includes(search.toLowerCase()) ||
        item.model?.toLowerCase().includes(search.toLowerCase()) ||
        item.seriNumarasi?.toLowerCase().includes(search.toLowerCase());
      
      // Status
      const statusMatch = statusFilter === 'all' || item.durum === statusFilter;

      // Type
      const typeMatch = typeFilter === 'all' || item.envanterTipiId === typeFilter;

      return searchMatch && statusMatch && typeMatch;
    });
  }, [inventories, search, statusFilter, typeFilter]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Zimmetli': return '#3b82f6'; // blue
      case 'Depoda': return '#f97316'; // orange (matching web)
      case 'Arızalı': return '#ef4444'; // red
      case 'Kayıp': return '#ef4444'; // red
      case 'Aktif': return '#22c55e'; // green (accessory status)
      default: return '#64748b'; // gray
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('InventoryDetail', { id: item.id, title: `${item.marka} ${item.model}` })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.type}>{item.envanterTipiAd}</Text>
        <View style={[styles.badge, { backgroundColor: getStatusColor(item.durum) }]}>
          <Text style={styles.badgeText}>{item.durum}</Text>
        </View>
      </View>
      
      <Text style={styles.title}>{item.marka} {item.model}</Text>
      <Text style={styles.serial}>SN: {item.seriNumarasi}</Text>
      
      {item.zimmetBilgisi && (
        <View style={styles.zimmetInfo}>
          <Text style={styles.zimmetLabel}>Zimmetli:</Text>
          <Text style={styles.zimmetValue}>{item.zimmetBilgisi.calisanAd}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Envanter Listesi</Text>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterModal(true)}>
           <Ionicons name="filter" size={20} color={typeFilter !== 'all' || statusFilter !== 'all' ? '#14b8a6' : '#64748b'} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Ara: Marka, Model, Seri No..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Horizontal Status Filter (Quick Access) */}
      <View style={{ height: 50 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusFilters}>
          {['all', 'Depoda', 'Zimmetli', 'Arızalı', 'Kayıp'].map(status => (
            <TouchableOpacity 
              key={status}
              style={[
                styles.filterChip, 
                statusFilter === status && styles.activeFilterChip,
                styles[`chip${status}`]
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[
                styles.filterText, 
                statusFilter === status && styles.activeFilterText
              ]}>
                {status === 'all' ? 'Tümü' : status}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
        </View>
      ) : (
        <FlatList
          data={filteredInventories}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>Envanter bulunamadı.</Text>
          }
        />
      )}

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('InventoryForm')}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
      
      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
         <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
               <View style={styles.modalHeader}>
                 <Text style={styles.modalTitle}>Filtrele</Text>
                 <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                   <Ionicons name="close" size={24} color="#0f172a" />
                 </TouchableOpacity>
               </View>
               
               <Text style={styles.filterLabel}>Envanter Tipi</Text>
               <ScrollView style={{ maxHeight: 300 }}>
                 <TouchableOpacity 
                   style={[styles.modalOption, typeFilter === 'all' && styles.selectedOption]}
                   onPress={() => { setTypeFilter('all'); setShowFilterModal(false); }}
                 >
                   <Text style={[styles.modalOptionText, typeFilter === 'all' && styles.selectedOptionText]}>Tümü</Text>
                   {typeFilter === 'all' && <Ionicons name="checkmark" size={20} color="#14b8a6" />}
                 </TouchableOpacity>
                 {types.map(type => (
                   <TouchableOpacity 
                     key={type.id}
                     style={[styles.modalOption, typeFilter === type.id && styles.selectedOption]}
                     onPress={() => { setTypeFilter(type.id); setShowFilterModal(false); }}
                   >
                     <Text style={[styles.modalOptionText, typeFilter === type.id && styles.selectedOptionText]}>{type.ad}</Text>
                     {typeFilter === type.id && <Ionicons name="checkmark" size={20} color="#14b8a6" />}
                   </TouchableOpacity>
                 ))}
               </ScrollView>
               
               <TouchableOpacity 
                 style={styles.clearFilter}
                 onPress={() => { setTypeFilter('all'); setStatusFilter('all'); setShowFilterModal(false); }}
               >
                 <Text style={styles.clearFilterText}>Filtreleri Temizle</Text>
               </TouchableOpacity>
            </View>
         </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  filterBtn: {
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  statusFilters: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activeFilterChip: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  filterText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  activeFilterText: {
    color: 'white',
  },
  listContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  type: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  serial: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  zimmetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  zimmetLabel: {
    fontSize: 13,
    color: '#64748b',
    marginRight: 4,
  },
  zimmetValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#64748b',
    fontSize: 16,
  },
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
    paddingBottom: 40,
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
  filterLabel: {
    padding: 16,
    paddingBottom: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  selectedOption: {
    backgroundColor: '#f0fdfa',
  },
  modalOptionText: { fontSize: 16, color: '#334155' },
  selectedOptionText: { color: '#0f172a', fontWeight: 'bold' },
  clearFilter: {
    margin: 16,
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    alignItems: 'center',
  },
  clearFilterText: { color: '#64748b', fontWeight: '600' },
});

export default InventoryListScreen;
