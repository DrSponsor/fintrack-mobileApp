/**
 * Remote Auth Repository — Axios-backed implementation of IAuthRepository.
 */
import { api } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';
import type { LoginResponse, RegisterResponse, UserProfile } from '@/features/auth/types';
import type { IAuthRepository } from './IAuthRepository';

class RemoteAuthRepositoryImpl implements IAuthRepository {
  async register(email: string, password: string): Promise<RegisterResponse> {
    return api.post<RegisterResponse>(endpoints.auth.register, { email, password });
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    return api.post<LoginResponse>(endpoints.auth.login, { email, password });
  }

  async getProfile(): Promise<UserProfile> {
    return api.get<UserProfile>(endpoints.users.me);
  }
}

export const RemoteAuthRepository: IAuthRepository = new RemoteAuthRepositoryImpl();
