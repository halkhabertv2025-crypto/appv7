import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Image, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import client from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const ReturnScreen = ({ route, navigation }) => {
  const { inventoryId, inventoryTitle, zimmetId } = route.params;
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [isDamaged, setIsDamaged] = useState(false);
  const [image, setImage] = useState(null);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("İzin Gerekli", "Kamera erişim izni vermeniz gerekiyor.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        zimmetId: zimmetId,
        aciklama: note,
        iadeDurumu: isDamaged ? 'Arızalı' : 'Depoda',
        userId: user.id || 'mobile-user',
        userName: user.adSoyad || 'Mobile Use',
        iadeFoto: image ? `data:image/jpeg;base64,${image.base64}` : null,
      };

      await client.post('/zimmetler/iade', payload);
      
      Alert.alert('Başarılı', 'İade işlemi başarıyla tamamlandı.', [
        { text: 'Tamam', onPress: () => navigation.navigate('InventoryDetail', { id: inventoryId, refresh: true }) }
      ]);
    } catch (error) {
      console.log('İade error:', error);
      Alert.alert('Hata', error.response?.data?.error || 'İade işlemi başarısız oldu.');
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
        <Text style={styles.headerTitle}>İade Al</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          {loading ? (
             <ActivityIndicator color="#14b8a6" />
          ) : (
             <Text style={styles.saveButtonText}>Onayla</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.inventoryTitle}>{inventoryTitle}</Text>

        {/* Condition Toggle */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Ürün Arızalı mı?</Text>
            <Switch
              trackColor={{ false: "#767577", true: "#ef4444" }}
              thumbColor={isDamaged ? "#feba74" : "#f4f3f4"}
              onValueChange={setIsDamaged}
              value={isDamaged}
            />
          </View>
          <Text style={styles.hint}>
            {isDamaged ? 'Durum: ARIZALI olarak işaretlenecek.' : 'Durum: DEPODA olarak işaretlenecek.'}
          </Text>
        </View>

        {/* Note */}
        <View style={styles.section}>
          <Text style={styles.label}>İade Açıklaması</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Neden iade ediliyor? Hasar var mı?"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Photo Upload */}
        <View style={styles.section}>
          <Text style={styles.label}>Fotoğraf (Opsiyonel)</Text>
          <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
            <Ionicons name="camera" size={24} color="white" />
            <Text style={styles.photoButtonText}>Fotoğraf Çek</Text>
          </TouchableOpacity>
          
          {image && (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: image.uri }} style={styles.previewImage} />
              <TouchableOpacity 
                style={styles.removePhoto}
                onPress={() => setImage(null)}
              >
                <Ionicons name="trash" size={20} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </View>

      </ScrollView>
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
  backButtonText: { color: '#ef4444', fontSize: 16 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  saveButtonText: { color: '#14b8a6', fontSize: 16, fontWeight: 'bold' },
  content: { padding: 16 },
  inventoryTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: '#334155' },
  section: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  hint: { fontSize: 12, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#64748b',
    padding: 12,
    borderRadius: 8,
  },
  photoButtonText: { color: 'white', marginLeft: 8, fontWeight: 'bold' },
  imagePreviewContainer: { marginTop: 12, position: 'relative', alignItems: 'center' },
  previewImage: { width: '100%', height: 200, borderRadius: 8, resizeMode: 'cover' },
  removePhoto: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    padding: 8,
    borderRadius: 20,
  }
});

export default ReturnScreen;
