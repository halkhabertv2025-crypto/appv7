import React, { useState, useEffect, useMemo } from 'react';
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
  ScrollView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

const DepartmentsScreen = () => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDepts, setExpandedDepts] = useState({});
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formData, setFormData] = useState({ ad: '', aciklama: '' });
  const [submitting, setSubmitting] = useState(false);

  const hasFullAccess = user?.yoneticiYetkisi || user?.adminYetkisi;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterDepartments();
  }, [searchQuery, departments]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [deptRes, empRes] = await Promise.all([
        client.get('/departmanlar'),
        client.get('/calisanlar')
      ]);
      setDepartments(deptRes.data);
      setFilteredDepartments(deptRes.data);
      setEmployees(empRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const filterDepartments = () => {
    if (!searchQuery) {
      setFilteredDepartments(departments);
      return;
    }
    const lowerText = searchQuery.toLowerCase();
    const filtered = departments.filter(dept => 
      dept.ad.toLowerCase().includes(lowerText) || 
      (dept.aciklama && dept.aciklama.toLowerCase().includes(lowerText))
    );
    setFilteredDepartments(filtered);
  };

  const employeesByDept = useMemo(() => {
    const map = {};
    employees.forEach(c => {
      if (c.durum === 'Aktif') {
        if (!map[c.departmanId]) map[c.departmanId] = [];
        map[c.departmanId].push(c);
      }
    });
    return map;
  }, [employees]);

  const toggleExpand = (id) => {
    setExpandedDepts(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleEdit = (dept) => {
    setEditingDept(dept);
    setFormData({ ad: dept.ad, aciklama: dept.aciklama || '' });
    setModalVisible(true);
  };

  const handleCreate = () => {
    setEditingDept(null);
    setFormData({ ad: '', aciklama: '' });
    setModalVisible(true);
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Silme Onayı',
      'Bu departmanı silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: async () => {
            try {
              await client.delete(`/departmanlar/${id}`, {
                data: { userId: user?.id, userName: user?.adSoyad }
              });
              Alert.alert('Başarılı', 'Departman silindi');
              fetchData();
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
      Alert.alert('Uyarı', 'Lütfen departman adını giriniz');
      return;
    }

    try {
      setSubmitting(true);
      const url = editingDept ? `/departmanlar/${editingDept.id}` : '/departmanlar';
      const method = editingDept ? 'put' : 'post';
      
      await client[method](url, {
        ...formData,
        userId: user?.id,
        userName: user?.adSoyad
      });

      Alert.alert('Başarılı', editingDept ? 'Departman güncellendi' : 'Departman oluşturuldu');
      setModalVisible(false);
      fetchData();
    } catch (error) {
      console.error(error);
      Alert.alert('Hata', error.response?.data?.error || 'İşlem başarısız');
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item }) => {
    const deptEmployees = employeesByDept[item.id] || [];
    const isExpanded = expandedDepts[item.id];

    return (
      <View style={styles.card}>
        <TouchableOpacity 
          style={styles.cardHeader} 
          onPress={() => toggleExpand(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.headerLeft}>
            {deptEmployees.length > 0 && (
              <Ionicons 
                name={isExpanded ? "chevron-down" : "chevron-forward"} 
                size={20} 
                color="#64748b" 
                style={styles.expandIcon}
              />
            )}
            <View>
              <Text style={styles.deptName}>{item.ad}</Text>
              <View style={styles.badgeContainer}>
                <View style={styles.badge}>
                  <Ionicons name="people" size={12} color="#1e40af" />
                  <Text style={styles.badgeText}>{deptEmployees.length} Çalışan</Text>
                </View>
              </View>
            </View>
          </View>
          
          {hasFullAccess && (
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionBtn}>
                <Ionicons name="pencil" size={18} color="#475569" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
                <Ionicons name="trash" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>

        {item.aciklama ? (
          <Text style={styles.description}>{item.aciklama}</Text>
        ) : null}

        {isExpanded && deptEmployees.length > 0 && (
          <View style={styles.employeesList}>
            <Text style={styles.employeesTitle}>Departman Çalışanları</Text>
            {deptEmployees.map(emp => (
              <View key={emp.id} style={styles.employeeItem}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {emp.adSoyad?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </Text>
                </View>
                <View style={styles.empInfo}>
                  <Text style={styles.empName}>{emp.adSoyad}</Text>
                  <Text style={styles.empEmail}>{emp.email}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle}>Departmanlar</Text>
          {hasFullAccess && (
            <TouchableOpacity style={styles.addButton} onPress={handleCreate}>
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Departman ara..."
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
          data={filteredDepartments}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Departman bulunamadı</Text>
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
                {editingDept ? 'Departman Düzenle' : 'Yeni Departman'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Departman Adı *</Text>
              <TextInput
                style={styles.input}
                value={formData.ad}
                onChangeText={(text) => setFormData(prev => ({ ...prev, ad: text }))}
                placeholder="Örn: Bilgi İşlem"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Açıklama</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.aciklama}
                onChangeText={(text) => setFormData(prev => ({ ...prev, aciklama: text }))}
                placeholder="Departman açıklaması..."
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
                  {editingDept ? 'Güncelle' : 'Oluştur'}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  expandIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  deptName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  badgeContainer: { flexDirection: 'row' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '500',
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
    marginLeft: 28, // align with text
  },
  employeesList: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingLeft: 12,
  },
  employeesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  employeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ccfbf1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#0f766e',
    fontWeight: '600',
    fontSize: 12,
  },
  empInfo: { flex: 1 },
  empName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  empEmail: {
    fontSize: 12,
    color: '#64748b',
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

export default DepartmentsScreen;
