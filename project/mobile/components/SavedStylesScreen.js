// components/SavedStylesScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  ScrollView,
  Linking,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import api from '../utils/api';

export default function SavedStylesScreen() {
  const [savedStyles, setSavedStyles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [removingStyle, setRemovingStyle] = useState(null);
  const isFocused = useIsFocused();

  const fetchSavedStyles = async () => {
    try {
      console.log('Загрузка сохраненных стилей...');
      const response = await api.get('/saved_styles');
      
      if (!response.data) {
        throw new Error('Нет данных от сервера');
      }
      
      setSavedStyles(response.data);
      
    } catch (err) {
      console.log('Ошибка загрузки сохраненных стилей:', err);
      
      let errorMessage = 'Не удалось загрузить сохраненные стили';
      
      if (err.response) {
        const status = err.response.status;
        switch (status) {
          case 401:
            errorMessage = 'Пожалуйста, войдите для просмотра сохраненных стилей';
            break;
          case 404:
            errorMessage = 'Эндпоинт сохраненных стилей не найден';
            break;
          case 500:
            errorMessage = 'Ошибка сервера. Попробуйте позже.';
            break;
          default:
            errorMessage = err.response?.data?.detail || `Ошибка ${status}`;
        }
      } else if (err.request) {
        errorMessage = 'Не удается подключиться к серверу. Проверьте соединение.';
      } else {
        errorMessage = err.message || 'Не удалось загрузить сохраненные стили';
      }
      
      Alert.alert('Ошибка', errorMessage);

      if (err.response?.status === 401) {
        setSavedStyles([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      console.log("SavedStylesScreen в фокусе, обновление данных...");
      fetchSavedStyles();
    }
  }, [isFocused]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSavedStyles();
  };

  const handleRemoveStyle = async (styleId) => {
    if (removingStyle) return; 
    
    setRemovingStyle(styleId);
    
    try {
      console.log('Удаление стиля:', styleId);
      const response = await api.delete(`/saved_styles/${styleId}`);
      
      if (response.status >= 200 && response.status < 300) {
        setSavedStyles(prev => prev.filter(style => style.id !== styleId));
        setModalVisible(false);
        
        Alert.alert('Успех', 'Стиль удален из вашей коллекции');
      } else {
        throw new Error(`Сервер вернул ${response.status}`);
      }
      
    } catch (err) {
      console.log('Ошибка удаления стиля:', err);
      
      let errorMessage = 'Не удалось удалить стиль';
      
      if (err.response) {
        switch (err.response.status) {
          case 404:
            errorMessage = 'Стиль не найден. Возможно, он уже был удален.';
            break;
          case 500:
            errorMessage = 'Ошибка сервера. Попробуйте еще раз.';
            break;
          default:
            errorMessage = err.response?.data?.detail || 'Не удалось удалить стиль';
        }
      } else if (err.request) {
        errorMessage = 'Сетевая ошибка. Проверьте подключение.';
      }
      
      Alert.alert('Ошибка', errorMessage);

      fetchSavedStyles();
      
    } finally {
      setRemovingStyle(null);
    }
  };

  const confirmRemoveStyle = (style) => {
    Alert.alert(
      'Удалить стиль',
      `Вы уверены, что хотите удалить "${style.name}" из сохраненных стилей?`,
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => handleRemoveStyle(style.id),
        },
      ]
    );
  };

  const openStyleDetails = (style) => {
    setSelectedStyle(style);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedStyle(null);
  };

  const handleLinkPress = async (link) => {
    try {
      const supported = await Linking.canOpenURL(link);
      
      if (supported) {
        await Linking.openURL(link);
      } else {
        Alert.alert('Ошибка', 'Не удается открыть эту ссылку');
      }
    } catch (error) {
      console.log('Ошибка открытия ссылки:', error);
      Alert.alert('Ошибка', 'Не удалось открыть ссылку');
    }
  };

  const retryLoad = () => {
    setLoading(true);
    fetchSavedStyles();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b388ff" />
        <Text style={styles.loadingText}>Загружаем ваши стили...</Text>
      </View>
    );
  }

  if (savedStyles.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons name="bookmark-outline" size={64} color="#b388ff" />
        </View>
        <Text style={styles.emptyTitle}>Пока нет сохраненных стилей</Text>
        <Text style={styles.emptySubtitle}>
          Сохраняйте любимые стили знаменитостей, чтобы видеть их здесь
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={retryLoad}>
          <Text style={styles.retryButtonText}>Обновить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Сохраненные стили</Text>
        <Text style={styles.subtitle}>
          {savedStyles.length} стил{savedStyles.length === 1 ? 'ь' : 'ей'} сохранено
        </Text>
      </View>

      <FlatList
        data={savedStyles}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#b388ff']}
            tintColor="#b388ff"
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card}
            onPress={() => openStyleDetails(item)}
            activeOpacity={0.7}
          >
            <Image 
              source={{ uri: item.celebrity_photo || item.photo_path }} 
              style={styles.image}
              onError={() => console.log('Не удалось загрузить изображение для:', item.name)}
            />

            <View style={styles.content}>
              <View style={styles.headerRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name || 'Неизвестная знаменитость'}
                </Text>
                <View style={styles.matchBadge}>
                  <Ionicons name="sparkles" size={12} color="#b388ff" />
                  <Text style={styles.matchText}>
                    {item.similarity ? `${(item.similarity * 100).toFixed(0)}% Совпадение` : 'Сохраненный стиль'}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.desc} numberOfLines={2}>
                {item.style_description || 'Описание недоступно'}
              </Text>
              
              <View style={styles.footer}>
                <Text style={styles.date}>
                  {item.created_at ? new Date(item.created_at).toLocaleDateString('ru-RU') : 'Неизвестная дата'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#b5a3d9" />
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Стили не найдены</Text>
          </View>
        }
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
        statusBarTranslucent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedStyle && (
              <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Детали стиля</Text>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={closeModal}
                    disabled={removingStyle === selectedStyle.id}
                  >
                    <Ionicons name="close" size={24} color="#b5a3d9" />
                  </TouchableOpacity>
                </View>

                <Image 
                  source={{ uri: selectedStyle.celebrity_photo || selectedStyle.photo_path }} 
                  style={styles.modalImage}
                  onError={() => console.log('Не удалось загрузить изображение')}
                />

                <View style={styles.modalSection}>
                  <Text style={styles.celebrityName}>
                    {selectedStyle.name || 'Неизвестная знаменитость'}
                  </Text>
                  <View style={styles.similarityBadge}>
                    <Ionicons name="sparkles" size={16} color="#b388ff" />
                    <Text style={styles.similarityText}>
                      {selectedStyle.similarity ? 
                        `${(selectedStyle.similarity * 100).toFixed(0)}% Совпадение` : 
                        'Сохраненный стиль'
                      }
                    </Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Анализ стиля</Text>
                  <View style={styles.descriptionCard}>
                    <Ionicons name="color-palette" size={20} color="#b388ff" />
                    <Text style={styles.descriptionText}>
                      {selectedStyle.style_description || 'Описание стиля недоступно.'}
                    </Text>
                  </View>
                </View>

                {selectedStyle.shops_links && (
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Где купить</Text>
                    <View style={styles.linksContainer}>
                      {selectedStyle.shops_links.split(',').map((link, i) => (
                        <TouchableOpacity 
                          key={i}
                          style={styles.linkCard}
                          onPress={() => handleLinkPress(link.trim())}
                          disabled={!link.trim()}
                        >
                          <Ionicons name="cart-outline" size={18} color="#b388ff" />
                          <Text style={styles.linkText} numberOfLines={1}>
                            {link.trim() ? 
                              link.trim().replace(/^https?:\/\//, '').split('/')[0] : 
                              'Неверная ссылка'
                            }
                          </Text>
                          <Ionicons name="open-outline" size={16} color="#b5a3d9" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Детали</Text>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <Ionicons name="calendar-outline" size={16} color="#b5a3d9" />
                      <Text style={styles.infoLabel}>Сохранено</Text>
                      <Text style={styles.infoValue}>
                        {selectedStyle.created_at ? 
                          new Date(selectedStyle.created_at).toLocaleDateString('ru-RU', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 
                          'Неизвестная дата'
                        }
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Ionicons name="time-outline" size={16} color="#b5a3d9" />
                      <Text style={styles.infoLabel}>Тип стиля</Text>
                      <Text style={styles.infoValue}>Вдохновлен знаменитостями</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={[
                      styles.removeButton,
                      removingStyle === selectedStyle.id && styles.removeButtonDisabled
                    ]}
                    onPress={() => confirmRemoveStyle(selectedStyle)}
                    disabled={removingStyle === selectedStyle.id}
                  >
                    {removingStyle === selectedStyle.id ? (
                      <ActivityIndicator size="small" color="#ff6b6b" />
                    ) : (
                      <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
                    )}
                    <Text style={styles.removeButtonText}>
                      {removingStyle === selectedStyle.id ? 'Удаляем...' : 'Удалить стиль'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.closeActionButton}
                    onPress={closeModal}
                    disabled={removingStyle === selectedStyle.id}
                  >
                    <Text style={styles.closeActionText}>Закрыть</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d001f',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d001f',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1a0033',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#2b0059',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#b5a3d9',
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#b388ff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#b5a3d9',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#1a0033',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2b0059',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: '#2b0059',
  },
  content: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  name: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2b0059',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  matchText: {
    color: '#b388ff',
    fontSize: 12,
    fontWeight: '600',
  },
  desc: {
    color: '#b5a3d9',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    color: '#8a6bbf',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    color: '#b5a3d9',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0d001f',
    borderRadius: 20,
    padding: 0,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#2b0059',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalScrollContent: {
    flexGrow: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2b0059',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2b0059',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#2b0059',
  },
  modalSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2b0059',
  },
  celebrityName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  similarityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2b0059',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 6,
  },
  similarityText: {
    color: '#b388ff',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
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
  infoGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  infoItem: {
    flex: 1,
    backgroundColor: '#1a0033',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2b0059',
    alignItems: 'center',
  },
  infoLabel: {
    color: '#b5a3d9',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalActions: {
    padding: 20,
    gap: 12,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2b0059',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff6b6b',
    gap: 8,
  },
  removeButtonDisabled: {
    opacity: 0.6,
  },
  removeButtonText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '600',
  },
  closeActionButton: {
    backgroundColor: '#b388ff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});