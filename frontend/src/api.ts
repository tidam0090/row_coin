import type { Game, AccessRequest, AdminRequestRow, AuthUser } from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export const api = {
  getGames: () => fetch(`${API_URL}/games`).then((r) => handle<Game[]>(r)),

  register: (email: string, username: string, password: string) =>
    fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password }),
    }).then((r) => handle<{ token: string; user: AuthUser }>(r)),

  login: (email: string, password: string) =>
    fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then((r) => handle<{ token: string; user: AuthUser }>(r)),

  me: (token: string) =>
    fetch(`${API_URL}/auth/me`, { headers: authHeaders(token) }).then((r) =>
      handle<{ user: AuthUser }>(r)
    ),

  createRequest: (token: string, gameId: string) =>
    fetch(`${API_URL}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify({ gameId }),
    }).then((r) => handle<{ id: string }>(r)),

  getMyRequestForGame: (token: string, gameId: string) =>
    fetch(`${API_URL}/requests/mine/${gameId}`, { headers: authHeaders(token) }).then((r) =>
      handle<{ id: string; status: 'pending' | 'fulfilled' } | null>(r)
    ),

  getRequest: (token: string, id: string) =>
    fetch(`${API_URL}/requests/${id}`, { headers: authHeaders(token) }).then((r) =>
      handle<AccessRequest>(r)
    ),

  adminCheck: (key: string) =>
    fetch(`${API_URL}/admin/check`, { headers: { 'x-admin-key': key } }).then((r) =>
      handle<{ ok: boolean }>(r)
    ),

  adminListRequests: (key: string, status?: 'pending' | 'fulfilled') =>
    fetch(`${API_URL}/admin/requests${status ? `?status=${status}` : ''}`, {
      headers: { 'x-admin-key': key },
    }).then((r) => handle<AdminRequestRow[]>(r)),

  adminFulfill: (key: string, id: string, username: string, password: string) =>
    fetch(`${API_URL}/admin/requests/${id}/fulfill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
      body: JSON.stringify({ username, password }),
    }).then((r) => handle<unknown>(r)),
};
