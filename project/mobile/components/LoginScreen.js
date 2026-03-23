// components/LoginScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    checkExistingToken();
  }, []);

  const checkExistingToken = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        console.log('Найден существующий токен, проверка...');
      }
    } catch (error) {
      console.log('Ошибка проверки токена:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!username.trim()) {
      newErrors.username = 'Имя пользователя обязательно';
    } else if (username.trim().length < 2) {
      newErrors.username = 'Имя пользователя должно быть не менее 2 символов';
    }

    if (!password) {
      newErrors.password = 'Пароль обязателен';
    } else if (password.length < 1) {
      newErrors.password = 'Пожалуйста, введите ваш пароль';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    Keyboard.dismiss();

    setErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      console.log('Попытка входа...');
      
      const formData = new FormData();
      formData.append('username', username.trim());
      formData.append('password', password);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('Время ожидания входа истекло');
      }, 15000); 

      const response = await fetch('http://10.103.25.248:8000/token', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'StyleMatchApp/1.0.0',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { detail: await response.text() };
        }
        
        console.log('Ошибка сервера:', response.status, errorData);
        
        let errorMessage = 'Ошибка входа';
        
        switch (response.status) {
          case 400:
            errorMessage = errorData.detail || 'Неверный формат запроса';
            break;
          case 401:
            errorMessage = errorData.detail || 'Неверное имя пользователя или пароль';
            break;
          case 422:
            errorMessage = errorData.detail || 'Ошибка валидации. Проверьте введенные данные.';
            break;
          case 429:
            errorMessage = 'Слишком много попыток входа. Попробуйте позже.';
            break;
          case 500:
            errorMessage = 'Ошибка сервера. Попробуйте позже.';
            break;
          case 502:
          case 503:
          case 504:
            errorMessage = 'Сервис временно недоступен. Попробуйте позже.';
            break;
          default:
            errorMessage = errorData.detail || `Ошибка входа (${response.status})`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data.access_token) {
        throw new Error('Сервер не вернул токен доступа');
      }

      console.log('Вход успешен, токен получен');

      await AsyncStorage.multiSet([
        ['access_token', data.access_token],
        ['username', username.trim()],
        ['login_timestamp', new Date().toISOString()],
      ]);
      
      const storedToken = await AsyncStorage.getItem('access_token');
      if (!storedToken) {
        throw new Error('Не удалось сохранить токен аутентификации');
      }

      console.log('Токен успешно сохранен, переход в приложение...');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      navigation.reset({ 
        index: 0, 
        routes: [{ name: 'MainTabs' }] 
      });

    } catch (err) {
      console.log('Ошибка входа:', err);
      
      let errorMessage = 'Ошибка входа';
      let showRetry = false;
      
      if (err.name === 'AbortError') {
        errorMessage = 'Таймаут соединения. Проверьте интернет-соединение.';
        showRetry = true;
      } else if (err.message.includes('Network request failed') || err.message.includes('fetch')) {
        errorMessage = 'Сетевая ошибка. Проверьте интернет-соединение.';
        showRetry = true;
      } else if (err.message.includes('Failed to connect') || err.message.includes('ECONNREFUSED')) {
        errorMessage = 'Не удается подключиться к серверу. Проверьте, запущен ли сервер.';
        showRetry = true;
      } else if (err.message.includes('ENOTFOUND')) {
        errorMessage = 'Не удается достичь сервера. Проверьте сетевое подключение.';
        showRetry = true;
      } else {
        errorMessage = err.message || 'Неверные учетные данные или ошибка сервера';
      }

      const alertButtons = [{ text: 'OK' }];
      if (showRetry) {
        alertButtons.unshift({
          text: 'Повторить',
          onPress: handleLogin,
        });
      }

      Alert.alert('Ошибка входа', errorMessage, alertButtons);

    } finally {
      setLoading(false);
    }
  };

  const clearError = (field) => {
    setErrors(prev => ({
      ...prev,
      [field]: ''
    }));
  };

  const handleInputChange = (field, value) => {
    if (errors[field]) {
      clearError(field);
    }
    
    switch (field) {
      case 'username':
        if (value.length <= 50) {
          setUsername(value);
        }
        break;
      case 'password':
        if (value.length <= 100) {
          setPassword(value);
        }
        break;
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Забыли пароль?',
      'Пожалуйста, свяжитесь с поддержкой по адресу support@stylematch.com или попробуйте сбросить пароль через наш веб-сайт.',
      [
        {
          text: 'Скопировать email',
          onPress: () => {
            Alert.alert('Скопировано', 'Email поддержки скопирован в буфер обмена');
          }
        },
        { text: 'OK', style: 'default' }
      ]
    );
  };

  const toggleSecureEntry = () => {
    setSecureTextEntry(!secureTextEntry);
  };

  const handleTestCredentials = () => {
    if (__DEV__) {
      setUsername('testuser');
      setPassword('testpass123');
      Alert.alert('Тестовые данные', 'Тестовые данные заполнены. Нажмите "Войти" для тестирования.');
    }
  };

  const isFormValid = username.trim() && password;

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          isKeyboardVisible && styles.scrollContentKeyboard
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>С возвращением</Text>
          <Text style={styles.subtitle}>Войдите в свой аккаунт</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Имя пользователя</Text>
            <TextInput
              placeholder="Введите имя пользователя"
              placeholderTextColor="#a38bcf"
              value={username}
              onChangeText={(value) => handleInputChange('username', value)}
              style={[
                styles.input,
                errors.username && styles.inputError
              ]}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              editable={!loading}
              returnKeyType="next"
              maxLength={50}
            />
            {errors.username && (
              <Text style={styles.errorText}>{errors.username}</Text>
            )}
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Пароль</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Введите ваш пароль"
                placeholderTextColor="#a38bcf"
                secureTextEntry={secureTextEntry}
                value={password}
                onChangeText={(value) => handleInputChange('password', value)}
                style={[
                  styles.input,
                  styles.passwordInput,
                  errors.password && styles.inputError
                ]}
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                maxLength={100}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={toggleSecureEntry}
                disabled={loading}
              >
                <Ionicons 
                  name={secureTextEntry ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#b5a3d9" 
                />
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
          </View>
          <TouchableOpacity 
            style={styles.forgotPasswordContainer}
            onPress={handleForgotPassword}
            disabled={loading}
          >
            <Text style={styles.forgotPasswordText}>Забыли пароль?</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.proceedButton,
              (!isFormValid || loading) && styles.proceedButtonDisabled
            ]} 
            onPress={handleLogin}
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={20} color="#fff" />
                <Text style={styles.proceedButtonText}>Войти</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Register')}
            disabled={loading}
            style={styles.linkContainer}
          >
            <Text style={styles.link}>
              Нет аккаунта? <Text style={styles.linkBold}>Создать</Text>
            </Text>
          </TouchableOpacity>
        </View>
        {__DEV__ && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>
              Сервер: 10.103.25.248:8000
            </Text>
            <TouchableOpacity onPress={handleTestCredentials}>
              <Text style={styles.debugText}>Заполнить тестовые данные</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d001f',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  scrollContentKeyboard: {
    justifyContent: 'flex-start',
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#b5a3d9',
    textAlign: 'center',
    lineHeight: 22,
  },
  formContainer: {
    width: '100%',
    alignItems: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  inputLabel: {
    color: '#b5a3d9',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    width: '100%',
    backgroundColor: '#2b0059',
    borderColor: '#3d007a',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 16,
  },
  inputError: {
    borderColor: '#ff6b6b',
    backgroundColor: '#3a0029',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -8,
  },
  forgotPasswordText: {
    color: '#b388ff',
    fontSize: 14,
    fontWeight: '500',
  },
  proceedButton: {
    width: '100%',
    backgroundColor: '#b388ff',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#b388ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  proceedButtonDisabled: {
    backgroundColor: '#6d4a9e',
    opacity: 0.6,
    shadowOpacity: 0.1,
  },
  proceedButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  linkContainer: {
    marginTop: 24,
    padding: 8,
  },
  link: {
    color: '#b5a3d9',
    fontSize: 14,
    textAlign: 'center',
  },
  linkBold: {
    color: '#b388ff',
    fontWeight: '600',
  },
  debugContainer: {
    marginTop: 30,
    padding: 12,
    backgroundColor: '#1a0033',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2b0059',
    alignItems: 'center',
    gap: 8,
  },
  debugText: {
    color: '#8a6bbf',
    fontSize: 12,
    textAlign: 'center',
  },
});