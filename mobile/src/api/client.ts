import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const API_BASE_URL = __DEV__
  ? Platform.OS === 'android'
    ? 'http://10.0.2.2:8000/v1'
    : 'http://localhost:8000/v1'
  : 'https://sas-backend.onrender.com/v1';

const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: add authorization header
client.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const access_token = await SecureStore.getItemAsync('access_token');
      if (access_token) {
        config.headers.Authorization = `Bearer ${access_token}`;
      }
    } catch (error) {
      console.error('Error reading access token from SecureStore:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 and refresh token
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refresh_token = await SecureStore.getItemAsync('refresh_token');
        if (!refresh_token) {
          // No refresh token, clear auth and redirect to login
          await SecureStore.deleteItemAsync('access_token');
          await SecureStore.deleteItemAsync('refresh_token');
          throw new Error('No refresh token available');
        }

        // Call refresh endpoint
        const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token,
        });

        const { access_token, refresh_token: new_refresh_token } = refreshResponse.data;

        // Save new tokens
        await SecureStore.setItemAsync('access_token', access_token);
        if (new_refresh_token) {
          await SecureStore.setItemAsync('refresh_token', new_refresh_token);
        }

        // Update authorization header and retry original request
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return client(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Clear stored tokens and let app redirect to login
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default client;
