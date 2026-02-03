import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import client from '../api/client';
import { Ionicons } from '@expo/vector-icons';

const AuditLogScreen = ({ navigation }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // Filters
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [entityType, setEntityType] = useState('');

  const actionLabels = {
    'CREATE_EMPLOYEE': 'Çalışan Oluşturma',
    'UPDATE_EMPLOYEE': 'Çalışan Güncelleme',
    'DELETE_EMPLOYEE': 'Çalışan Silme',
    'CREATE_INVENTORY': 'Envanter Oluşturma',
    'UPDATE_INVENTORY': 'Envanter Güncelleme',
    'UPDATE_INVENTORY_STATUS': 'Durum Değişikliği',
    'DELETE_INVENTORY': 'Envanter Silme',
    'CREATE_ZIMMET': 'Zimmet Atama',
    'RETURN_ZIMMET': 'Zimmet İade',
    'CREATE_DIGITAL_ASSET': 'Dijital Varlık Ekleme',
    'UPDATE_DIGITAL_ASSET': 'Dijital Varlık Güncelleme',
    'DELETE_DIGITAL_ASSET': 'Dijital Varlık Silme',
    'CREATE_MAINTENANCE': 'Bakım Kaydı',
    'UPDATE_MAINTENANCE': 'Bakım Güncelleme'
  };

  useEffect(() => {
    fetchLogs(1, true);
  }, [actionType, entityType]);

  const fetchLogs = async (pageNum, reset = false) => {
    if (reset) setLoading(true);
    try {
      const params = {
        page: pageNum,
        limit: 20,
        ...(actionType && { actionType }),
        ...(entityType && { entityType })
      };
      
      const response = await client.get('/audit-logs', { params });
      const newLogs = response.data; // API returns array directly
      
      if (reset) {
        setLogs(newLogs);
      } else {
        setLogs(prev => [...prev, ...newLogs]);
      }
      
      setHasMore(newLogs.length === 20);
      setPage(pageNum);
    } catch (error) {
      console.log('Audit log fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchLogs(page + 1);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.logItem}>
      <View style={styles.logHeader}>
         <Text style={styles.actor}>{item.actorUserName || 'Sistem'}</Text>
         <Text style={styles.date}>{new Date(item.createdAt).toLocaleString('tr-TR')}</Text>
      </View>
      <View style={styles.actionRow}>
         <View style={styles.actionBadge}>
             <Text style={styles.actionText}>{actionLabels[item.actionType] || item.actionType}</Text>
         </View>
         <Text style={styles.entityText}>{item.entityType} #{item.entityId?.substring(0,6)}</Text>
      </View>
      {item.details && (
          <Text style={styles.detailText} numberOfLines={2}>{JSON.stringify(item.details)}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
           <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>İşlem Geçmişi</Text>
        <TouchableOpacity onPress={() => setShowFilterModal(true)} style={styles.filterBtn}>
           <Ionicons name="filter" size={22} color={actionType || entityType ? '#14b8a6' : '#64748b'} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={logs}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading && !logs.length ? <ActivityIndicator size="large" color="#14b8a6" style={{ marginTop: 20 }} /> : null}
        ListEmptyComponent={!loading && <Text style={styles.emptyText}>Kayıt bulunamadı.</Text>}
      />

       {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrele</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}><Ionicons name="close" size={24} color="#0f172a" /></TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.filterLabel}>Varlık Türü</Text>
              <View style={styles.filterOptions}>
                {['', 'Inventory', 'Employee', 'Zimmet', 'DigitalAsset', 'item'].map(t => (
                  <TouchableOpacity 
                    key={t}
                    style={[styles.filterOption, entityType === t && styles.activeFilterOption]}
                    onPress={() => setEntityType(t)}
                  >
                    <Text style={[styles.filterOptionText, entityType === t && styles.activeFilterOptionText]}>{t === '' ? 'Tümü' : t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
             <TouchableOpacity style={styles.clearFilter} onPress={() => { setActionType(''); setEntityType(''); setShowFilterModal(false); }}>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  backButton: { padding: 4 },
  filterBtn: { padding: 8 },
  listContent: { padding: 16 },
  logItem: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  logHeader: { flexDirection: 'row', justifySelf: 'space-between', marginBottom: 6 },
  actor: { fontWeight: 'bold', fontSize: 14, color: '#0f172a', flex: 1 },
  date: { fontSize: 12, color: '#64748b' },
  actionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  actionBadge: { backgroundColor: '#e0f2fe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
  actionText: { fontSize: 11, color: '#0284c7', fontWeight: '600' },
  entityText: { fontSize: 13, color: '#475569' },
  detailText: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#64748b' },
  
   // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40, maxHeight: '60%' },
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

export default AuditLogScreen;
