/**
 * Remote Capture Repository — Axios-backed implementation of ICaptureRepository.
 */
import { api } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';
import type {
  AccountSummary,
  CategorySummary,
  ManualCaptureResult,
  ManualEntryPayload,
} from '@/features/capture/types';
import type { ICaptureRepository } from './ICaptureRepository';

class RemoteCaptureRepositoryImpl implements ICaptureRepository {
  async createManualEntry(
    payload: ManualEntryPayload,
    idempotencyKey: string,
  ): Promise<ManualCaptureResult> {
    return api.post<ManualCaptureResult>(endpoints.capture.manual, payload, {
      'Idempotency-Key': idempotencyKey,
    });
  }

  async listAccounts(): Promise<readonly AccountSummary[]> {
    return api.get<readonly AccountSummary[]>(endpoints.accounts.list);
  }

  async listCategories(): Promise<readonly CategorySummary[]> {
    return api.get<readonly CategorySummary[]>(endpoints.categories.list);
  }

  async deleteTransaction(id: string): Promise<void> {
    await api.delete<{ message: string }>(endpoints.transactions.delete(id));
  }
}

export const RemoteCaptureRepository: ICaptureRepository = new RemoteCaptureRepositoryImpl();
