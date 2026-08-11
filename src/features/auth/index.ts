/**
 * Auth Feature — Barrel Export
 *
 * Re-exports everything needed from the auth feature.
 */
export { useAuth } from './hooks/useAuth';
export { executeLogin } from './use-cases/LoginUseCase';
export { executeRegister } from './use-cases/RegisterUseCase';
export { executeLogout } from './use-cases/LogoutUseCase';
export type {
  UserProfile,
  UserTier,
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  RegisterResponse,
  AccessTokenClaims,
} from './types';
export {
  loginSchema,
  registerSchema,
  checkPasswordStrength,
} from './schemas/auth.schemas';
export type {
  LoginFormData,
  RegisterFormData,
  PasswordStrength,
} from './schemas/auth.schemas';
