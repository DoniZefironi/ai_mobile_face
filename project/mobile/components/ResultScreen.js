import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function ResultScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { photoUri } = route.params || {};
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!photoUri) {
      setError('Фото не передано. Пожалуйста, загрузите фото и попробуйте снова.');
      setLoading(false);
      return;
    }

    const analyze = async () => {
      console.log("DEBUG: photoUri =", photoUri);

      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        setError('Вы не авторизованы. Пожалуйста, войдите в приложение.');
        setLoading(false);
        return;
      }
      console.log("DEBUG: Token in ResultScreen =", token);

      const formData = new FormData();
      formData.append('file', {
        uri: photoUri,
        name: 'photo.jpg',
        type: 'image/jpeg',
      });

      try {
        const response = await fetch('http://10.103.25.248:8000/analyze', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            setError('Сессия истекла. Пожалуйста, войдите снова.');
            await AsyncStorage.removeItem('access_token');
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            return;
          }
          if (response.status === 400) {
            const errorText = await response.text();
            setError('Фото не содержит лица. Пожалуйста, выберите фото с чётким изображением лица.');
            return;
          }
          if (response.status === 404) {
            setError('Не удалось найти похожую знаменитость. Попробуйте другое фото.');
            return;
          }
          if (response.status === 422) {
            setError('Фото не удалось обработать. Пожалуйста, загрузите другое фото.');
            return;
          }
          if (response.status >= 500) {
            setError('Сервер временно недоступен. Попробуйте позже.');
            return;
          }
          const errorText = await response.text();
          setError('Не удалось проанализировать фото. ' + (errorText || 'Проверьте подключение.'));
          return;
        }

        const result = await response.json();
        console.log("DEBUG: Backend returned result:", result);
        setResult(result);
      } catch (err) {
        console.log("DEBUG: Network error:", err);
        if (err.message.includes('Network')) {
          setError('Ошибка подключения: не удаётся связаться с сервером. Проверьте Wi-Fi и IP-адрес.');
        } else {
          setError('Ошибка подключения: ' + err.message);
        }
      } finally {
        setLoading(false);
      }
    };
    analyze();
  }, [photoUri]);

  const handleSaveStyle = async () => {
    if (!result) {
      Alert.alert('Ошибка', 'Нет данных для сохранения');
      return;
    }

    if (!result.id) {
      Alert.alert('Ошибка', 'ID знаменитости не найден');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        setError('Вы не авторизованы. Пожалуйста, войдите снова.');
        navigation.navigate('Login');
        return;
      }

      const celebrityId = result.id;

      const response = await fetch(`http://10.103.25.248:8000/save_style/${celebrityId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        Alert.alert('Успех', 'Стиль сохранён в вашу коллекцию!');
      } else {
        if (response.status === 401) {
          setError('Сессия истекла. Пожалуйста, войдите снова.');
          await AsyncStorage.removeItem('access_token');
          navigation.navigate('Login');
          return;
        }
        if (response.status === 400) {
          Alert.alert('Уже сохранено', 'Этот стиль уже есть в вашей коллекции.');
          return;
        }
        if (response.status === 404) {
          Alert.alert('Ошибка', 'Знаменитость не найдена.');
          return;
        }
        const errorText = await response.text();
        Alert.alert('Ошибка', 'Не удалось сохранить стиль: ' + errorText);
      }
    } catch (err) {
      console.log("DEBUG: Save error:", err);
      if (err.message.includes('Network')) {
        Alert.alert('Ошибка', 'Не удаётся подключиться к серверу. Проверьте подключение.');
      } else {
        Alert.alert('Ошибка', 'Ошибка сохранения: ' + err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleGoHome = () => {
    navigation.navigate('MainTabs', { screen: 'Home' });
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
        <Text style={styles.errorTitle}>Что-то пошло не так</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Вернуться назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b388ff" />
        <Text style={styles.loadingText}>Анализируем ваш стиль...</Text>
      </View>
    );

  if (!result) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
        <Ionicons name="home" size={24} color="#b388ff" />
        <Text style={styles.homeButtonText}>Главная</Text>
      </TouchableOpacity>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ваш стиль</Text>
          <Text style={styles.headerSubtitle}>Похож на знаменитость</Text>
        </View>

        <View style={styles.matchCard}>
          <View style={styles.imagesContainer}>
            <View style={styles.imageWrapper}>
              <Image source={{ uri: photoUri }} style={styles.image} />
              <Text style={styles.imageLabel}>Ваше фото</Text>
            </View>
            
            <View style={styles.vsContainer}>
              <Text style={styles.vsText}>VS</Text>
            </View>

            <View style={styles.imageWrapper}>
              <Image source={{ uri: result.celebrity_photo }} style={styles.image} />
              <Text style={styles.imageLabel}>Стиль знаменитости</Text>
            </View>
          </View>

          <View style={styles.matchInfo}>
            <Text style={styles.celebrityName}>{result.name}</Text>
            <View style={styles.similarityBadge}>
              <Ionicons name="sparkles" size={16} color="#b388ff" />
              <Text style={styles.similarityText}>
                {(result.similarity * 100).toFixed(0)}% Совпадение
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
            onPress={handleSaveStyle}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="bookmark-outline" size={20} color="#fff" />
            )}
            <Text style={styles.saveButtonText}>
              {saving ? 'Сохраняем...' : 'Сохранить стиль'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Анализ стиля</Text>
          <View style={styles.descriptionCard}>
            <Ionicons name="color-palette" size={24} color="#b388ff" />
            <Text style={styles.descriptionText}>{result.style_description}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Где купить</Text>
          <View style={styles.linksContainer}>
            {result.shops_links.split(',').map((link, i) => (
              <TouchableOpacity 
                key={i}
                style={styles.linkCard}
                onPress={() => Linking.openURL(link.trim())}
              >
                <Ionicons name="cart-outline" size={20} color="#b388ff" />
                <Text style={styles.linkText} numberOfLines={1}>
                  {link.trim().replace(/^https?:\/\//, '').split('/')[0]}
                </Text>
                <Ionicons name="open-outline" size={16} color="#b5a3d9" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d001f',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 100, 
    paddingBottom: 40, 
  },
  bottomSpacer: {
    height: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d001f',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF6B6B',
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#b5a3d9',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#b388ff',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d001f',
  },
  loadingText: {
    color: '#b5a3d9',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#b5a3d9',
    textAlign: 'center',
  },
  matchCard: {
    backgroundColor: '#1a0033',
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2b0059',
  },
  imagesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  imageWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: '#2b0059',
  },
  imageLabel: {
    color: '#b5a3d9',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  vsContainer: {
    paddingHorizontal: 12,
  },
  vsText: {
    color: '#b388ff',
    fontSize: 14,
    fontWeight: 'bold',
    backgroundColor: '#2b0059',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  matchInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  celebrityName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  similarityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2b0059',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  similarityText: {
    color: '#b388ff',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#b388ff',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#6d4a9e',
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  descriptionCard: {
    backgroundColor: '#1a0033',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2b0059',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  descriptionText: {
    color: '#b5a3d9',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  linksContainer: {
    gap: 8,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a0033',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2b0059',
    gap: 12,
  },
  linkText: {
    color: '#b5a3d9',
    fontSize: 14,
    flex: 1,
  },
});