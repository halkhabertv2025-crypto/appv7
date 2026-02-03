import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';

const AssignmentDetailScreen = ({ route, navigation }) => {
    const { assignmentId, refresh } = route.params;
    const [assignment, setAssignment] = useState(null);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        fetchAssignmentDetails();
    }, [assignmentId, refresh]);

    const fetchAssignmentDetails = async () => {
        try {
            // Assuming there is an endpoint to get single zimmet or we filter from list
            // Since client.get('/zimmetler') returns all, we might need to filter or if backend supports /zimmetler/:id
            // Let's try /zimmetler/:id first, if not we fall back to finding in list is bad practice but might be needed.
            // Based on typical REST:
            const response = await client.get(`/zimmetler/${assignmentId}`); // This endpoint might need to be verified exists?
            // If the above fails we might need to rely on passing data or finding it. 
            // The Web uses /api/zimmetler (list) only in the snippet shown.
            // However typically detail endpoints exist. Let's assume it does for now or we update later.
            // Actually, looking at previous specific usage, usually endpoints are plural/id.
            setAssignment(response.data);
        } catch (error) {
            console.log('Error fetching assignment:', error);
            // Fallback: If individual fetch fails, maybe we passed the data?
            if (route.params.assignmentData) {
                setAssignment(route.params.assignmentData);
            } else {
                Alert.alert('Hata', 'Zimmet detayları yüklenemedi.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleReturn = () => {
        if (!assignment) return;
        navigation.navigate('ReturnScreen', {
            inventoryId: assignment.envanterId,
            inventoryTitle: `${assignment.envanterBilgisi?.marka} ${assignment.envanterBilgisi?.model}`,
            zimmetId: assignment.id
        });
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <Text>Yükleniyor...</Text>
            </View>
        );
    }

    if (!assignment) {
        return (
            <View style={styles.center}>
                <Text>Zimmet bulunamadı.</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#14b8a6" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Zimmet Detayı</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Envanter Info */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Envanter Bilgileri</Text>
                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.label}>Tip</Text>
                            <Text style={styles.value}>{assignment.envanterBilgisi?.tip || '-'}</Text>
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.label}>Marka</Text>
                            <Text style={styles.value}>{assignment.envanterBilgisi?.marka || '-'}</Text>
                        </View>
                    </View>
                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.label}>Model</Text>
                            <Text style={styles.value}>{assignment.envanterBilgisi?.model || '-'}</Text>
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.label}>Seri No</Text>
                            <Text style={styles.value}>{assignment.envanterBilgisi?.seriNumarasi || '-'}</Text>
                        </View>
                    </View>
                </View>

                {/* Employee Info */}
                <View style={[styles.card, { borderLeftColor: '#3b82f6', borderLeftWidth: 4 }]}>
                    <Text style={styles.sectionTitle}>Çalışan Bilgileri</Text>
                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.label}>Ad Soyad</Text>
                            <Text style={styles.value}>{assignment.calisanAd || '-'}</Text>
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.label}>Departman</Text>
                            <Text style={styles.value}>{assignment.departmanAd || '-'}</Text>
                        </View>
                    </View>
                </View>

                {/* Assignment Info */}
                <View style={[styles.card, { borderLeftColor: '#22c55e', borderLeftWidth: 4 }]}>
                    <Text style={styles.sectionTitle}>Zimmet Bilgileri</Text>
                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.label}>Zimmet Tarihi</Text>
                            <Text style={styles.value}>
                                {assignment.zimmetTarihi ? new Date(assignment.zimmetTarihi).toLocaleDateString('tr-TR') : '-'}
                            </Text>
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.label}>Durum</Text>
                            <View style={[styles.badge, { backgroundColor: assignment.durum === 'Aktif' ? '#dcfce7' : '#f1f5f9' }]}>
                                <Text style={[styles.badgeText, { color: assignment.durum === 'Aktif' ? '#166534' : '#64748b' }]}>
                                    {assignment.durum}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {assignment.iadeTarihi && (
                        <View style={[styles.row, { marginTop: 12 }]}>
                            <View style={styles.col}>
                                <Text style={styles.label}>İade Tarihi</Text>
                                <Text style={styles.value}>{new Date(assignment.iadeTarihi).toLocaleDateString('tr-TR')}</Text>
                            </View>
                            <View style={styles.col}>
                                <Text style={styles.label}>İade Alan</Text>
                                <Text style={styles.value}>{assignment.iadeAlanYetkili?.adSoyad || '-'}</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Notes */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Notlar</Text>
                    <Text style={styles.noteText}>{assignment.aciklama || 'Not eklenmemiş.'}</Text>
                </View>

                {/* Photos */}
                <View style={styles.row}>
                    <View style={[styles.card, { flex: 1, marginRight: 8, minHeight: 150 }]}>
                        <Text style={styles.sectionTitle}>Zimmet Foto</Text>
                        {assignment.zimmetFoto ? (
                            <Image source={{ uri: assignment.zimmetFoto }} style={styles.photo} resizeMode="contain" />
                        ) : (
                            <View style={styles.noPhoto}><Text style={styles.noPhotoText}>Foto Yok</Text></View>
                        )}
                    </View>
                    <View style={[styles.card, { flex: 1, marginLeft: 8, minHeight: 150 }]}>
                        <Text style={styles.sectionTitle}>İade Foto</Text>
                        {assignment.iadeFoto ? (
                            <Image source={{ uri: assignment.iadeFoto }} style={styles.photo} resizeMode="contain" />
                        ) : (
                            <View style={styles.noPhoto}><Text style={styles.noPhotoText}>Foto Yok</Text></View>
                        )}
                    </View>
                </View>

                {assignment.durum === 'Aktif' && (
                    <TouchableOpacity style={styles.returnButton} onPress={handleReturn}>
                        <Ionicons name="return-down-back" size={20} color="white" style={{ marginRight: 8 }} />
                        <Text style={styles.returnButtonText}>İade Al</Text>
                    </TouchableOpacity>
                )}

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
    content: { padding: 16 },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    sectionTitle: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 12 },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    col: { flex: 1 },
    label: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
    value: { fontSize: 14, color: '#0f172a', fontWeight: '500' },
    badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    badgeText: { fontSize: 12, fontWeight: 'bold' },
    noteText: { fontSize: 14, color: '#334155' },
    photo: { width: '100%', height: 100, borderRadius: 8 },
    noPhoto: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 8 },
    noPhotoText: { color: '#94a3b8', fontSize: 12 },
    returnButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ef4444',
        padding: 16,
        borderRadius: 12,
        marginTop: 8,
    },
    returnButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});

export default AssignmentDetailScreen;
