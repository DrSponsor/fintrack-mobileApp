/**
 * useAuth Hook
 *
 * Single hook for all auth actions. Used by login/register screens.
 * Wraps the use cases with React state management.
 *
 * Usage:
 *   const { login, register, logout, isLoading, error } = useAuth();
 *   await login({ email, password });
 */
import { useState, useCallback } from 'react';
import { executeLogin, type LoginError } from '../use-cases/LoginUseCase';
import { executeRegister, type RegisterError } from '../use-cases/RegisterUseCase';
import { executeLogout } from '../use-cases/LogoutUseCase';
import type { LoginFormData, RegisterFormData } from '../schemas/auth.schemas';

interface AuthError {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
}

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const login = useCallback(async (data: LoginFormData): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await executeLogin(data);

      if (!result.success) {
        setError({
          code: result.code,
          message: result.message,
          field: (result as LoginError).field,
        });
        return false;
      }

      return true;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterFormData): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await executeRegister(data);

      if (!result.success) {
        setError({
          code: result.code,
          message: result.message,
          field: (result as RegisterError).field,
        });
        return false;
      }

      return true;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await executeLogout();
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    login,
    register,
    logout,
    isLoading,
    error,
    clearError,
  } as const;
}
