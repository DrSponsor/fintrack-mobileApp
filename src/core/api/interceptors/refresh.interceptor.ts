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
import type { ApiResponse } from '../client';

interface RefreshResponse {
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly expiresIn: number;
}

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
 * Did the server actually refuse the refresh token, or did we simply never
 * hear back?
 *
 * Only the first is grounds for ending the session. A 401 or 403 is the server
 * stating the token is no longer good — rotated away, revoked, or expired past
 * thirty days. Everything else (no response at all, a timeout, a 5xx) says
 * nothing about the token's validity, so the session survives and the next
 * request tries again.
 *
 * 429 is deliberately treated as transient too: being rate limited means the
 * request was refused a hearing, not that the credential is bad.
 */
function isAuthRejection(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('isAxiosError' in error)) {
    return false;
  }
  const status = (error as AxiosError).response?.status;
  return status === 401 || status === 403;
}

/**
 * Force logout when refresh fails.
 * Clears tokens and resets auth state — user must re-authenticate.
 *
 * Exported so other call sites that need to react to a truly-invalid
 * session (e.g. the root auth gate) stay consistent with this interceptor
 * instead of re-implementing "clear Keychain + reset store" separately.
 */
export async function forceLogout(): Promise<void> {
  await TokenManager.clearAll();
  useAuthStore.getState().logout();
}

export function setupRefreshInterceptor(axiosInstance: AxiosInstance): void {
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as
        | (AxiosRequestConfig & { _retry?: boolean })
        | undefined;

      // A rejection with no config cannot be retried — there is nothing to
      // replay. Reading through it unguarded threw a TypeError that REPLACED
      // the original error, so a genuine 401 arrived at the handler below
      // looking like a programming fault rather than a refusal, and the
      // session was kept alive on a credential the server had already
      // rejected. Failing to log someone out is as wrong as logging them out
      // for no reason; it just fails quietly.
      if (originalRequest === undefined) {
        return Promise.reject(error);
      }

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
        const response = await axiosInstance.post<ApiResponse<RefreshResponse>>(
          endpoints.auth.refresh,
          { refreshToken },
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        // Store the new tokens
        await TokenManager.setAccessToken(accessToken);

        // If the backend returns a new refresh token, store it too
        if (newRefreshToken) {
          await TokenManager.setRefreshToken(newRefreshToken);
        }

        processQueue(null, accessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Only a refusal ends the session. A refresh that never got an answer
        // did not fail — it did not happen.
        //
        // This used to log the user out on ANY thrown error, which put the
        // session at the mercy of the network: one request timing out on a
        // weak signal, or a 502 during a backend deploy, and the refresh token
        // was erased from the Keychain even though it was still perfectly
        // valid for another thirty days. The user got a login screen and no
        // explanation, and the credential that would have restored them was
        // already gone.
        //
        // The root layout's auth gate has always drawn this distinction (see
        // "a transient error must never evict a valid session"). The
        // interceptor did not, so the gate's care was undone by the layer
        // underneath it.
        if (isAuthRejection(refreshError)) {
          await forceLogout();
        }
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    },
  );
}
