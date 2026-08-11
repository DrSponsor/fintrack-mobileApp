/**
 * Auth Validation Schemas — Mobile
 *
 * Zod schemas that EXACTLY mirror the backend's validation rules.
 * Source of truth: fintrack-backend/src/modules/auth/schemas/auth.schemas.ts
 *
 * If the backend schema changes, this file MUST be updated to match.
 * Mismatched validation = user sees "valid" on mobile but gets rejected by server.
 */
import { z } from 'zod';

// ── Password Rules (match backend exactly) ────────────────────

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Must contain at least one digit')
  .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character');

const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .max(255)
  .transform((v) => v.toLowerCase().trim());

// ── Registration Schema ───────────────────────────────────────

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type RegisterFormData = z.infer<typeof registerSchema>;

// ── Login Schema ──────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// ── Password Strength Helpers (for UI feedback) ───────────────

export interface PasswordStrength {
  readonly hasMinLength: boolean;
  readonly hasUppercase: boolean;
  readonly hasLowercase: boolean;
  readonly hasDigit: boolean;
  readonly hasSpecial: boolean;
  readonly isValid: boolean;
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  return {
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasDigit,
    hasSpecial,
    isValid: hasMinLength && hasUppercase && hasLowercase && hasDigit && hasSpecial,
  };
}
