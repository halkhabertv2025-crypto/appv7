import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';

const AccessoryFormScreen = ({ route, navigation }) => {
    const { isEdit, accessoryId, inventoryId, accessoryData } = route.params || {};

    const [loading, setLoading] = useState(false);

    // Form State
    const [ad, setAd] = useState(accessoryData?.ad || ''); // This maps to "Tür" in list or name
    const [marka, setMarka] = useState(accessoryData?.marka || '');
    const [model, setModel] = useState(accessoryData?.model || '');
    const [seriNumarasi, setSeriNumarasi] = useState(accessoryData?.seriNumarasi || '');
    const [durum, setDurum] = useState(accessoryData?.durum || 'Depoda');

    const [showStatusModal, setShowStatusModal] = useState(false);

    const statusOptions = ['Depoda', 'Aktif', 'Arızalı'];

    const handleSubmit = async () => {
        if (!ad) {
            Alert.alert('Hata', 'Lütfen aksesuar adını girin (Örn: Çanta, Mouse).');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ad, // Name/Type
                marka,
                model,
                seriNumarasi,
                durum
            };

            if (isEdit && inventoryId && accessoryId) {
                await client.put(`/envanterler/${inventoryId}/accessories/${accessoryId}`, payload);
                Alert.alert('Başarılı', 'Aksesuar güncellendi.', [
                    { text: 'Tamam', onPress: () => navigation.navigate('InventoryDetail', { id: inventoryId, refresh: true }) }
                ]);
            } else if (inventoryId) {
                await client.post(`/envanterler/${inventoryId}/accessories`, payload);
                Alert.alert('Başarılı', 'Aksesuar eklendi.', [
                    { text: 'Tamam', onPress: () => navigation.navigate('InventoryDetail', { id: inventoryId, refresh: true }) }
                ]);
            } else {
                Alert.alert('Hata', 'Envanter ID eksik.');
            }
        } catch (error) {
            console.log('Save error:', error);
            Alert.alert('Hata', error.response?.data?.error || 'Kaydetme işlemi başarısız.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>İptal</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEdit ? 'Aksesuar Düzenle' : 'Yeni Aksesuar'}</Text>
                <TouchableOpacity onPress={handleSubmit} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#14b8a6" />
                    ) : (
                        <Text style={styles.saveButtonText}>Kaydet</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Aksesuar Adı *</Text>
                    <TextInput
                        style={styles.input}
                        value={ad}
                        onChangeText={setAd}
                        placeholder="Örn: Laptop Çantası, Adaptör"
                    />
                </View>

                <View style={styles.row}>
                    <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.label}>Marka</Text>
                        <TextInput
                            style={styles.input}
                            value={marka}
                            onChangeText={setMarka}
                            placeholder="Marka"
                        />
                    </View>
                    <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                        <Text style={styles.label}>Model</Text>
                        <TextInput
                            style={styles.input}
                            value={model}
                            onChangeText={setModel}
                            placeholder="Model"
                        />
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Seri Numarası</Text>
                    <TextInput
                        style={styles.input}
                        value={seriNumarasi}
                        onChangeText={setSeriNumarasi}
                        placeholder="Varsa seri no"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Durum</Text>
                    <TouchableOpacity style={styles.selectButton} onPress={() => setShowStatusModal(true)}>
                        <Text style={styles.selectText}>{durum}</Text>
                        <Ionicons name="chevron-down" size={20} color="#64748b" />
                    </TouchableOpacity>
                </View>

            </ScrollView>

            {/* Status Modal */}
            <Modal visible={showStatusModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Durum Seçiniz</Text>
                            <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                                <Ionicons name="close" size={24} color="#0f172a" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={statusOptions}
                            keyExtractor={item => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.modalItem}
                                    onPress={() => {
                                        setDurum(item);
                                        setShowStatusModal(false);
                                    }}
                                >
                                    <Text style={[styles.modalItemText, item === durum && { color: '#14b8a6', fontWeight: 'bold' }]}>
                                        {item}
                                    </Text>
                                    {item === durum && <Ionicons name="checkmark" size={20} color="#14b8a6" />}
                                </TouchableOpacity>
                            )}
                        />
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
        borderBottomColor: '#e2e8f0',
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    backButtonText: { color: '#ef4444', fontSize: 16 },
    saveButtonText: { color: '#14b8a6', fontSize: 16, fontWeight: 'bold' },
    content: { padding: 16 },
    formGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 6 },
    input: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    row: { flexDirection: 'row' },
    selectButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        padding: 12,
    },
    selectText: { fontSize: 16, color: '#0f172a' },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    modalItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalItemText: { fontSize: 16 },
});

export default AccessoryFormScreen;
