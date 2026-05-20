import { api } from './api';

export interface LoginCredentials {
  username: string;
  password: string;
}

export async function login(credentials: LoginCredentials): Promise<void> {
  const { data } = await api.post<{ token: string }>('/admin/login', credentials);
  localStorage.setItem('adminToken', data.token);
}

export function logout(): void {
  localStorage.removeItem('adminToken');
  window.location.href = '/login';
}

export function isAuthenticated(): boolean {
  return Boolean(localStorage.getItem('adminToken'));
}
