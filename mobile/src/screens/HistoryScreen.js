import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';

const HistoryScreen = ({ route, navigation }) => {
    const { inventoryId, inventoryTitle } = route.params;
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('zimmet'); // 'zimmet' or 'logs'
    const [zimmetHistory, setZimmetHistory] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            // Based on IslemGecmisiDialog, endpoint is /envanterler/${id}/gecmis
            // It returns { zimmetGecmisi: [], islemLoglari: [] }
            const response = await client.get(`/envanterler/${inventoryId}/gecmis`);
            console.log("HISTORY DATA", response.data);
            // Sometimes it returns array directly or object? DetailScreen uses response.data as array.
            // Let's verify with API call if possible or just handle both. 
            // DetailScreen logic: 
            // const histResponse = await client.get(`/envanterler/${id}/gecmis`);
            // setHistory(histResponse.data || []); 
            // BUT IslemGecmisiDialog logic expects { zimmetGecmisi, islemLoglari }
            // This implies there might be two different endpoints or DetailScreen fetches something else.
            // Wait, let's checking `IslemGecmisiDialog.jsx`:
            // `gecmisData` prop passed in. 
            // Where does `gecmisData` come from in web? Likely `fetch(`/api/envanterler/${id}/gecmis-detay`)`?
            // Let's assume there is a detailed endpoint or use what we have.
            // If DetailScreen gets an array, it might benefit from a more detailed endpoint.
            // Let's try to infer from IslemGecmisiDialog content.
            // It renders `zimmetGecmisi` and `islemLoglari`.
            // I will implement fetching logic to handle the structure.

            const data = response.data;
            if (data.zimmetGecmisi) {
                setZimmetHistory(data.zimmetGecmisi);
                setAuditLogs(data.islemLoglari || []);
            } else if (Array.isArray(data)) {
                // Fallback if it returns a flat list (maybe merged?)
                setAuditLogs(data); // Assuming generic logs
            }

        } catch (error) {
            console.log('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('tr-TR');
    };

    const renderZimmetItem = ({ item }) => (
        <View style={[styles.card, item.durum === 'Aktif' ? styles.activeCard : {}]}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.cardTitle}>{item.calisanAd}</Text>
                    <Text style={styles.cardSubtitle}>{item.departmanAd}</Text>
                </View>
                <View style={[styles.statusBadge, item.durum === 'Aktif' ? styles.activeBadge : styles.inactiveBadge]}>
                    <Text style={[styles.statusText, item.durum === 'Aktif' ? styles.activeText : styles.inactiveText]}>
                        {item.durum}
                    </Text>
                </View>
            </View>

            <View style={styles.cardBody}>
                <View style={styles.row}>
                    <Text style={styles.label}>Zimmet Tarihi:</Text>
                    <Text style={styles.value}>{formatDate(item.zimmetTarihi)}</Text>
                </View>
                {item.iadeTarihi && (
                    <View style={styles.row}>
                        <Text style={styles.label}>İade Tarihi:</Text>
                        <Text style={styles.value}>{formatDate(item.iadeTarihi)}</Text>
                    </View>
                )}
                {item.aciklama && (
                    <Text style={styles.note}>"{item.aciklama}"</Text>
                )}
            </View>

            {/* Photos */}
            {(item.zimmetFoto || item.iadeFoto) && (
                <View style={styles.photoContainer}>
                    {item.zimmetFoto && (
                        <View style={styles.photoItem}>
                            <Text style={styles.photoLabel}>ZİMMET FOTO</Text>
                            <Image source={{ uri: item.zimmetFoto }} style={styles.thumbnail} />
                        </View>
                    )}
                    {item.iadeFoto && (
                        <View style={styles.photoItem}>
                            <Text style={styles.photoLabel}>İADE FOTO</Text>
                            <Image source={{ uri: item.iadeFoto }} style={styles.thumbnail} />
                        </View>
                    )}
                </View>
            )}
        </View>
    );

    const renderLogItem = ({ item }) => {
        let actionText = item.actionType || 'İşlem';
        switch (item.actionType) {
            case 'CREATE_INVENTORY': actionText = 'Envanter Oluşturuldu'; break;
            case 'UPDATE_INVENTORY': actionText = 'Envanter Güncellendi'; break;
            case 'DELETE_INVENTORY': actionText = 'Envanter Silindi'; break;
            case 'CREATE_ZIMMET': actionText = 'Zimmetlendi'; break;
            case 'RETURN_ZIMMET': actionText = 'İade Alındı'; break;
            case 'UPDATE_EMPLOYEE': actionText = 'Çalışan Güncellendi'; break;
        }

        return (
            <View style={styles.logCard}>
                <View style={styles.logHeader}>
                    <Text style={styles.logTitle}>{actionText}</Text>
                    <Text style={styles.logDate}>{new Date(item.createdAt).toLocaleString('tr-TR')}</Text>
                </View>
                <Text style={styles.logUser}>{item.actorUserName} tarafından</Text>

                {item.details?.degisiklikler && (
                    <View style={styles.changesContainer}>
                        <Text style={styles.changesTitle}>Değişiklikler:</Text>
                        {Object.entries(item.details.degisiklikler).map(([key, val], idx) => (
                            <View key={idx} style={styles.changeRow}>
                                <Text style={styles.changeKey}>{key}:</Text>
                                <Text style={styles.changeOld} numberOfLines={1}>{val.onceki ? val.onceki.toString() : '(boş)'}</Text>
                                <Ionicons name="arrow-forward" size={12} color="#94a3b8" />
                                <Text style={styles.changeNew} numberOfLines={1}>{val.yeni ? val.yeni.toString() : '(boş)'}</Text>
                            </View>
                        ))}
                    </View>
                )}
                {(!item.details?.degisiklikler && item.details) && (
                    <Text style={styles.logDetail} numberOfLines={2}>
                        {JSON.stringify(item.details)}
                    </Text>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#0f172a" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>İşlem Geçmişi</Text>
                    <Text style={styles.headerSubtitle}>{inventoryTitle}</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'zimmet' && styles.activeTab]}
                    onPress={() => setActiveTab('zimmet')}
                >
                    <Text style={[styles.tabText, activeTab === 'zimmet' && styles.activeTabText]}>Zimmetler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'logs' && styles.activeTab]}
                    onPress={() => setActiveTab('logs')}
                >
                    <Text style={[styles.tabText, activeTab === 'logs' && styles.activeTabText]}>Loglar</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {loading ? (
                    <ActivityIndicator size="large" color="#14b8a6" style={{ marginTop: 20 }} />
                ) : (
                    activeTab === 'zimmet' ? (
                        <FlatList
                            data={zimmetHistory}
                            renderItem={renderZimmetItem}
                            keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                            ListEmptyComponent={<Text style={styles.emptyText}>Zimmet geçmişi bulunamadı.</Text>}
                            contentContainerStyle={{ paddingBottom: 20 }}
                        />
                    ) : (
                        <FlatList
                            data={auditLogs}
                            renderItem={renderLogItem}
                            keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                            ListEmptyComponent={<Text style={styles.emptyText}>İşlem kaydı bulunamadı.</Text>}
                            contentContainerStyle={{ paddingBottom: 20 }}
                        />
                    )
                )}
            </View>
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
        borderBottomColor: '#e2e8f0',
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
    headerSubtitle: { fontSize: 12, color: '#64748b' },
    backButton: { padding: 8 },

    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'white',
        padding: 4,
        margin: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    activeTab: {
        backgroundColor: '#14b8a6',
    },
    tabText: {
        fontWeight: '600',
        color: '#64748b',
    },
    activeTabText: {
        color: 'white',
    },

    content: {
        flex: 1,
        paddingHorizontal: 16,
    },
    emptyText: {
        textAlign: 'center',
        color: '#94a3b8',
        marginTop: 20,
        fontStyle: 'italic',
    },

    // Card Styles
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#cbd5e1',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    activeCard: {
        backgroundColor: '#f0fdf4',
        borderLeftColor: '#22c55e',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
    cardSubtitle: { fontSize: 14, color: '#64748b' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    activeBadge: { backgroundColor: '#dcfce7' },
    inactiveBadge: { backgroundColor: '#f1f5f9' },
    statusText: { fontSize: 12, fontWeight: '600' },
    activeText: { color: '#15803d' },
    inactiveText: { color: '#64748b' },

    cardBody: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        paddingTop: 8,
    },
    row: { flexDirection: 'row', marginBottom: 4 },
    label: { fontSize: 14, color: '#64748b', width: 100 },
    value: { fontSize: 14, color: '#334155', fontWeight: '500' },
    note: { marginTop: 8, fontSize: 14, fontStyle: 'italic', color: '#475569' },

    photoContainer: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 12,
    },
    photoItem: {
        alignItems: 'center',
    },
    photoLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#94a3b8',
        marginBottom: 4,
    },
    thumbnail: {
        width: 60,
        height: 60,
        borderRadius: 4,
        backgroundColor: '#cbd5e1',
    },

    // Log Styles
    logCard: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    logHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    logTitle: { fontSize: 14, fontWeight: 'bold', color: '#334155' },
    logDate: { fontSize: 12, color: '#94a3b8' },
    logUser: { fontSize: 12, color: '#64748b', marginBottom: 8 },
    changesContainer: {
        backgroundColor: '#f8fafc',
        padding: 8,
        borderRadius: 4,
    },
    changesTitle: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 4 },
    changeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2, flexWrap: 'wrap' },
    changeKey: { fontSize: 12, color: '#475569', marginRight: 4, fontWeight: '500' },
    changeOld: { fontSize: 12, color: '#ef4444', textDecorationLine: 'line-through', opacity: 0.7 },
    changeNew: { fontSize: 12, color: '#22c55e', fontWeight: 'bold' },
    logDetail: { fontSize: 12, color: '#64748b' }
});

export default HistoryScreen;
