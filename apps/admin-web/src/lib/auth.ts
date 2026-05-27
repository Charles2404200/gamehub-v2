import { api } from './api';
import { clearAdminToken, getAdminToken, setAdminToken } from './adminToken';

export interface LoginCredentials {
  username: string;
  password: string;
}

export async function login(credentials: LoginCredentials): Promise<void> {
  const { data } = await api.post<{ token: string }>('/admin/login', credentials);
  setAdminToken(data.token);
}

export function logout(): void {
  clearAdminToken();
  window.location.href = '/login';
}

export function isAuthenticated(): boolean {
  return Boolean(getAdminToken());
}
