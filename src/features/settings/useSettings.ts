/**
 * Everything the Settings screen reads and changes.
 *
 * ── Why one hook rather than four ────────────────────────────────────────
 * Accounts, the connected inbox and the balance preference look independent
 * and are not: removing the last account changes what the inbox section
 * should offer, and disconnecting the inbox changes what the accounts section
 * can say about where its rows came from. Splitting them would mean four
 * screens' worth of invalidation rules living in the component.
 */
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, readApiError } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';
import type { AccountSummary } from '@/features/capture/types';
import { useUserScope } from '@/features/transactions/hooks/useUserScope';

export interface GmailConnection {
  readonly connected: boolean;
  /** The mailbox Google actually authorised, which need not be the address
   *  the user signed up with. Shown because it is the one thing that makes
   *  disconnecting a decision rather than a guess. */
  readonly emailAddress: string | null;
  readonly connectedAt: string | null;
}

export const settingsKeys = {
  accounts: (user: string) => ['ledger', user, 'accounts'] as const,
  connection: (user: string) => ['settings', user, 'connection'] as const,
};

function describe(err: unknown): string {
  const api = readApiError(err);
  if (api === null) return 'Could not reach the server. Check your connection and try again.';
  return api.message;
}

export interface UseSettingsResult {
  readonly accounts: readonly AccountSummary[];
  readonly connection: GmailConnection | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly removeAccount: (id: string) => Promise<void>;
  readonly removing: boolean;
  readonly disconnect: () => Promise<void>;
  readonly disconnecting: boolean;
  readonly refresh: () => void;
}

export function useSettings(): UseSettingsResult {
  const user = useUserScope();
  const queryClient = useQueryClient();

  // Shares its key with the dashboard's account query on purpose: removing an
  // account here has to change the balance there, and one key means that
  // happens by invalidation rather than by remembering to.
  const accounts = useQuery({
    queryKey: settingsKeys.accounts(user),
    queryFn: () => api.get<readonly AccountSummary[]>(endpoints.accounts.list),
  });

  const connection = useQuery({
    queryKey: settingsKeys.connection(user),
    queryFn: () => api.get<GmailConnection>(endpoints.capture.email.connection),
  });

  const removal = useMutation({
    mutationFn: (id: string) => api.delete(endpoints.accounts.delete(id)),
    onSuccess: () => {
      // Every screen that counts money reads accounts or transactions, and
      // removing an account cascades to its transactions — so both go.
      void queryClient.invalidateQueries({ queryKey: ['ledger'] });
    },
  });

  const disconnection = useMutation({
    mutationFn: () => api.post(endpoints.capture.email.oauthDisconnect, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
      // The discovery scan's result is about an inbox that is now gone.
      void queryClient.invalidateQueries({ queryKey: ['connect'] });
    },
  });

  const removeAccount = useCallback(
    async (id: string) => {
      await removal.mutateAsync(id);
    },
    [removal],
  );

  const disconnect = useCallback(async () => {
    await disconnection.mutateAsync();
  }, [disconnection]);

  const refetchAccounts = accounts.refetch;
  const refetchConnection = connection.refetch;
  const refresh = useCallback(() => {
    void refetchAccounts();
    void refetchConnection();
  }, [refetchAccounts, refetchConnection]);

  const failure = accounts.error ?? connection.error ?? removal.error ?? disconnection.error;

  return {
    accounts: accounts.data ?? [],
    connection: connection.data ?? null,
    loading: accounts.isLoading || connection.isLoading,
    error: failure ? describe(failure) : null,
    removeAccount,
    removing: removal.isPending,
    disconnect,
    disconnecting: disconnection.isPending,
    refresh,
  };
}
