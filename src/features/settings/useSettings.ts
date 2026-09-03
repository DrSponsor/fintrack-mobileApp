/**
 * Everything the settings screen needs, and nothing it does not.
 *
 * ── Four questions, four sources ─────────────────────────────────────────
 * A settings screen is where somebody goes to check the app is real and to
 * undo something. Both need the same thing: the truth, from wherever it
 * actually lives. So each fact here comes from its owner rather than from a
 * local copy — which is the mistake that had the connect screen offering to
 * re-authorise an inbox that was already connected.
 *
 *   the accounts    the server
 *   the inbox       the server
 *   who you are     the auth store, which already holds the session
 *   hide balance    MMKV, because it is a per-device preference
 */
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, readApiError } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';
import { useUserScope } from '@/features/transactions/hooks/useUserScope';

export interface SettingsAccount {
  readonly id: string;
  readonly bankName: string;
  readonly accountLast4: string | null;
  readonly accountMask: string | null;
  readonly accountType: string;
  /** Who the bank addresses. Null when no alert stated one. */
  readonly holderName: string | null;
  /** How the app came to believe this account is the user's. Neither value
   *  means verified — a forwarded alert defeats both — which is why it is a
   *  value to be stated rather than a boolean to be ticked. */
  readonly verificationSource: 'SELF_DECLARED' | 'EMAIL_DISCOVERY';
}

export interface InboxConnection {
  readonly connected: boolean;
  readonly emailAddress: string | null;
  readonly connectedAt: string | null;
}

export const settingsKeys = {
  accounts: (user: string) => ['settings', 'accounts', user] as const,
  inbox: (user: string) => ['settings', 'inbox', user] as const,
};

export interface UseSettingsResult {
  readonly accounts: readonly SettingsAccount[];
  readonly accountsLoading: boolean;
  readonly inbox: InboxConnection | null;
  readonly inboxLoading: boolean;
  readonly removeAccount: (id: string) => Promise<void>;
  readonly removing: boolean;
  readonly disconnect: () => Promise<void>;
  readonly disconnecting: boolean;
  readonly error: string | null;
  readonly refresh: () => void;
}

export function useSettings(): UseSettingsResult {
  const user = useUserScope();
  const queryClient = useQueryClient();

  const accounts = useQuery({
    queryKey: settingsKeys.accounts(user),
    queryFn: () => api.get<readonly SettingsAccount[]>(endpoints.accounts.list),
    staleTime: 30_000,
  });

  const inbox = useQuery({
    queryKey: settingsKeys.inbox(user),
    queryFn: () => api.get<InboxConnection>(endpoints.capture.email.connection),
    staleTime: 30_000,
  });

  const removal = useMutation({
    mutationFn: (id: string) => api.delete<null>(endpoints.accounts.delete(id)),
    onSuccess: () => {
      // The ledger reads accounts, and removing one takes its transactions
      // with it — so everything downstream is stale, not just this list.
      void queryClient.invalidateQueries({ queryKey: settingsKeys.accounts(user) });
      void queryClient.invalidateQueries({ queryKey: ['ledger'] });
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  const removeAccount = useCallback(
    async (id: string) => {
      await removal.mutateAsync(id);
    },
    [removal],
  );

  const disconnection = useMutation({
    mutationFn: () => api.post<null>(endpoints.capture.email.oauthDisconnect, {}),
    onSuccess: () => {
      // The accounts stay. Disconnecting an inbox stops new alerts arriving;
      // it does not unsay the transactions already recorded, and deleting
      // somebody's ledger because they revoked an email permission would be a
      // surprise of the worst kind.
      void queryClient.invalidateQueries({ queryKey: settingsKeys.inbox(user) });
      void queryClient.invalidateQueries({ queryKey: ['connect'] });
    },
  });

  const disconnect = useCallback(async () => {
    await disconnection.mutateAsync();
  }, [disconnection]);

  const refresh = useCallback(() => {
    void accounts.refetch();
    void inbox.refetch();
  }, [accounts, inbox]);

  const failure = accounts.error ?? inbox.error ?? disconnection.error ?? removal.error;

  return {
    accounts: accounts.data ?? [],
    accountsLoading: accounts.isLoading,
    inbox: inbox.data ?? null,
    inboxLoading: inbox.isLoading,
    removeAccount,
    removing: removal.isPending,
    disconnect,
    disconnecting: disconnection.isPending,
    error: failure ? (readApiError(failure)?.message ?? 'Could not reach the server.') : null,
    refresh,
  };
}
