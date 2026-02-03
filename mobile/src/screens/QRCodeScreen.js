import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';

const QRCodeScreen = ({ route, navigation }) => {
    const { inventoryId, inventoryTitle, serialNumber } = route.params;
    const [qrCodeUrl, setQrCodeUrl] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchQRCode();
    }, []);

    const fetchQRCode = async () => {
        try {
            // Assuming existing backend has an endpoint for this or we construct it.
            // Based on web QrKodDialog, it receives qrCodeUrl.
            // Let's assume we can generate the URL pattern found in web app or check if API provides it.
            // Looking at web code, it seems it might be generated on the fly or fetched. 
            // If web just receives it, maybe the detail endpoint has it?
            // Let's check `InventoryDetailScreen`'s fetched data. 
            // For now, I will try to fetch inventory detail again to see if it has qrUrl or similar.
            // Or I can use a library to generate QR code if I have the content string.
            // Use the API endpoint to get QR code if available.

            const response = await client.get(`/envanterler/${inventoryId}`);
            if (response.data.qrCodeUrl) {
                setQrCodeUrl(response.data.qrCodeUrl);
            } else {
                // Fallback or handle missing
                // Typically QR code might be a base64 string or a URL.
                // If web passes it as prop, it must come from somewhere.
                // Let's assume the API returns it in the inventory object as `qrCodeUrl`.
            }
        } catch (error) {
            console.log('Error fetching QR:', error);
            Alert.alert('Hata', 'QR Kod yüklenemedi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="close" size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>QR Kod</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                {loading ? (
                    <ActivityIndicator size="large" color="#14b8a6" />
                ) : (
                    <View style={styles.card}>
                        <Text style={styles.companyName}>Halk Tv Envanter</Text>

                        {qrCodeUrl ? (
                            <Image source={{ uri: qrCodeUrl }} style={styles.qrImage} resizeMode="contain" />
                        ) : (
                            <View style={styles.placeholderQr}>
                                <Ionicons name="qr-code-outline" size={150} color="#cbd5e1" />
                                <Text style={styles.errorText}>QR Kod bulunamadı</Text>
                            </View>
                        )}

                        <View style={styles.infoContainer}>
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Envanter:</Text>
                                <Text style={styles.value}>{inventoryTitle}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Seri No:</Text>
                                <Text style={styles.value}>{serialNumber}</Text>
                            </View>
                        </View>
                    </View>
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
        // borderBottomWidth: 1,
        // borderBottomColor: '#e2e8f0',
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    backButton: { padding: 8 },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    card: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    companyName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: '#f1f5f9',
        paddingBottom: 10,
        width: '100%',
        textAlign: 'center',
    },
    qrImage: {
        width: 250,
        height: 250,
        marginBottom: 20,
    },
    placeholderQr: {
        width: 250,
        height: 250,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    infoContainer: {
        width: '100%',
        marginTop: 10,
    },
    infoRow: {
        marginBottom: 10,
    },
    label: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '600',
        marginBottom: 2,
    },
    value: {
        fontSize: 16,
        color: '#334155',
        fontWeight: '500',
    },
    errorText: {
        color: '#94a3b8',
        marginTop: 10,
    }
});

export default QRCodeScreen;
