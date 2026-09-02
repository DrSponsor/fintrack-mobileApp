/**
 * Connecting an inbox, and finding the accounts inside it.
 *
 * ── The round trip ───────────────────────────────────────────────────────
 * Google will not hand an authorization code to an app directly, so it goes
 * out to a browser and comes back through a deep link:
 *
 *   1. ask the server for a consent URL and a one-time `state`
 *   2. open the URL in the system browser
 *   3. Google redirects to the server's callback with the code
 *   4. the callback renders a page that deep-links to fintrack://oauth/google
 *   5. this hook reads the link, checks `state`, and posts the code back
 *
 * Step 4 is a page with a button rather than a redirect because Chrome on
 * Android blocks scheme redirects the user did not initiate.
 *
 * ── Why `state` is checked here and not only on the server ───────────────
 * `state` is what makes the code that arrives ours. Without the check, any
 * app or page able to open a fintrack:// link could hand this app an
 * authorization code for an inbox the user never chose — and the app would
 * dutifully connect it. The value is minted per attempt by the server, held
 * only in memory here, and a mismatch is refused rather than reported as a
 * generic failure, because the two mean very different things.
 *
 * ── The system browser, not an in-app one ────────────────────────────────
 * `expo-web-browser` would give a tidier sheet, but it carries native code and
 * adding it means rebuilding the dev client. `expo-linking` is already here
 * and the server already renders the return page, so the flow costs no new
 * native dependency. Worth revisiting when a rebuild is happening anyway.
 */
import { useCallback, useState } from 'react';
import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, api, readApiError, type ApiResponse } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';
import { useUserScope } from '@/features/transactions/hooks/useUserScope';
import { clearPendingState, rememberPendingState } from './oauthState';

export interface DiscoveredAccount {
  readonly bankName: string;
  readonly accountMask: string;
  readonly holderName: string | null;
}

export type AccountType = 'CURRENT' | 'SAVINGS' | 'WALLET';

export interface ConfirmedAccount extends DiscoveredAccount {
  readonly accountType: AccountType;
}

/** Long enough for forty sequential Gmail fetches and a model call, with room
 *  for a slow network. A scan that is still running is not a scan that failed. */
const SCAN_TIMEOUT_MS = 90_000;

export const connectKeys = {
  discovered: (user: string) => ['connect', 'discovered', user] as const,
};

function describe(err: unknown): string {
  const api = readApiError(err);
  if (api === null) return 'Could not reach the server. Check your connection and try again.';
  return api.message;
}

export type ConnectPhase =
  | 'idle'
  /** Waiting on the browser round trip. */
  | 'authorising'
  /** Exchanging the code, then scanning the mailbox. */
  | 'scanning'
  | 'done';

export interface UseGmailConnectResult {
  readonly phase: ConnectPhase;
  readonly error: string | null;
  /** True when the scan itself failed, as opposed to finding nothing. The
   *  screen must not offer ‘no accounts found’ as the explanation for it. */
  readonly scanFailed: boolean;
  readonly connect: () => Promise<void>;
  /** Candidates found in the inbox. Empty until a scan completes. */
  readonly discovered: readonly DiscoveredAccount[];
  readonly discovering: boolean;
  readonly confirm: (accounts: readonly ConfirmedAccount[]) => Promise<void>;
  readonly confirming: boolean;
  readonly rescan: () => void;
}

export function useGmailConnect(): UseGmailConnectResult {
  const user = useUserScope();
  const queryClient = useQueryClient();

  // Only the part that cannot be derived is held: whether this app has sent
  // the user out to the browser. Everything else about the phase follows from
  // the connection and the scan, and storing it as well would mean two
  // sources for one fact that could disagree.
  const [step, setStep] = useState<'idle' | 'authorising' | 'exchanging'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Surfaced once, from the route, rather than held: a cancelled sign-in is
  // the user changing their mind, not a fault to keep on screen.

  // How this screen learns the browser came back: the /oauth/google route
  // performs the exchange and returns here with ?connected=1. That route is
  // the owner because it is the one thing the incoming link is guaranteed to
  // mount — including when Android killed this app while the browser was in
  // front and the link is starting it cold.
  const returned = useLocalSearchParams<{ connected?: string; cancelled?: string }>();
  const connected = returned.connected === '1';

  const connect = useCallback(async () => {
    setError(null);
    setStep('authorising');
    try {
      const { consentUrl, state } = await api.get<{ consentUrl: string; state: string }>(
        endpoints.capture.email.oauthUrl,
      );
      rememberPendingState(state);
      await Linking.openURL(consentUrl);
    } catch (err) {
      setStep('idle');
      clearPendingState();
      setError(describe(err));
    }
  }, []);

  // The scan runs only once the exchange has succeeded. It is a live read of
  // the mailbox rather than cached data — nothing about it is stored server
  // side, so there is no cache to be stale against.
  const discovery = useQuery({
    queryKey: connectKeys.discovered(user),
    queryFn: async () => {
      // Its own timeout. The client default is 15s, which is right for an
      // ordinary call and far too short for this one: the scan fetches forty
      // messages from Gmail in sequence — deliberately, because a burst gets
      // rate-limited — and then calls a model. It takes about twenty seconds.
      //
      // The default made every attempt abort at fifteen while the server ran to
      // completion and found the accounts. The app then reported ‘no bank
      // accounts found’, which is why this took a long time to see: the server
      // logs said success and the screen said empty.
      const response = await apiClient.get<ApiResponse<readonly DiscoveredAccount[]>>(
        endpoints.capture.email.discoveredAccounts,
        { timeout: SCAN_TIMEOUT_MS },
      );
      return response.data.data;
    },
    enabled: connected,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  // Derived, not stored. Setting this from an effect meant a render purely to
  // record something already knowable during the first one.
  const phase: ConnectPhase = connected
    ? discovery.isFetching
      ? 'scanning'
      : 'done'
    : step === 'exchanging'
      ? 'scanning'
      : step === 'authorising'
        ? 'authorising'
        : 'idle';

  const confirmation = useMutation({
    mutationFn: async (accounts: readonly ConfirmedAccount[]) => {
      await api.post(endpoints.capture.email.confirmAccounts, {
        accounts: accounts.map((account) => ({
          bankName: account.bankName,
          accountMask: account.accountMask,
          holderName: account.holderName,
          accountType: account.accountType,
        })),
      });
    },
    onSuccess: () => {
      // Everything downstream reads accounts: the dashboard's balance, the
      // ledger's empty state, and manual entry's account picker.
      void queryClient.invalidateQueries({ queryKey: ['ledger'] });
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  const confirm = useCallback(
    async (accounts: readonly ConfirmedAccount[]) => {
      setError(null);
      try {
        await confirmation.mutateAsync(accounts);
      } catch (err) {
        setError(describe(err));
        throw err;
      }
    },
    [confirmation],
  );

  // A scan that FAILED is not a scan that found nothing, and the screen has
  // to be able to tell them apart. Conflating the two is what turned a
  // fifteen-second timeout into ‘no bank accounts found in that inbox’ — a
  // confident, wrong answer about somebody’s own mailbox.
  const scanError = discovery.isError ? describe(discovery.error) : null;

  return {
    phase,
    error: error ?? scanError,
    scanFailed: discovery.isError,
    connect,
    discovered: discovery.data ?? [],
    discovering: discovery.isFetching,
    confirm,
    confirming: confirmation.isPending,
    rescan: () => void discovery.refetch(),
  };
}
