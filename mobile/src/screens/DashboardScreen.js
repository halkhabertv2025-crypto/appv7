import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { SafeAreaView } from 'react-native-safe-area-context';
<<<<<<< HEAD

const DashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ total: '-', zimmetli: '-' });
=======
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
>>>>>>> bbd61dba326702d3b7986d1cad8b5368009de560
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
<<<<<<< HEAD
        <View>
          <Text style={styles.welcomeText}>Hoşgeldin,</Text>
          <Text style={styles.userName}>{user?.adSoyad}</Text>
          <Text style={styles.userRole}>{user?.rol || 'Kullanıcı'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Çıkış</Text>
=======
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
>>>>>>> bbd61dba326702d3b7986d1cad8b5368009de560
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
<<<<<<< HEAD
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.sectionTitle}>Genel Durum</Text>

        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Inventory')}
          >
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Toplam Envanter</Text>
          </TouchableOpacity>

          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#3b82f6' }]}>{stats.zimmetli}</Text>
            <Text style={styles.statLabel}>Zimmetli</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#22c55e' }]}>{stats.depoda}</Text>
            <Text style={styles.statLabel}>Depoda</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#ef4444' }]}>{stats.arizali}</Text>
            <Text style={styles.statLabel}>Arızalı/Kayıp</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Inventory')}
          >
            <Text style={styles.actionText}>Envanter Listesi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Employees')}
          >
            <Text style={styles.actionText}>Çalışan Listesi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryAction]}
            onPress={() => navigation.navigate('QRScan')}
          >
            <Text style={[styles.actionText, styles.secondaryActionText]}>QR Kod Tara</Text>
          </TouchableOpacity>
=======
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
>>>>>>> bbd61dba326702d3b7986d1cad8b5368009de560
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
<<<<<<< HEAD
    backgroundColor: '#ffffff',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 14,
    color: '#64748b',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  userRole: {
    fontSize: 12,
    color: '#14b8a6',
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 'bold',
=======
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
>>>>>>> bbd61dba326702d3b7986d1cad8b5368009de560
  },
  content: {
    padding: 24,
  },
<<<<<<< HEAD
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#334155',
    marginTop: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
=======
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
>>>>>>> bbd61dba326702d3b7986d1cad8b5368009de560
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
<<<<<<< HEAD
    backgroundColor: '#14b8a6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
=======
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
>>>>>>> bbd61dba326702d3b7986d1cad8b5368009de560
  },
  actionText: {
    color: 'white',
    fontSize: 16,
<<<<<<< HEAD
    fontWeight: 'bold',
  },
  secondaryAction: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#14b8a6',
  },
  secondaryActionText: {
    color: '#14b8a6',
=======
    fontWeight: '700',
>>>>>>> bbd61dba326702d3b7986d1cad8b5368009de560
  },
});

export default DashboardScreen;
