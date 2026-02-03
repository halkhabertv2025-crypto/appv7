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
  ScrollView,
  Modal
} from 'react-native';
import client from '../api/client';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const ZimmetListScreen = ({ navigation }) => {
  const [zimmetler, setZimmetler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('Aktif'); // Aktif, İade Edildi, all

  const fetchZimmetler = async () => {
    try {
      const response = await client.get('/zimmetler');
      setZimmetler(response.data);
    } catch (error) {
      console.log('Error fetching zimmetler:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchZimmetler();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchZimmetler();
  };

  const filteredZimmetler = useMemo(() => {
    return zimmetler.filter(item => {
      // Search
      const searchLower = search.toLowerCase();
      const searchMatch = !search ||
        item.envanterBilgisi?.marka?.toLowerCase().includes(searchLower) ||
        item.envanterBilgisi?.model?.toLowerCase().includes(searchLower) ||
        item.envanterBilgisi?.seriNumarasi?.toLowerCase().includes(searchLower) ||
        item.calisanAd?.toLowerCase().includes(searchLower);

      // Status
      const statusMatch = statusFilter === 'all' || item.durum === statusFilter;

      return searchMatch && statusMatch;
    });
  }, [zimmetler, search, statusFilter]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Aktif': return '#22c55e'; // green
      case 'İade Edildi': return '#64748b'; // gray
      default: return '#3b82f6'; // blue
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('AssignmentDetail', { assignmentId: item.id, assignmentData: item })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.date}>Zimmet Tarihi: {new Date(item.zimmetTarihi).toLocaleDateString('tr-TR')}</Text>
        <View style={[styles.badge, { backgroundColor: getStatusColor(item.durum) }]}>
          <Text style={styles.badgeText}>{item.durum}</Text>
        </View>
      </View>

      {item.envanterBilgisi && (
        <View style={styles.infoRow}>
          <Ionicons name="cube-outline" size={16} color="#64748b" style={{ marginRight: 6 }} />
          <View>
            <Text style={styles.infoTitle}>{item.envanterBilgisi.marka} {item.envanterBilgisi.model}</Text>
            <Text style={styles.infoSub}>{item.envanterBilgisi.seriNumarasi}</Text>
          </View>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.infoRow}>
        <Ionicons name="person-outline" size={16} color="#64748b" style={{ marginRight: 6 }} />
        <View>
          <Text style={styles.infoTitle}>{item.calisanAd}</Text>
          <Text style={styles.infoSub}>{item.departmanAd}</Text>
        </View>
      </View>

      {item.durum === 'İade Edildi' && item.iadeAlanYetkili && (
        <View style={[styles.infoRow, { marginTop: 8 }]}>
          <Ionicons name="return-down-back" size={16} color="#ef4444" style={{ marginRight: 6 }} />
          <Text style={styles.returnText}>İade Alan: {item.iadeAlanYetkili.adSoyad}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Zimmet Listesi</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Ara: Envanter, Çalışan..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Horizontal Status Filter */}
      <View style={{ height: 50 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusFilters}>
          {['Aktif', 'İade Edildi', 'all'].map(status => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                statusFilter === status && styles.activeFilterChip
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
          data={filteredZimmetler}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>Zimmet kaydı bulunamadı.</Text>
          }
        />
      )}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ZimmetScreen', {
          inventoryId: null,
          inventoryTitle: 'Yeni Zimmet'
        })}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
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
    marginBottom: 12,
  },
  date: {
    fontSize: 12,
    color: '#64748b',
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  infoSub: {
    fontSize: 12,
    color: '#64748b',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 8,
  },
  returnText: {
    fontSize: 12,
    color: '#ef4444',
    fontStyle: 'italic'
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#64748b',
    fontSize: 16,
  }
});

export default ZimmetListScreen;
