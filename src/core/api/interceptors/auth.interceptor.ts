/**
 * Auth Interceptor
 *
 * Attaches Bearer token from OS Keychain to every outgoing request.
 * If no token is available, the request proceeds without auth header
 * (public endpoints like login/register don't need it).
 */
import type { InternalAxiosRequestConfig } from 'axios';
import { TokenManager } from '../../security/TokenManager';

export async function authRequestInterceptor(
  config: InternalAxiosRequestConfig,
): Promise<InternalAxiosRequestConfig> {
  const token = await TokenManager.getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}
