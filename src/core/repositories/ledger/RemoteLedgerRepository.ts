/**
 * Remote Ledger Repository — Axios-backed implementation of ILedgerRepository.
 *
 * Uses `apiClient` directly rather than the `api` helper for the list, because
 * `api.get` returns `response.data.data` and throws the envelope's `meta`
 * away. The cursor lives in `meta`, so the helper cannot express a paged read
 * without silently losing the thing that makes it paged.
 */
import { apiClient, type ApiResponse, api } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';
import type { CategorySummary } from '@/features/capture/types';
import type { LedgerEntry } from '@/features/transactions/ledger';
import type {
  ILedgerRepository,
  LedgerPage,
  LedgerWindow,
  CorrectionScope,
  CorrectionResult,
} from './ILedgerRepository';

/**
 * Rows per request.
 *
 * Sized to overfill a tall phone so the first page never lands short enough to
 * leave the list unscrollable — a list that cannot be scrolled never fires
 * onEndReached, so a page that exactly fills the screen would strand the user
 * with no way to reach the rest.
 */
export const PAGE_SIZE = 40;

class RemoteLedgerRepositoryImpl implements ILedgerRepository {
  async listTransactions(
    cursor?: string | undefined,
    limit: number = PAGE_SIZE,
    window?: LedgerWindow | undefined,
  ): Promise<LedgerPage> {
    const response = await apiClient.get<ApiResponse<readonly LedgerEntry[]>>(
      endpoints.transactions.list,
      {
        params: {
          limit,
          ...(cursor !== undefined ? { cursor } : {}),
          ...(window !== undefined ? window : {}),
        },
      },
    );

    const body = response.data;
    return {
      entries: body.data,
      cursor: body.meta?.cursor,
      // Trust the server's own answer, and treat its absence as "no more"
      // rather than assuming there is another page. Guessing true here would
      // put the list into a loop against an endpoint that has nothing left.
      hasMore: body.meta?.hasMore === true,
    };
  }

  async listCategories(): Promise<readonly CategorySummary[]> {
    return api.get<readonly CategorySummary[]>(endpoints.categories.list);
  }

  async getTransaction(id: string): Promise<LedgerEntry> {
    return api.get<LedgerEntry>(endpoints.transactions.detail(id));
  }

  async correctCategory(
    id: string,
    categoryId: string,
    scope: CorrectionScope,
  ): Promise<CorrectionResult> {
    // The server answers with the reach it applied and how many earlier rows
    // it rewrote. Both are reported to the user: silently editing history is
    // how someone stops trusting their own ledger.
    const body = await api.patch<{ readonly scope: CorrectionScope; readonly backfilled: number }>(
      endpoints.transactions.updateCategory(id),
      { categoryId, scope },
    );
    return { scope: body.scope, backfilled: body.backfilled };
  }

  async correctDate(id: string, at: Date): Promise<void> {
    await api.patch(endpoints.transactions.updateDate(id), { transactionDate: at.toISOString() });
  }
}

export const RemoteLedgerRepository: ILedgerRepository = new RemoteLedgerRepositoryImpl();
