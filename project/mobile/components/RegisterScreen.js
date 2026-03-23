// components/RegisterScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!username.trim()) {
      newErrors.username = 'Имя пользователя обязательно';
    } else if (username.trim().length < 3) {
      newErrors.username = 'Имя пользователя должно быть не менее 3 символов';
    } else if (username.trim().length > 20) {
      newErrors.username = 'Имя пользователя должно быть не более 20 символов';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      newErrors.username = 'Имя пользователя может содержать только буквы, цифры и подчеркивание';
    }

    if (!email.trim()) {
      newErrors.email = 'Email обязателен';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Пожалуйста, введите корректный email адрес';
    }

    if (!password) {
      newErrors.password = 'Пароль обязателен';
    } else if (password.length < 6) {
      newErrors.password = 'Пароль должен быть не менее 6 символов';
    } else if (password.length > 50) {
      newErrors.password = 'Пароль должен быть не более 50 символов';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = 'Пароль должен содержать заглавные и строчные буквы, а также цифры';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      console.log('Попытка регистрации...');
      
      const response = await axios.post('http://10.103.25.248:8000/register', {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password: password,
      }, {
        timeout: 10000, 
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('Регистрация успешна:', response.status);
      
      Alert.alert(
        'Успех 🎉', 
        'Аккаунт успешно создан!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );

    } catch (err) {
      console.log('Ошибка регистрации:', err);
   
      let errorMessage = 'Ошибка регистрации';

      if (axios.isCancel(err)) {
        errorMessage = 'Запрос был отменен';
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Таймаут соединения. Проверьте интернет-соединение.';
      } else if (err.response) {

        const status = err.response.status;
        const data = err.response.data;

        switch (status) {
          case 400:
            errorMessage = data.detail || 'Неверные данные регистрации';
            break;
          case 409:
            errorMessage = data.detail || 'Имя пользователя или email уже существуют';
            break;
          case 422:
            errorMessage = 'Ошибка валидации. Проверьте введенные данные.';
            break;
          case 500:
            errorMessage = 'Ошибка сервера. Попробуйте позже.';
            break;
          default:
            errorMessage = data.detail || `Ошибка регистрации (${status})`;
        }
      } else if (err.request) {

        if (err.message.includes('Network Error')) {
          errorMessage = 'Сетевая ошибка. Проверьте интернет-соединение.';
        } else {
          errorMessage = 'Нет ответа от сервера. Попробуйте еще раз.';
        }
      } else {

        errorMessage = err.message || 'Произошла непредвиденная ошибка';
      }

      Alert.alert('Ошибка регистрации', errorMessage);

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
        setUsername(value);
        break;
      case 'email':
        setEmail(value);
        break;
      case 'password':
        setPassword(value);
        break;
    }
  };

  const isFormValid = username.trim() && email.trim() && password.length >= 6;

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Создать аккаунт</Text>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Имя пользователя"
              placeholderTextColor="#a38bcf"
              value={username}
              onChangeText={(value) => handleInputChange('username', value)}
              style={[
                styles.input,
                errors.username && styles.inputError
              ]}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            {errors.username && (
              <Text style={styles.errorText}>{errors.username}</Text>
            )}
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Email"
              placeholderTextColor="#a38bcf"
              value={email}
              onChangeText={(value) => handleInputChange('email', value)}
              style={[
                styles.input,
                errors.email && styles.inputError
              ]}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading}
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Пароль"
              placeholderTextColor="#a38bcf"
              secureTextEntry
              value={password}
              onChangeText={(value) => handleInputChange('password', value)}
              style={[
                styles.input,
                errors.password && styles.inputError
              ]}
              editable={!loading}
            />
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
            <Text style={styles.passwordHint}>
              Должен быть 6+ символов с заглавными, строчными буквами и цифрами
            </Text>
          </View>
          <TouchableOpacity 
            style={[
              styles.proceedButton,
              (!isFormValid || loading) && styles.proceedButtonDisabled
            ]} 
            onPress={handleRegister}
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.proceedButtonText}>Создать аккаунт</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            disabled={loading}
            style={styles.linkContainer}
          >
            <Text style={styles.link}>Уже есть аккаунт? Войти</Text>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 40,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    alignItems: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    backgroundColor: '#2b0059',
    borderColor: '#3d007a',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 16,
  },
  inputError: {
    borderColor: '#ff6b6b',
    backgroundColor: '#3a0029',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  passwordHint: {
    color: '#8a6bbf',
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
  },
  proceedButton: {
    width: '100%',
    backgroundColor: '#b388ff',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  proceedButtonDisabled: {
    backgroundColor: '#6d4a9e',
    opacity: 0.6,
  },
  proceedButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  linkContainer: {
    marginTop: 16,
  },
  link: {
    color: '#b5a3d9',
    fontSize: 14,
    textAlign: 'center',
  },
});