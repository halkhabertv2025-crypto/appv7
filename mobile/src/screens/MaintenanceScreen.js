import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Modal, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const MaintenanceScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showFilterModal, setShowFilterModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchData = async () => {
    try {
      const [recRes, statRes] = await Promise.all([
        client.get('/bakim-kayitlari'),
        client.get('/bakim-istatistikleri')
      ]);
      setRecords(recRes.data);
      setStats(statRes.data);
    } catch (error) {
      console.log('Error fetching maintenance data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filteredRecords = useMemo(() => {
    return records.filter(item => {
      const searchMatch = !search || 
        item.envanterBilgisi?.marka?.toLowerCase().includes(search.toLowerCase()) ||
        item.envanterBilgisi?.model?.toLowerCase().includes(search.toLowerCase()) ||
        item.servisFirma?.toLowerCase().includes(search.toLowerCase()) ||
        item.aciklama?.toLowerCase().includes(search.toLowerCase());
      
      const statusMatch = statusFilter === 'all' || item.durum === statusFilter;
      const typeMatch = typeFilter === 'all' || item.arizaTuru === typeFilter;

      return searchMatch && statusMatch && typeMatch;
    });
  }, [records, search, statusFilter, typeFilter]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Beklemede': return '#eab308'; // yellow
      case 'Serviste': return '#3b82f6'; // blue
      case 'Tamamlandı': return '#22c55e'; // green
      case 'İptal': return '#64748b'; // gray
      default: return '#64748b';
    }
  };

  const getArizaIcon = (tip) => {
      switch (tip) {
          case 'Donanım': return 'hardware-chip-outline';
          case 'Yazılım': return 'code-slash-outline';
          case 'Hasar': return 'alert-circle-outline';
          case 'Bakım': return 'construct-outline';
          default: return 'build-outline';
      }
  };

  const formatCurrency = (amount, currency) => {
      const symbols = { TRY: '₺', USD: '$', EUR: '€', GBP: '£' };
      return `${symbols[currency] || ''}${amount?.toLocaleString('tr-TR') || '0'}`;
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('MaintenanceDetail', { id: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.typeBadge}>
            <Ionicons name={getArizaIcon(item.arizaTuru)} size={14} color="#4b5563" style={{ marginRight: 4 }} />
            <Text style={styles.typeText}>{item.arizaTuru}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.durum) }]}>
          <Text style={styles.statusText}>{item.durum}</Text>
        </View>
      </View>
      
      <Text style={styles.invTitle}>
          {item.envanterBilgisi 
            ? `${item.envanterBilgisi.marka} ${item.envanterBilgisi.model}` 
            : 'Bilinmeyen Envanter'}
      </Text>
      
      <Text style={styles.desc} numberOfLines={2}>{item.aciklama}</Text>

      <View style={styles.footer}>
         <View style={styles.footerItem}>
             <Ionicons name="calendar-outline" size={14} color="#64748b" />
             <Text style={styles.footerText}>
               {item.bildirilenTarih ? new Date(item.bildirilenTarih).toLocaleDateString() : '-'}
             </Text>
         </View>
         <View style={styles.footerItem}>
             <Ionicons name="business-outline" size={14} color="#64748b" />
             <Text style={styles.footerText}>{item.servisFirma || '-'}</Text>
         </View>
         {item.maliyet > 0 && (
             <View style={styles.footerItem}>
                 <Text style={[styles.footerText, { fontWeight: 'bold', color: '#0f172a' }]}>
                    {formatCurrency(item.maliyet, item.paraBirimi)}
                 </Text>
             </View>
         )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bakım & Onarım</Text>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterModal(true)}>
             <Ionicons name="filter" size={22} color={typeFilter !== 'all' || statusFilter !== 'all' ? '#14b8a6' : '#64748b'} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Ara..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Stats Cards - Horizontal Scroll */}
      {stats && (
          <View style={{ height: 100 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsContainer}>
                <View style={[styles.statCard, { backgroundColor: '#fefce8', borderColor: '#fef08a' }]}>
                    <Text style={[styles.statTitle, { color: '#854d0e' }]}>Beklemede</Text>
                    <Text style={[styles.statValue, { color: '#ca8a04' }]}>{stats.beklemede}</Text>
                    <Ionicons name="time" size={20} color="#ca8a04" style={styles.statIcon} />
                </View>
                <View style={[styles.statCard, { backgroundColor: '#eff6ff', borderColor: '#dbeafe' }]}>
                    <Text style={[styles.statTitle, { color: '#1e3a8a' }]}>Serviste</Text>
                    <Text style={[styles.statValue, { color: '#2563eb' }]}>{stats.serviste}</Text>
                    <Ionicons name="construct" size={20} color="#2563eb" style={styles.statIcon} />
                </View>
                <View style={[styles.statCard, { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' }]}>
                    <Text style={[styles.statTitle, { color: '#14532d' }]}>Tamamlandı</Text>
                    <Text style={[styles.statValue, { color: '#16a34a' }]}>{stats.tamamlanan}</Text>
                    <Ionicons name="checkmark-circle" size={20} color="#16a34a" style={styles.statIcon} />
                </View>
                <View style={[styles.statCard, { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', width: 140 }]}>
                    <Text style={styles.statTitle}>Toplam Maliyet</Text>
                    <Text style={[styles.statValue, { fontSize: 16 }]}>{formatCurrency(stats.toplamMaliyet?.TRY || 0, 'TRY')}</Text>
                    <Ionicons name="cash" size={20} color="#64748b" style={styles.statIcon} />
                </View>
            </ScrollView>
          </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#14b8a6" /></View>
      ) : (
        <FlatList
          data={filteredRecords}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Kayıt bulunamadı.</Text>}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('MaintenanceForm')}>
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
              <Text style={styles.filterLabel}>Arıza Türü</Text>
              <View style={styles.filterOptions}>
                {['all', 'Donanım', 'Yazılım', 'Hasar', 'Bakım'].map(t => (
                  <TouchableOpacity 
                    key={t}
                    style={[styles.filterOption, typeFilter === t && styles.activeFilterOption]}
                    onPress={() => setTypeFilter(t)}
                  >
                    <Text style={[styles.filterOptionText, typeFilter === t && styles.activeFilterOptionText]}>{t === 'all' ? 'Tümü' : t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterLabel}>Durum</Text>
               <View style={styles.filterOptions}>
                {['all', 'Beklemede', 'Serviste', 'Tamamlandı', 'İptal'].map(s => (
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
             <TouchableOpacity style={styles.clearFilter} onPress={() => { setTypeFilter('all'); setStatusFilter('all'); setShowFilterModal(false); }}>
                <Text style={styles.clearFilterText}>Temizle</Text>
             </TouchableOpacity>
          </View>
        </View>
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
  filterBtn: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 8 },
  searchContainer: { padding: 16, backgroundColor: 'white', paddingBottom: 8 },
  searchBox: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 12, alignItems: 'center' },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16 },
  listContent: { padding: 16, paddingTop: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#64748b' },
  
  // Stats
  statsContainer: { paddingHorizontal: 16, gap: 12, paddingBottom: 16 },
  statCard: {
      width: 110,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      justifyContent: 'space-between',
      marginRight: 8
  },
  statTitle: { fontSize: 12, fontWeight: '600', marginBottom: 4, color: '#64748b' },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  statIcon: { position: 'absolute', bottom: 8, right: 8, opacity: 0.2 },

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
  typeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  typeText: { color: '#4b5563', fontSize: 12, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  invTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  desc: { fontSize: 14, color: '#64748b', marginBottom: 12 },
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
});

export default MaintenanceScreen;
