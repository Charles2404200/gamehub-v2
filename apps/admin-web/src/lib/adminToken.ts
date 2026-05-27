const TOKEN_KEYS = ['adminToken', 'token', 'admin_token', 'authToken'] as const;

function normalizeToken(raw: string | null): string | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return null;

  const unquoted = trimmed.replace(/^"(.+)"$/, '$1').trim();
  if (!unquoted || unquoted === 'undefined' || unquoted === 'null') return null;

  if (unquoted.startsWith('{') && unquoted.endsWith('}')) {
    try {
      const parsed = JSON.parse(unquoted) as { token?: unknown; accessToken?: unknown };
      const candidate = typeof parsed.token === 'string'
        ? parsed.token
        : typeof parsed.accessToken === 'string'
          ? parsed.accessToken
          : null;
      return normalizeToken(candidate);
    } catch {
      return null;
    }
  }

  return unquoted;
}

export function getAdminToken(): string | null {
  for (const key of TOKEN_KEYS) {
    const local = normalizeToken(localStorage.getItem(key));
    if (local) return local;

    const session = normalizeToken(sessionStorage.getItem(key));
    if (session) {
      localStorage.setItem('adminToken', session);
      return session;
    }
  }

  return null;
}

export function setAdminToken(token: string): void {
  const normalized = normalizeToken(token);
  if (!normalized) return;

  localStorage.setItem('adminToken', normalized);
  sessionStorage.setItem('adminToken', normalized);
}

export function clearAdminToken(): void {
  for (const key of TOKEN_KEYS) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}
