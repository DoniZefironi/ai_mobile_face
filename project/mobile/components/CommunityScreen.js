// components/CommunityScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';

const { width: screenWidth } = Dimensions.get('window');

export default function CommunityScreen() {
  const [celebrities, setCelebrities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCelebrity, setSelectedCelebrity] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchCelebrities = async () => {
    try {
      const response = await api.get('/celebrities');
      setCelebrities(response.data);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Не удалось загрузить знаменитостей';
      Alert.alert('Ошибка', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCelebrities();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCelebrities();
  };

  const openCelebrityDetails = (celebrity) => {
    setSelectedCelebrity(celebrity);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedCelebrity(null);
  };

  const handleSaveStyle = async (celebrityId) => {
    try {
      const response = await api.post(`/save_style/${celebrityId}`);
      if (response.ok) {
        Alert.alert('Успех', 'Стиль сохранен в вашу коллекцию!');
      }
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось сохранить стиль');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b388ff" />
        <Text style={styles.loadingText}>Ищем стили...</Text>
      </View>
    );
  }

  const renderItem = ({ item, index }) => (
    <TouchableOpacity 
      style={[
        styles.card,
        index % 2 === 0 ? { marginRight: 6 } : { marginLeft: 6 }
      ]}
      onPress={() => openCelebrityDetails(item)}
      activeOpacity={0.9}
    >
      <Image 
        source={{ uri: item.photo_path }} 
        style={styles.image}
        resizeMode="cover"
      />
      
      <View style={styles.gradientOverlay} />
      
      <View style={styles.cardContent}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.style} numberOfLines={2}>
          {item.style_description}
        </Text>
        
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={(e) => {
              e.stopPropagation();
              handleSaveStyle(item.id);
            }}
          >
            <Ionicons name="bookmark-outline" size={16} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Источники вдохновения</Text>
        <Text style={styles.subtitle}>
          Откройте для себя тренды знаменитостей
        </Text>
      </View>
      <FlatList
        data={celebrities}
        numColumns={2}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        columnWrapperStyle={styles.columnWrapper}
      />
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedCelebrity && (
              <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
              >
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={closeModal}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                <Image 
                  source={{ uri: selectedCelebrity.photo_path }} 
                  style={styles.modalImage}
                />
                <View style={styles.modalBody}>
                  <Text style={styles.modalName}>{selectedCelebrity.name}</Text>
               
                  <View style={styles.descriptionSection}>
                    <Text style={styles.sectionTitle}>Описание стиля</Text>
                    <Text style={styles.modalDescription}>
                      {selectedCelebrity.style_description}
                    </Text>
                  </View>
                  <View style={styles.tagsSection}>
                    <Text style={styles.sectionTitle}>Элементы стиля</Text>
                    <View style={styles.tagsContainer}>
                      {selectedCelebrity.style_description?.split(' ').slice(0, 5).map((word, index) => (
                        <View key={index} style={styles.tag}>
                          <Text style={styles.tagText}>{word}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {selectedCelebrity.shops_links && (
                    <View style={styles.linksSection}>
                      <Text style={styles.sectionTitle}>Где купить</Text>
                      <View style={styles.linksContainer}>
                        {selectedCelebrity.shops_links.split(',').slice(0, 3).map((link, i) => (
                          <TouchableOpacity 
                            key={i}
                            style={styles.linkCard}
                            onPress={() => Linking.openURL(link.trim())}
                          >
                            <Ionicons name="cart-outline" size={18} color="#b388ff" />
                            <Text style={styles.linkText} numberOfLines={1}>
                              Магазин {link.trim().replace(/^https?:\/\//, '').split('.')[1] || 'Здесь'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      style={styles.saveActionButton}
                      onPress={() => handleSaveStyle(selectedCelebrity.id)}
                    >
                      <Ionicons name="bookmark-outline" size={20} color="#fff" />
                      <Text style={styles.saveActionText}>Сохранить стиль</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.shareButton}>
                      <Ionicons name="share-social-outline" size={20} color="#b388ff" />
                      <Text style={styles.shareText}>Поделиться</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const CARD_MARGIN = 6;
const cardWidth = (screenWidth - 48 - CARD_MARGIN) / 2;

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
  grid: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: CARD_MARGIN * 2,
  },
  card: {
    width: cardWidth,
    backgroundColor: '#1a0033',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2b0059',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  image: {
    width: '100%',
    height: cardWidth * 1.4,
    backgroundColor: '#2b0059',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundImage: 'linear-gradient(transparent, rgba(13, 0, 31, 0.9))',
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  name: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  style: {
    color: '#b5a3d9',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saveButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(179, 136, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#0d001f',
  },
  modalScrollContent: {
    paddingBottom: 40,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 24,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: 400,
    backgroundColor: '#2b0059',
  },
  modalBody: {
    padding: 24,
  },
  modalName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  },
  descriptionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  modalDescription: {
    color: '#b5a3d9',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  tagsSection: {
    marginBottom: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#2b0059',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3d007a',
  },
  tagText: {
    color: '#b388ff',
    fontSize: 12,
    fontWeight: '600',
  },
  linksSection: {
    marginBottom: 32,
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
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  saveActionButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#b388ff',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2b0059',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3d007a',
    gap: 8,
  },
  shareText: {
    color: '#b388ff',
    fontSize: 16,
    fontWeight: '600',
  },
});