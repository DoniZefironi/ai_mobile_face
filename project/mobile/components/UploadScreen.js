// mobile/components/UploadScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function UploadScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [lastPhoto, setLastPhoto] = useState(null);

  const requestPermissions = async (type) => {
    try {
      let permissionResult;
      
      if (type === 'camera') {
        permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (!permissionResult.granted) {
        Alert.alert(
          'Требуется разрешение',
          `Для работы приложения необходимы разрешения на доступ к ${type === 'camera' ? 'камере' : 'галерее'}!`,
          [
            {
              text: 'Открыть настройки',
              onPress: () => Linking.openSettings()
            },
            {
              text: 'Отмена',
              style: 'cancel'
            }
          ]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.log('Ошибка запроса разрешений:', error);
      Alert.alert('Ошибка', 'Не удалось запросить разрешения');
      return false;
    }
  };

  const handleImagePick = async (type) => {
    if (loading) return;

    setLoading(true);

    try {
      const hasPermission = await requestPermissions(type);
      if (!hasPermission) {
        setLoading(false);
        return;
      }

      let result;
      
      if (type === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [4, 5],
          quality: 0.8,
          exif: false,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 5],
          quality: 0.8,
          exif: false,
          selectionLimit: 1,
        });
      }

      if (result.canceled) {
        console.log('Пользователь отменил выбор изображения');
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        throw new Error('Изображение не выбрано');
      }

      const asset = result.assets[0];

      if (!asset.uri) {
        throw new Error('Неверный файл изображения');
      }

      if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) { 
        throw new Error('Файл изображения слишком большой (макс. 50МБ)');
      }

      console.log('Изображение успешно выбрано:', {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize
      });

      setLastPhoto(asset.uri);

      navigation.navigate('Camera', { photoUri: asset.uri });

    } catch (error) {
      console.log('Ошибка выбора изображения:', error);
      
      let errorMessage = 'Не удалось обработать изображение';
      
      if (error.message.includes('permission')) {
        errorMessage = 'Разрешение на доступ к камере или галерее отклонено';
      } else if (error.message.includes('canceled')) {
        return;
      } else if (error.message.includes('large')) {
        errorMessage = 'Файл изображения слишком большой. Выберите изображение меньшего размера.';
      } else if (error.message.includes('Invalid image')) {
        errorMessage = 'Неверный файл изображения. Выберите другое изображение.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Сетевая ошибка. Проверьте подключение.';
      } else {
        errorMessage = `Не удалось ${type === 'camera' ? 'сделать фото' : 'выбрать изображение'}`;
      }

      Alert.alert('Ошибка', errorMessage);

    } finally {
      setLoading(false);
    }
  };

  const launchCamera = () => handleImagePick('camera');
  const launchGallery = () => handleImagePick('gallery');

  const showImageTips = () => {
    Alert.alert(
      'Советы для лучших результатов',
      '• Используйте хорошее освещение\n• Смотрите прямо в камеру\n• Избегайте шляп и солнцезащитных очков\n• Используйте чистый фон\n• Лучше работают качественные изображения',
      [{ text: 'Понятно!', style: 'default' }]
    );
  };

  const showRecentPhotoPreview = () => {
    if (!lastPhoto) return;

    Alert.alert(
      'Недавнее фото',
      'Хотите использовать ваше последнее фото?',
      [
        {
          text: 'Использовать это фото',
          onPress: () => navigation.navigate('Camera', { photoUri: lastPhoto })
        },
        {
          text: 'Сделать новое фото',
          onPress: launchCamera
        },
        {
          text: 'Отмена',
          style: 'cancel'
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Найдите свой стиль</Text>

      <View style={styles.uploadBox}>
        <TouchableOpacity 
          style={styles.imageContainer}
          onPress={lastPhoto ? showRecentPhotoPreview : showImageTips}
          disabled={loading}
        >
          {lastPhoto ? (
            <Image 
              source={{ uri: lastPhoto }} 
              style={styles.imagePreview}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={48} color="#b388ff" />
            </View>
          )}
          <View style={styles.imageOverlay}>
            <Ionicons 
              name={lastPhoto ? "refresh" : "information-circle-outline"} 
              size={20} 
              color="#fff" 
            />
          </View>
        </TouchableOpacity>

        <Text style={styles.uploadText}>Загрузите фото, чтобы найти свой стиль</Text>
        <Text style={styles.subText}>
          Наш ИИ найдет вашего двойника среди знаменитостей и предложит идеальные стили для вас.
        </Text>

        <TouchableOpacity 
          style={[
            styles.primaryButton,
            loading && styles.buttonDisabled
          ]} 
          onPress={launchGallery}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="images-outline" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Загрузить из галереи</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.secondaryButton,
            loading && styles.buttonDisabled
          ]} 
          onPress={launchCamera}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#b388ff" />
          ) : (
            <>
              <Ionicons name="camera-outline" size={20} color="#b388ff" />
              <Text style={styles.secondaryButtonText}>Сделать фото</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tipsButton}
          onPress={showImageTips}
          disabled={loading}
        >
          <Text style={styles.tipsText}>📸 Советы для лучших результатов</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#b388ff" />
            <Text style={styles.loadingText}>Обрабатываем изображение...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d001f',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    alignSelf: 'flex-start',
    marginBottom: 40,
  },
  uploadBox: {
    width: '100%',
    backgroundColor: '#1a0033',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2b0059',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: '#3a0072',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 16,
  },
  imageOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 4,
  },
  uploadText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subText: {
    fontSize: 14,
    color: '#b5a3d9',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#b388ff',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: '#2b0059',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3d007a',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#b388ff',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  tipsButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  tipsText: {
    color: '#8a6bbf',
    fontSize: 12,
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 0, 31, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    backgroundColor: '#1a0033',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2b0059',
  },
  loadingText: {
    color: '#b5a3d9',
    marginTop: 12,
    fontSize: 14,
  },
});