import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const StatCard = ({ label, value, icon, color, onPress }) => (
  <TouchableOpacity 
    style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 4 }]}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <View style={styles.statContent}>
      <Text style={styles.statNumber}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  </TouchableOpacity>
);

const ActionButton = ({ title, icon, color, onPress, secondary }) => (
  <TouchableOpacity
    style={[
      styles.actionButton,
      secondary && styles.secondaryAction,
      { borderColor: secondary ? color : 'transparent', backgroundColor: secondary ? 'white' : color }
    ]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Ionicons 
      name={icon} 
      size={24} 
      color={secondary ? color : 'white'} 
      style={{ marginRight: 12 }}
    />
    <Text style={[
      styles.actionText, 
      secondary && { color }
    ]}>{title}</Text>
    <Ionicons 
      name="chevron-forward" 
      size={20} 
      color={secondary ? color : 'white'} 
      style={{ marginLeft: 'auto', opacity: 0.8 }}
    />
  </TouchableOpacity>
);

const DashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ total: '-', zimmetli: '-', depoda: '-', arizali: '-' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const response = await client.get('/dashboard');
      if (response.data && response.data.stats) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.log('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
           <View style={styles.avatarContainer}>
             <Ionicons name="person" size={24} color="#14b8a6" />
           </View>
           <View>
             <Text style={styles.welcomeText}>Hoşgeldin,</Text>
             <Text style={styles.userName}>{user?.adSoyad}</Text>
             <Text style={styles.userRole}>{user?.rol || 'Kullanıcı'}</Text>
           </View>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#14b8a6" />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionHeader}>GENEL DURUM</Text>

        <View style={styles.statsGrid}>
          <StatCard 
            label="Toplam Envanter" 
            value={stats.total} 
            icon="layers" 
            color="#6366f1"
            onPress={() => navigation.navigate('Inventory')}
          />
          <StatCard 
            label="Zimmetli" 
            value={stats.zimmetli} 
            icon="person" 
            color="#3b82f6" 
          />
          <StatCard 
            label="Depoda" 
            value={stats.depoda} 
            icon="cube" 
            color="#f97316" 
          />
          <StatCard 
            label="Arızalı/Kayıp" 
            value={stats.arizali} 
            icon="alert-circle" 
            color="#ef4444" 
          />
        </View>

        <Text style={styles.sectionHeader}>HIZLI İŞLEMLER</Text>

        <View style={styles.actionsContainer}>
          <ActionButton
            title="Envanter Listesi"
            icon="list"
            color="#14b8a6"
            onPress={() => navigation.navigate('Inventory')}
          />
          
          <ActionButton
            title="Çalışan Listesi"
            icon="people"
            color="#0ea5e9"
            onPress={() => navigation.navigate('Employees')}
          />

          <ActionButton
            title="QR Kod Tara"
            icon="qr-code"
            color="#8b5cf6"
            onPress={() => navigation.navigate('QRScan')}
            secondary
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 24,
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 24,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0fdfa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#ccfbf1',
  },
  welcomeText: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 24,
  },
  userRole: {
    fontSize: 12,
    fontWeight: '600',
    color: '#14b8a6',
    marginTop: 2,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  content: {
    padding: 24,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 16,
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    width: '47%', // Slightly less than half to account for gap
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statContent: {
    gap: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
    fontWeight: '500',
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryAction: {
    borderWidth: 2,
    shadowColor: 'transparent',
    elevation: 0,
    marginTop: 8,
  },
  actionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default DashboardScreen;
