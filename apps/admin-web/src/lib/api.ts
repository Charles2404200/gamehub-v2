import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001',
  withCredentials: true,
});

function getNormalizedAdminToken(): string | null {
  const raw = localStorage.getItem('adminToken');
  if (!raw) return null;

  const token = raw.replace(/^"(.+)"$/, '$1').trim();
  if (!token || token === 'undefined' || token === 'null') return null;
  return token;
}

// Attach admin token to every request automatically
api.interceptors.request.use((config) => {
  const token = getNormalizedAdminToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem('adminToken');
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
