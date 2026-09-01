import type { Game, AccessRequest, AdminRequestRow, AuthUser, PaymentMethodConfig, WalletRequestRow, WalletHistoryRow } from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const REQUEST_TIMEOUT = 10000; // 10 second timeout

// Helper to add timeout to fetch requests
function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  return fetch(url, {
    ...options,
    credentials: 'include', // Send cookies with every request
    signal: controller.signal
  }).finally(() => {
    clearTimeout(timeoutId);
  });
}

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
  getGames: () => fetchWithTimeout(`${API_URL}/games`).then((r) => handle<Game[]>(r)),

  register: (email: string, username: string, password: string) =>
    fetchWithTimeout(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password }),
    }).then((r) => handle<{ user: AuthUser }>(r)),

  login: (email: string, password: string) =>
    fetchWithTimeout(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then((r) => handle<{ user: AuthUser }>(r)),

  logout: () =>
    fetchWithTimeout(`${API_URL}/auth/logout`, { method: 'POST' }).then((r) =>
      handle<{ success: boolean }>(r)
    ),

  me: () =>
    fetchWithTimeout(`${API_URL}/auth/me`).then((r) =>
      handle<{ user: AuthUser }>(r)
    ),

  forgotPassword: (email: string) =>
    fetchWithTimeout(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).then((r) => handle<{ success: boolean; message: string }>(r)),

  resetPassword: (token: string, password: string) =>
    fetchWithTimeout(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    }).then((r) => handle<{ success: boolean; message: string }>(r)),

  createRequest: (gameId: string) =>
    fetchWithTimeout(`${API_URL}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId }),
    }).then((r) => handle<{ id: string }>(r)),

  getMyRequests: () =>
    fetchWithTimeout(`${API_URL}/requests/mine`).then((r) =>
      handle<Array<{ id: string; game_id: string; game_slug: string; status: 'pending' | 'fulfilled' }>>(r)
    ),

  getMyRequestForGame: (gameId: string) =>
    fetchWithTimeout(`${API_URL}/requests/mine/${gameId}`).then((r) =>
      handle<{ id: string; status: 'pending' | 'fulfilled' } | null>(r)
    ),

  getRequest: (id: string) =>
    fetchWithTimeout(`${API_URL}/requests/${id}`).then((r) =>
      handle<AccessRequest>(r)
    ),

  getRequestByGameSlug: (gameSlug: string) =>
    fetchWithTimeout(`${API_URL}/requests/by-game/${gameSlug}`).then((r) =>
      handle<AccessRequest>(r)
    ),

  adminCheck: (key: string) =>
    fetchWithTimeout(`${API_URL}/admin/check`, { headers: { 'x-admin-key': key } }).then((r) =>
      handle<{ ok: boolean }>(r)
    ),

  adminListRequests: (key: string, status?: 'pending' | 'fulfilled') =>
    fetchWithTimeout(`${API_URL}/admin/requests${status ? `?status=${status}` : ''}`, {
      headers: { 'x-admin-key': key },
    }).then((r) => handle<AdminRequestRow[]>(r)),

  adminFulfill: (key: string, id: string, username: string, password: string) =>
    fetchWithTimeout(`${API_URL}/admin/requests/${id}/fulfill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
      body: JSON.stringify({ username, password }),
    }).then((r) => handle<unknown>(r)),

  adminListPaymentMethods: (key: string) =>
    fetchWithTimeout(`${API_URL}/admin/payment-methods`, {
      headers: { 'x-admin-key': key },
    }).then((r) => handle<PaymentMethodConfig[]>(r)),

  adminUpdatePaymentMethod: (key: string, code: string, payload: Partial<PaymentMethodConfig>) =>
    fetchWithTimeout(`${API_URL}/admin/payment-methods/${code}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
      body: JSON.stringify(payload),
    }).then((r) => handle<PaymentMethodConfig>(r)),

  adminListWalletRequests: (key: string, status?: 'pending' | 'approved' | 'cancelled') =>
    fetchWithTimeout(`${API_URL}/admin/wallet-requests${status ? `?status=${status}` : ''}`, {
      headers: { 'x-admin-key': key },
    }).then((r) => handle<WalletRequestRow[]>(r)),

  adminApproveWalletRequest: (key: string, id: string, note?: string) =>
    fetchWithTimeout(`${API_URL}/admin/wallet-requests/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
      body: JSON.stringify({ note }),
    }).then((r) => handle<unknown>(r)),

  adminCancelWalletRequest: (key: string, id: string, note?: string) =>
    fetchWithTimeout(`${API_URL}/admin/wallet-requests/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
      body: JSON.stringify({ note }),
    }).then((r) => handle<unknown>(r)),

  getPaymentMethods: () =>
    fetchWithTimeout(`${API_URL}/wallet/payment-methods`).then((r) => handle<PaymentMethodConfig[]>(r)),

  createWalletRequest: (payload: { gameId: string; type: 'deposit' | 'withdrawal'; amount: number; paymentMethod: string; details?: Record<string, unknown> }) =>
    fetchWithTimeout(`${API_URL}/wallet/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((r) => handle<{ id: string }>(r)),

  getMyWalletRequests: (gameId?: string) =>
    fetchWithTimeout(`${API_URL}/wallet/requests/mine${gameId ? `?gameId=${encodeURIComponent(gameId)}` : ''}`).then((r) =>
      handle<WalletHistoryRow[]>(r)
    ),
};
