import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView // Added ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

const InventoryTypesScreen = () => {
  const [types, setTypes] = useState([]);
  const [filteredTypes, setFilteredTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Expanded state
  const [expandedType, setExpandedType] = useState(null);
  const [typeInventories, setTypeInventories] = useState({});
  const [loadingInventories, setLoadingInventories] = useState(false);

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState({ ad: '', aciklama: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTypes();
  }, []);

  useEffect(() => {
    filterTypes();
  }, [searchQuery, types]);

  const fetchTypes = async () => {
    try {
      setLoading(true);
      const response = await client.get('/envanter-tipleri');
      setTypes(response.data);
      setFilteredTypes(response.data);
    } catch (error) {
      console.error('Error fetching types:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchTypeInventories = async (typeId) => {
    try {
      setLoadingInventories(true);
      // Ensure we have an array to filter even if API fails or returns unexpected format
      const response = await client.get('/envanterler');
      const allInventories = Array.isArray(response.data) ? response.data : [];
      const filtered = allInventories.filter(e => e.envanterTipiId === typeId);
      
      setTypeInventories(prev => ({
        ...prev,
        [typeId]: filtered
      }));
    } catch (error) {
      console.error('Error fetching type inventories:', error);
      Alert.alert('Hata', 'Envanter detayları yüklenemedi');
    } finally {
      setLoadingInventories(false);
    }
  };

  const filterTypes = () => {
    if (!searchQuery) {
      setFilteredTypes(types);
      return;
    }
    const lowerText = searchQuery.toLowerCase();
    const filtered = types.filter(t => 
      t.ad.toLowerCase().includes(lowerText) || 
      (t.aciklama && t.aciklama.toLowerCase().includes(lowerText))
    );
    setFilteredTypes(filtered);
  };

  const toggleExpand = (id) => {
    if (expandedType === id) {
      setExpandedType(null);
    } else {
      setExpandedType(id);
      if (!typeInventories[id]) {
        fetchTypeInventories(id);
      }
    }
  };

  const handleEdit = (type) => {
    setEditingType(type);
    setFormData({ ad: type.ad, aciklama: type.aciklama || '' });
    setModalVisible(true);
  };

  const handleCreate = () => {
    setEditingType(null);
    setFormData({ ad: '', aciklama: '' });
    setModalVisible(true);
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Silme Onayı',
      'Bu envanter tipini silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: async () => {
            try {
              await client.delete(`/envanter-tipleri/${id}`);
              Alert.alert('Başarılı', 'Envanter tipi silindi');
              fetchTypes();
            } catch (error) {
              Alert.alert('Hata', 'Silme işlemi başarısız oldu');
            }
          }
        }
      ]
    );
  };

  const handleSubmit = async () => {
    if (!formData.ad.trim()) {
      Alert.alert('Uyarı', 'Lütfen tip adını giriniz');
      return;
    }

    try {
      setSubmitting(true);
      const url = editingType ? `/envanter-tipleri/${editingType.id}` : '/envanter-tipleri';
      const method = editingType ? 'put' : 'post';
      
      await client[method](url, formData);

      Alert.alert('Başarılı', editingType ? 'Güncellendi' : 'Oluşturuldu');
      setModalVisible(false);
      fetchTypes();
    } catch (error) {
      console.error(error);
      Alert.alert('Hata', error.response?.data?.error || 'İşlem başarısız');
    } finally {
      setSubmitting(false);
    }
  };

  const renderInventoryItem = (item) => (
    <View key={item.id} style={styles.inventoryRow}>
      <View style={styles.invInfo}>
        <Text style={styles.invBrandModel}>{item.marka} {item.model}</Text>
        <Text style={styles.invSerial}>{item.seriNumarasi}</Text>
      </View>
      <View style={styles.invStatusContainer}>
        <View style={[
            styles.statusBadge, 
            item.durum === 'Zimmetli' ? styles.statusGreen : 
            item.durum === 'Depoda' ? styles.statusOrange : 
            styles.statusRed
          ]}>
          <Text style={[
            styles.statusText,
            item.durum === 'Zimmetli' ? styles.textGreen : 
            item.durum === 'Depoda' ? styles.textOrange : 
            styles.textRed
          ]}>{item.durum}</Text>
        </View>
        {item.zimmetBilgisi && (
          <Text style={styles.zimmetTo}>
            {item.zimmetBilgisi.calisanAd}
          </Text>
        )}
      </View>
    </View>
  );

  const renderItem = ({ item }) => {
    const isExpanded = expandedType === item.id;
    const inventories = typeInventories[item.id];

    return (
      <View style={styles.card}>
        <TouchableOpacity 
          style={styles.cardHeader} 
          onPress={() => toggleExpand(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.headerTop}>
            <View style={styles.titleContainer}>
              <Ionicons 
                name={isExpanded ? "chevron-down" : "chevron-forward"} 
                size={20} 
                color="#64748b" 
                style={styles.expandIcon}
              />
              <Text style={styles.typeName}>{item.ad}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionBtn}>
                <Ionicons name="pencil" size={16} color="#475569" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
                <Ionicons name="trash" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>

          {item.aciklama ? (
            <Text style={styles.description}>{item.aciklama}</Text>
          ) : null}

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#2563eb' }]}>{item.toplamSayisi || 0}</Text>
              <Text style={styles.statLabel}>Toplam</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#16a34a' }]}>{item.zimmetliSayisi || 0}</Text>
              <Text style={styles.statLabel}>Zimmetli</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#ea580c' }]}>{item.depodaSayisi || 0}</Text>
              <Text style={styles.statLabel}>Depoda</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#dc2626' }]}>{item.arizaliSayisi || 0}</Text>
              <Text style={styles.statLabel}>Arızalı</Text>
            </View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.detailsContainer}>
            {loadingInventories && !inventories ? (
              <ActivityIndicator size="small" color="#64748b" style={{ margin: 20 }} />
            ) : inventories && inventories.length > 0 ? (
              <View style={styles.inventoryList}>
                {inventories.map(renderInventoryItem)}
              </View>
            ) : (
              <Text style={styles.emptyDetails}>Bu tipte envanter bulunamadı.</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle}>Envanter Tipleri</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleCreate}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tip ara..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
        </View>
      ) : (
        <FlatList
          data={filteredTypes}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Envanter tipi bulunamadı</Text>
          }
        />
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingType ? 'Tipi Düzenle' : 'Yeni Tip'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Tip Adı *</Text>
              <TextInput
                style={styles.input}
                value={formData.ad}
                onChangeText={(text) => setFormData(prev => ({ ...prev, ad: text }))}
                placeholder="Örn: Bilgisayar"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Açıklama</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.aciklama}
                onChangeText={(text) => setFormData(prev => ({ ...prev, aciklama: text }))}
                placeholder="Açıklama..."
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, submitting && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {editingType ? 'Güncelle' : 'Oluştur'}
                </Text>
              )}
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
    padding: 16, 
    backgroundColor: 'white', 
    borderBottomWidth: 1, 
    borderBottomColor: '#e2e8f0',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  addButton: {
    backgroundColor: '#14b8a6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: '100%', color: '#0f172a' },
  listContent: { padding: 16 },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expandIcon: {
    marginRight: 8,
  },
  typeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  description: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 14,
    marginLeft: 28,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  detailsContainer: {
    marginTop: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
  },
  inventoryList: {
    gap: 8,
  },
  inventoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  invInfo: {
    flex: 1,
  },
  invBrandModel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  invSerial: {
    fontSize: 12,
    color: '#64748b',
  },
  invStatusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusGreen: { backgroundColor: '#dcfce7' },
  statusOrange: { backgroundColor: '#ffedd5' },
  statusRed: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 10, fontWeight: '700' },
  textGreen: { color: '#166534' },
  textOrange: { color: '#9a3412' },
  textRed: { color: '#991b1b' },
  zimmetTo: {
    fontSize: 10,
    color: '#475569',
  },
  emptyDetails: {
    textAlign: 'center',
    color: '#94a3b8',
    padding: 12,
    fontStyle: 'italic',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 32,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#14b8a6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default InventoryTypesScreen;
