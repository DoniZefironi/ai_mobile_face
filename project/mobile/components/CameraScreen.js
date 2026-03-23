// mobile/components/CameraScreen.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function CameraScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { photoUri } = route.params || {};

  const launchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Ошибка', 'Необходимо разрешение для использования камеры');
      return;
    }
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.7,
    });
    if (!result.canceled) {
      navigation.setParams({ photoUri: result.assets[0].uri });
    }
  };

  const launchGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Ошибка', 'Необходимо разрешение для доступа к галерее');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.7,
    });
    if (!result.canceled) {
      navigation.setParams({ photoUri: result.assets[0].uri });
    }
  };

  const handleAnalyze = () => {
    if (!photoUri) {
      Alert.alert('Ошибка', 'Пожалуйста, сначала загрузите фото');
      return;
    }
    navigation.navigate('Result', { photoUri });
  };

  const handleGoHome = () => {
    navigation.navigate('MainTabs', { screen: 'Home' });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
        <Ionicons name="home" size={24} color="#b388ff" />
        <Text style={styles.homeButtonText}>Главная</Text>
      </TouchableOpacity>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Найдите свой стиль</Text>
        <View style={styles.previewBox}>
          <View style={styles.previewBackground}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.previewImage} />
            ) : (
              <Ionicons name="image-outline" size={48} color="#b388ff" />
            )}
          </View>
        </View>
        <View style={styles.contentContainer}>
          <Text style={styles.readyTitle}>Ваше фото готово!</Text>
          <Text style={styles.readySubtitle}>
            Готовы увидеть своего двойника среди знаменитостей и получить персональные рекомендации по стилю?
          </Text>
          <TouchableOpacity style={styles.grayButton} onPress={launchGallery}>
            <Ionicons name="image-outline" size={18} color="#c7c7d3" />
            <Text style={styles.grayButtonText}>Загрузить из галереи</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.grayButton} onPress={launchCamera}>
            <Ionicons name="camera-outline" size={18} color="#c7c7d3" />
            <Text style={styles.grayButtonText}>Сделать фото</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.proceedButton} onPress={handleAnalyze}>
            <Text style={styles.proceedButtonText}>Продолжить →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d001f',
  },
  homeButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a0033',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2b0059',
    gap: 6,
  },
  homeButtonText: {
    color: '#b388ff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40, 
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
    width: '100%',
  },
  previewBox: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  previewBackground: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#3a0072',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
  },
  readyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  readySubtitle: {
    fontSize: 14,
    color: '#b5a3d9',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  grayButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2b0059',
    borderColor: '#3d007a',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    marginBottom: 12,
  },
  grayButtonText: {
    color: '#c7c7d3',
    fontSize: 16,
    fontWeight: '600',
  },
  proceedButton: {
    width: '100%',
    backgroundColor: '#b388ff',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  proceedButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});