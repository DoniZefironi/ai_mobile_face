// utils/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://10.103.25.248:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    console.log("DEBUG: Interceptor adding token:", token); 
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    console.log("DEBUG: Config before sending:", config);
    return config;
  },
  (error) => {
    console.log("DEBUG: Interceptor error:", error); 
    return Promise.reject(error);
  }
);

export default api;