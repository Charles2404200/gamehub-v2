import axios from 'axios';
import { clearAdminToken, getAdminToken } from './adminToken';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001',
  withCredentials: true,
});

// Attach admin token to every request automatically
api.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
    config.headers['x-admin-token'] = token;
  } else {
    clearAdminToken();
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      clearAdminToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
