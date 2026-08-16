/**
 * Register Use Case
 *
 * Flow:
 *   1. Validate input with Zod (matching backend rules)
 *   2. POST /v1/auth/register → receive tokens
 *   3. Store access + refresh tokens in OS Keychain
 *   4. Fetch full user profile from GET /v1/users/me
 *   5. Update auth store with real user data
 *
 * Error handling:
 *   - 409 DUPLICATE_EMAIL → "This email is already registered"
 *   - 422 VALIDATION_ERROR → show field-level errors
 *   - Network error → "Please check your connection"
 */
import { TokenManager } from '@/core/security/TokenManager';
import { useAuthStore } from '@/core/store/auth.store';
import type { IAuthRepository } from '@/core/repositories/auth/IAuthRepository';
import { RemoteAuthRepository } from '@/core/repositories/auth/RemoteAuthRepository';
import { registerSchema, type RegisterFormData } from '../schemas/auth.schemas';

export interface RegisterResult {
  readonly success: true;
  readonly userId: string;
}

export interface RegisterError {
  readonly success: false;
  readonly code: string;
  readonly message: string;
  readonly field?: string | undefined;
}

export async function executeRegister(
  data: RegisterFormData,
  authRepository: IAuthRepository = RemoteAuthRepository,
): Promise<RegisterResult | RegisterError> {
  // 1. Client-side validation (fail fast before network call)
  const parsed = registerSchema.safeParse(data);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0] !== undefined ? String(issue.path[0]) : undefined;
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      message: issue?.message ?? 'Validation failed',
      ...(field !== undefined ? { field } : {}),
    };
  }

  try {
    // 2. Call backend
    const response = await authRepository.register(parsed.data.email, parsed.data.password);

    // 3-4. Store tokens, then fetch the profile they authorize. If the
    // profile fetch fails, clear the tokens we just wrote — a failed
    // registration must never leave a partial session in the Keychain.
    try {
      await TokenManager.setAccessToken(response.accessToken);
      await TokenManager.setRefreshToken(response.refreshToken);

      const profile = await authRepository.getProfile();

      // 5. Update auth store with real data
      useAuthStore.getState().setUser({
        id: profile.id,
        email: profile.email,
        tier: profile.tier,
        createdAt: profile.createdAt,
      });

      return { success: true, userId: profile.id };
    } catch (postRegisterError) {
      await TokenManager.clearAll();
      throw postRegisterError;
    }
  } catch (error: unknown) {
    return handleAuthError(error);
  }
}

function handleAuthError(error: unknown): RegisterError {
  // Axios error with backend response
  if (isAxiosError(error) && error.response?.data) {
    const data = error.response.data as { error?: { code?: string; message?: string; field?: string } };
    const code = data.error?.code ?? 'UNKNOWN_ERROR';
    const message = data.error?.message ?? 'Registration failed';

    // Map backend error codes to user-friendly messages
    if (code === 'DUPLICATE_EMAIL') {
      return { success: false, code, message: 'This email is already registered. Try signing in instead.', field: 'email' };
    }

    const field = data.error?.field;
    return {
      success: false,
      code,
      message,
      ...(field !== undefined ? { field } : {}),
    };
  }

  // Network error (no response)
  if (isAxiosError(error) && !error.response) {
    return { success: false, code: 'NETWORK_ERROR', message: 'Please check your internet connection and try again.' };
  }

  // Unknown error
  return { success: false, code: 'UNKNOWN_ERROR', message: 'Something went wrong. Please try again.' };
}

function isAxiosError(error: unknown): error is { response?: { data?: unknown; status?: number }; code?: string } {
  return typeof error === 'object' && error !== null && 'isAxiosError' in error;
}
