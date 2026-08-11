/**
 * Login Use Case
 *
 * Flow:
 *   1. Validate input with Zod
 *   2. POST /v1/auth/login → receive tokens
 *   3. Store tokens in OS Keychain
 *   4. Fetch full user profile from GET /v1/users/me
 *   5. Update auth store
 *
 * Security: the backend returns the same error for "user not found"
 * and "wrong password" to prevent email enumeration. We mirror this
 * on the mobile side — always show "Invalid email or password."
 */
import { api } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';
import { TokenManager } from '@/core/security/TokenManager';
import { useAuthStore } from '@/core/store/auth.store';
import type { LoginResponse, UserProfile } from '../types';
import { loginSchema, type LoginFormData } from '../schemas/auth.schemas';

export interface LoginResult {
  readonly success: true;
}

export interface LoginError {
  readonly success: false;
  readonly code: string;
  readonly message: string;
  readonly field?: string;
}

export async function executeLogin(
  data: LoginFormData,
): Promise<LoginResult | LoginError> {
  // 1. Client-side validation
  const parsed = loginSchema.safeParse(data);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: issue?.message ?? 'Validation failed',
      field: issue?.path[0] !== undefined ? String(issue.path[0]) : undefined,
    };
  }

  try {
    // 2. Call backend
    const response = await api.post<LoginResponse>(endpoints.auth.login, {
      email: parsed.data.email,
      password: parsed.data.password,
    });

    // 3. Store tokens in OS Keychain
    await TokenManager.setAccessToken(response.accessToken);
    await TokenManager.setRefreshToken(response.refreshToken);

    // 4. Fetch full user profile
    const profile = await api.get<UserProfile>(endpoints.users.me);

    // 5. Update auth store
    useAuthStore.getState().setUser({
      id: profile.id,
      email: profile.email,
      tier: profile.tier,
      createdAt: profile.createdAt,
    });

    return { success: true };
  } catch (error: unknown) {
    return handleLoginError(error);
  }
}

function handleLoginError(error: unknown): LoginError {
  if (isAxiosError(error) && error.response?.data) {
    const data = error.response.data as { error?: { code?: string; message?: string } };
    const code = data.error?.code ?? 'UNKNOWN_ERROR';

    // Same message for all auth failures — prevent email enumeration
    if (code === 'INVALID_CREDENTIALS') {
      return { success: false, code, message: 'Invalid email or password.' };
    }

    return { success: false, code, message: data.error?.message ?? 'Login failed' };
  }

  if (isAxiosError(error) && !error.response) {
    return { success: false, code: 'NETWORK_ERROR', message: 'Please check your internet connection and try again.' };
  }

  return { success: false, code: 'UNKNOWN_ERROR', message: 'Something went wrong. Please try again.' };
}

function isAxiosError(error: unknown): error is { response?: { data?: unknown; status?: number }; code?: string } {
  return typeof error === 'object' && error !== null && 'isAxiosError' in error;
}
