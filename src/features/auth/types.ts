/**
 * Auth Feature — TypeScript Types
 *
 * Types matching the backend API contracts exactly.
 * Source of truth: fintrack-backend/src/modules/auth/schemas/auth.schemas.ts
 *                  fintrack-backend/src/modules/users/routes/user.routes.ts
 *                  fintrack-backend/src/core/crypto/tokens.ts
 */

// ── Request Types ─────────────────────────────────────────────

export interface RegisterRequest {
  readonly email: string;
  readonly password: string;
}

export interface LoginRequest {
  readonly email: string;
  readonly password: string;
}

export interface GoogleAuthRequest {
  readonly idToken: string;
}

export interface RefreshRequest {
  readonly refreshToken: string;
}

// ── Response Types ────────────────────────────────────────────
// These match the backend's `successEnvelope()` data shapes

export interface RegisterResponse {
  readonly userId: string;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
}

export interface LoginResponse {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
}

export interface GoogleAuthResponse {
  readonly userId: string;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
}

export interface RefreshResponse {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
}

export interface LogoutResponse {
  readonly message: string;
}

// ── User Profile ──────────────────────────────────────────────
// Matches GET /v1/users/me response

export type UserTier = 'FREE' | 'PRO';

export interface UserProfile {
  readonly id: string;
  readonly email: string;
  readonly phone: string | null;
  readonly tier: UserTier;
  readonly accountCount: number;
  readonly createdAt: string;
}

// ── JWT Token Payload ─────────────────────────────────────────
// Decoded from the access token (for offline tier checks)

export interface AccessTokenClaims {
  readonly sub: string;
  readonly email: string;
  readonly role: 'user' | 'support' | 'admin';
  readonly tier: UserTier;
  readonly sid?: string;
  readonly subscriptionExpiresAt?: string;
  readonly exp: number;
  readonly iat: number;
  readonly iss: string;
}
