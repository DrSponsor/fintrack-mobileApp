/**
 * Capture Repository Interface
 *
 * Abstracts manual entry's network calls behind a contract so the use case can
 * be tested against a fake instead of the network. Same shape as
 * IAuthRepository.
 */
import type {
  AccountSummary,
  CategorySummary,
  ManualCaptureResult,
  ManualEntryPayload,
} from '@/features/capture/types';

export interface ICaptureRepository {
  /**
   * @param idempotencyKey Required by the backend on financial mutations. Must
   * stay STABLE across retries of one submission — that is what stops a timeout
   * posting the money twice — and must be FRESH for a genuinely new submission,
   * including a re-send with `force`. The server caches its answer against this
   * key, so replaying it replays the answer instead of recording anything.
   */
  createManualEntry(payload: ManualEntryPayload, idempotencyKey: string): Promise<ManualCaptureResult>;
  listAccounts(): Promise<readonly AccountSummary[]>;
  listCategories(): Promise<readonly CategorySummary[]>;
  deleteTransaction(id: string): Promise<void>;
}
