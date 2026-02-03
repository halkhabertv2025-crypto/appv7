import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  RefreshControl, 
  TouchableOpacity,
  TextInput
} from 'react-native';
import client from '../api/client';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const EmployeeListScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Aktif'); // 'Aktif' | 'Pasif' | 'Tümü'

  const fetchEmployees = async () => {
    try {
      const response = await client.get('/calisanlar');
      setEmployees(response.data);
      filterEmployees(response.data, searchQuery, activeFilter);
    } catch (error) {
      console.log('Error fetching employees:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchEmployees();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    filterEmployees(employees, searchQuery, activeFilter);
  }, [searchQuery, activeFilter, employees]);

  const filterEmployees = (data, query, filter) => {
    let result = data;

    // Filter by status
    if (filter !== 'Tümü') {
      result = result.filter(e => 
        filter === 'Aktif' ? e.durum === 'Aktif' : e.durum !== 'Aktif'
      );
    }

    // Filter by search query
    if (query) {
      const lowerQuery = query.toLowerCase();
      result = result.filter(e => 
        e.adSoyad.toLowerCase().includes(lowerQuery) ||
        (e.email && e.email.toLowerCase().includes(lowerQuery)) ||
        (e.departmanAd && e.departmanAd.toLowerCase().includes(lowerQuery))
      );
    }

    setFilteredEmployees(result);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEmployees();
  };

  const counts = useMemo(() => {
    return {
      active: employees.filter(e => e.durum === 'Aktif').length,
      passive: employees.filter(e => e.durum !== 'Aktif').length
    };
  }, [employees]);

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('EmployeeDetail', { id: item.id, title: item.adSoyad })}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.name}>{item.adSoyad}</Text>
          {item.zimmetliMi && (
             <View style={styles.badgeContainer}>
               <Text style={styles.zimmetBadge}>{item.aktifZimmetSayisi} Zimmet</Text>
             </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
      </View>
      
      <Text style={styles.department}>
        {item.departmanAd}
        {item.yoneticiYetkisi ? ' • Yönetici' : ''}
        {item.adminYetkisi ? ' • Admin' : ''}
      </Text>
      
      {item.email && <Text style={styles.email}>{item.email}</Text>}
      
      <View style={styles.statusRow}>
        <View style={[
          styles.statusBadge, 
          item.durum === 'Aktif' ? styles.statusActive : styles.statusPassive
        ]}>
          <Text style={[
            styles.statusText,
            item.durum === 'Aktif' ? styles.textActive : styles.textPassive
          ]}>{item.durum}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle}>Çalışanlar</Text>
          <View style={styles.headerCounts}>
             <Text style={styles.activeCount}>{counts.active} Aktif</Text>
             {counts.passive > 0 && <Text style={styles.passiveCount}> / {counts.passive} Pasif</Text>}
          </View>
        </View>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="İsim, email veya departman..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.filterContainer}>
          <TouchableOpacity 
            style={[styles.filterButton, activeFilter === 'Aktif' && styles.filterActive]}
            onPress={() => setActiveFilter('Aktif')}
          >
             <Text style={[styles.filterText, activeFilter === 'Aktif' && styles.filterTextActive]}>Aktif</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, activeFilter === 'Pasif' && styles.filterActive]}
            onPress={() => setActiveFilter('Pasif')}
          >
             <Text style={[styles.filterText, activeFilter === 'Pasif' && styles.filterTextActive]}>Pasif</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, activeFilter === 'Tümü' && styles.filterActive]}
            onPress={() => setActiveFilter('Tümü')}
          >
             <Text style={[styles.filterText, activeFilter === 'Tümü' && styles.filterTextActive]}>Tümü</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
        </View>
      ) : (
        <FlatList
          data={filteredEmployees}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>Çalışan bulunamadı.</Text>
          }
        />
      )}
      
      {user?.yoneticiYetkisi || user?.adminYetkisi ? (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => navigation.navigate('EmployeeForm', { isEdit: false })}
        >
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      ) : null}
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
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  headerCounts: {
    flexDirection: 'row',
  },
  activeCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16a34a',
  },
  passiveCount: {
    fontSize: 14,
    color: '#94a3b8',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: '100%', color: '#0f172a' },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  filterActive: {
    backgroundColor: '#0f172a',
  },
  filterText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  filterTextActive: {
    color: 'white',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
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
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  badgeContainer: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  zimmetBadge: {
    fontSize: 10,
    color: '#991b1b',
    fontWeight: '700',
  },
  department: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 2,
  },
  email: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusActive: { backgroundColor: '#dcfce7' },
  statusPassive: { backgroundColor: '#f1f5f9' },
  statusText: { fontSize: 11, fontWeight: '600' },
  textActive: { color: '#166534' },
  textPassive: { color: '#475569' },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#64748b',
    fontSize: 16,
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
});

export default EmployeeListScreen;
