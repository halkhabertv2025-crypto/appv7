import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const SettingsScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Uygulamadan çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Çıkış Yap', 
          style: 'destructive',
          onPress: async () => {
             await logout();
          }
        }
      ]
    );
  };

  const menuItems = [
    { 
       id: 'audit', 
       title: 'İşlem Geçmişi', 
       subtitle: 'Sistem loglarını görüntüle', 
       icon: 'file-text-outline', 
       color: '#3b82f6',
       onPress: () => navigation.navigate('AuditLog')
    },
    // Add Restore or other settings here if needed
    {
       id: 'profile',
       title: 'Profilim',
       subtitle: 'Hesap bilgilerini görüntüle',
       icon: 'person-outline',
       color: '#14b8a6',
       onPress: () => navigation.navigate('BenimSayfam') // Reusing MyPage as Profile
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ayarlar</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
         <View style={styles.profileSection}>
            <View style={styles.avatar}>
               <Text style={styles.avatarText}>{user?.adSoyad?.charAt(0) || 'U'}</Text>
            </View>
            <Text style={styles.name}>{user?.adSoyad}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <View style={styles.roleBadge}>
               <Text style={styles.roleText}>{user?.role || 'Kullanıcı'}</Text>
            </View>
         </View>

         <View style={styles.menu}>
            <Text style={styles.sectionTitle}>Sistem</Text>
            {menuItems.map(item => (
                <TouchableOpacity key={item.id} style={styles.menuItem} onPress={item.onPress}>
                   <View style={[styles.iconBox, { backgroundColor: item.color + '20' }]}>
                      <Ionicons name={item.icon} size={22} color={item.color} />
                   </View>
                   <View style={styles.menuText}>
                      <Text style={styles.menuTitle}>{item.title}</Text>
                      <Text style={styles.menuSub}>{item.subtitle}</Text>
                   </View>
                   <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                </TouchableOpacity>
            ))}
         </View>

         <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Çıkış Yap</Text>
         </TouchableOpacity>

         <Text style={styles.version}>v1.0.0</Text>
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
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  content: { padding: 16 },
  
  profileSection: {
     alignItems: 'center',
     marginBottom: 32,
     marginTop: 16
  },
  avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#0f172a',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12
  },
  avatarText: { fontSize: 32, color: 'white', fontWeight: 'bold' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  email: { fontSize: 14, color: '#64748b', marginBottom: 8 },
  roleBadge: { backgroundColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16 },
  roleText: { color: '#475569', fontSize: 12, fontWeight: '600' },

  menu: { backgroundColor: 'white', borderRadius: 16, padding: 8, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#94a3b8', margin: 12, marginBottom: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  menuText: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '500', color: '#0f172a' },
  menuSub: { fontSize: 12, color: '#64748b' },

  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#fee2e2', borderRadius: 12, gap: 8 },
  logoutText: { color: '#ef4444', fontWeight: '600', fontSize: 16 },

  version: { textAlign: 'center', marginTop: 24, color: '#cbd5e1', fontSize: 12 }
});

export default SettingsScreen;
