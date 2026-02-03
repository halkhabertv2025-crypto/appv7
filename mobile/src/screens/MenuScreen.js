import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

const MenuScreen = ({ navigation }) => {
  const { logout } = useAuth();

  const menuItems = [
    { title: 'Benim Sayfam', screen: 'BenimSayfam', icon: 'person' },
    { title: 'Departmanlar', screen: 'Departments', icon: 'building' },
    { title: 'Envanter Tipleri', screen: 'InventoryTypes', icon: 'tag' },
    { title: 'Zimmetler', screen: 'ZimmetList', icon: 'clipboard' },
    { title: 'Dijital Varlıklar', screen: 'DigitalAssets', icon: 'monitor' },
    { title: 'Bakım / Onarım', screen: 'Maintenance', icon: 'tool' },
    { title: 'Ayarlar', screen: 'Settings', icon: 'settings' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Menü</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionHeader}>Envanter ve Zimmet Yönetimi</Text>
        <View style={styles.menuGroup}>
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.menuItem}
              onPress={() => navigation.navigate(item.screen)}
            >
              <Text style={styles.menuText}>{item.title}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Oturumu Kapat</Text>
        </TouchableOpacity>
      </ScrollView>
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
    alignItems: 'center' 
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  content: { padding: 16 },
  sectionHeader: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#64748b', 
    marginBottom: 8, 
    marginLeft: 4,
    textTransform: 'uppercase'
  },
  menuGroup: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
  },
  menuItem: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuText: {
    fontSize: 16,
    color: '#334155',
  },
  chevron: {
    fontSize: 20,
    color: '#cbd5e1',
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default MenuScreen;
