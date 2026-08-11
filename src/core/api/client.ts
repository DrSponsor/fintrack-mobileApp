/**
 * API Client — Axios Instance
 *
 * Single Axios instance used throughout the app.
 * Interceptor pipeline:
 *   1. Auth interceptor → attaches Bearer token from Keychain
 *   2. Refresh interceptor → auto-refresh on 401, queues concurrent requests
 *   3. Retry interceptor → retry on 5xx with exponential backoff
 *
 * Response shape matches backend envelope:
 *   { success: true, data: {}, meta: {}, requestId: '' }
 *   { success: false, error: { code: '', message: '', field: '' }, requestId: '' }
 */
import axios from 'axios';
import Constants from 'expo-constants';
import { authRequestInterceptor } from './interceptors/auth.interceptor';
import { setupRefreshInterceptor } from './interceptors/refresh.interceptor';
import { setupRetryInterceptor } from './interceptors/retry.interceptor';

const apiUrl =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'http://10.0.2.2:3000';

export const apiClient = axios.create({
  baseURL: apiUrl,
  timeout: 15000, // 15s — generous for Nigerian mobile networks (200-800ms latency is normal)
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ── Request interceptors ─────────────────────────────────
apiClient.interceptors.request.use(authRequestInterceptor);

// ── Response interceptors (order matters) ────────────────
setupRefreshInterceptor(apiClient);
setupRetryInterceptor(apiClient);

// ── Response type helpers ────────────────────────────────

/** Backend success response envelope */
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    cursor?: string;
    hasMore?: boolean;
  };
  requestId: string;
}

/** Backend error response envelope */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    field?: string;
  };
  requestId: string;
}

/**
 * Type-safe API call wrapper.
 * Unwraps the backend envelope and returns just the data.
 *
 * @example
 * const user = await api.get<UserProfile>(endpoints.users.me);
 */
export const api = {
  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const response = await apiClient.get<ApiResponse<T>>(url, { params });
    return response.data.data;
  },

  async post<T>(url: string, body?: unknown): Promise<T> {
    const response = await apiClient.post<ApiResponse<T>>(url, body);
    return response.data.data;
  },

  async patch<T>(url: string, body?: unknown): Promise<T> {
    const response = await apiClient.patch<ApiResponse<T>>(url, body);
    return response.data.data;
  },

  async delete<T>(url: string): Promise<T> {
    const response = await apiClient.delete<ApiResponse<T>>(url);
    return response.data.data;
  },
};
