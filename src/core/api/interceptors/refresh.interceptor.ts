/**
 * Refresh Interceptor
 *
 * Handles 401 responses by automatically refreshing the access token.
 * Queues concurrent requests that arrive during a refresh cycle so
 * they're retried with the new token instead of all triggering
 * separate refresh calls.
 *
 * MOBILE TOKEN FLOW:
 * The backend was originally designed for web (refresh token in httpOnly cookie).
 * For mobile, we store the refresh token in the OS Keychain and send it
 * in the request body. The backend accepts both cookie and body-based
 * refresh tokens (Option A from the implementation plan).
 */
import type { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { TokenManager } from '../../security/TokenManager';
import { endpoints } from '../endpoints';
import { useAuthStore } from '../../store/auth.store';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null): void {
  for (const { resolve, reject } of failedQueue) {
    if (error) {
      reject(error);
    } else if (token) {
      resolve(token);
    }
  }
  failedQueue = [];
}

/**
 * Force logout when refresh fails.
 * Clears tokens and resets auth state — user must re-authenticate.
 */
async function forceLogout(): Promise<void> {
  await TokenManager.clearAll();
  useAuthStore.getState().logout();
}

export function setupRefreshInterceptor(axiosInstance: AxiosInstance): void {
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as AxiosRequestConfig & {
        _retry?: boolean;
      };

      // Only handle 401 errors, and don't retry the refresh/login endpoints
      if (
        error.response?.status !== 401 ||
        originalRequest._retry ||
        originalRequest.url === endpoints.auth.refresh ||
        originalRequest.url === endpoints.auth.login ||
        originalRequest.url === endpoints.auth.register
      ) {
        return Promise.reject(error);
      }

      // If already refreshing, queue this request to retry after refresh completes
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return axiosInstance(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await TokenManager.getRefreshToken();

        if (!refreshToken) {
          // No refresh token — user must log in again
          await forceLogout();
          processQueue(new Error('No refresh token'), null);
          return Promise.reject(error);
        }

        // Send refresh token in body (mobile pattern)
        // The backend accepts this alongside the cookie-based flow
        const response = await axiosInstance.post(endpoints.auth.refresh, {
          refreshToken,
        });

        const { accessToken } = response.data.data;

        // Store the new tokens
        await TokenManager.setAccessToken(accessToken);

        // If the backend returns a new refresh token, store it too
        if (response.data.data.refreshToken) {
          await TokenManager.setRefreshToken(response.data.data.refreshToken);
        }

        processQueue(null, accessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed — clear tokens, force re-authentication
        await forceLogout();
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    },
  );
}
