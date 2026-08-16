/**
 * Auth Repository Interface
 *
 * Abstracts the auth feature's network calls behind an interface so
 * use-cases depend on a contract instead of importing Axios directly.
 * This is what makes "unit tests: all use cases with mocked repositories"
 * (the Phase 2 testing gate) possible — tests inject a fake implementation
 * instead of hitting the network.
 *
 * See RemoteAuthRepository.ts for the real (Axios-backed) implementation.
 * This is the template `ITransactionRepository` (Phase 3) extends with
 * local (WatermelonDB) + remote implementations composed by SyncEngine.
 */
import type { LoginResponse, RegisterResponse, UserProfile } from '@/features/auth/types';

export interface IAuthRepository {
  register(email: string, password: string): Promise<RegisterResponse>;
  login(email: string, password: string): Promise<LoginResponse>;
  getProfile(): Promise<UserProfile>;
}
