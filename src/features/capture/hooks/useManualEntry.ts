/**
 * Submitting a manual entry, including the duplicate conversation.
 *
 * ── The idempotency key is the whole reason this holds state ─────────────
 * The key is minted once per submission and held in a ref, so a retry after a
 * timeout re-sends the SAME key and the server recognises it rather than
 * recording the money twice. It is cleared on success, and cleared explicitly
 * before a forced re-send — the server caches its answer against the key, so
 * reusing it after a duplicate warning would replay the warning and the user's
 * "record it anyway" would silently do nothing. See idempotency.ts.
 */
import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { readApiError } from '@/core/api/client';
import { RemoteCaptureRepository } from '@/core/repositories/capture/RemoteCaptureRepository';
import type { ICaptureRepository } from '@/core/repositories/capture/ICaptureRepository';
import { ledgerKeys } from '@/features/transactions/hooks/useLedger';
import { useUserScope } from '@/features/transactions/hooks/useUserScope';
import { createIdempotencyKey } from '../idempotency';
import type { CapturedTransaction, ManualEntryPayload, ManualCaptureResult } from '../types';

export interface DuplicateQuestion {
  /** How sure the server is. Drives how firmly the screen puts it. */
  readonly certainty: 'already-recorded' | 'duplicate-suspected';
  readonly existing: CapturedTransaction;
  readonly reason: string | undefined;
}

export interface ManualEntryState {
  readonly isSubmitting: boolean;
  readonly error: string | null;
  readonly errorCode: string | undefined;
  /** Non-null while the user is being asked about a possible duplicate. */
  readonly duplicate: DuplicateQuestion | null;
}

export interface UseManualEntry extends ManualEntryState {
  /** Returns the created transaction, or null when a duplicate was raised. */
  readonly submit: (payload: ManualEntryPayload) => Promise<CapturedTransaction | null>;
  /** Re-sends the last payload with `force`, after the user chose to go ahead. */
  readonly recordAnyway: () => Promise<CapturedTransaction | null>;
  readonly dismissDuplicate: () => void;
  readonly clearError: () => void;
}

export function useManualEntry(
  repository: ICaptureRepository = RemoteCaptureRepository,
): UseManualEntry {
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);
  const [duplicate, setDuplicate] = useState<DuplicateQuestion | null>(null);

  const queryClient = useQueryClient();
  const user = useUserScope();

  /** Held so a retry after a timeout re-sends the same key. */
  const keyRef = useRef<string | null>(null);
  /** The payload the duplicate question is about, for the forced re-send. */
  const lastPayloadRef = useRef<ManualEntryPayload | null>(null);

  const send = useCallback(
    async (payload: ManualEntryPayload): Promise<CapturedTransaction | null> => {
      setSubmitting(true);
      setError(null);
      setErrorCode(undefined);

      try {
        keyRef.current ??= createIdempotencyKey();
        lastPayloadRef.current = payload;

        const result: ManualCaptureResult = await repository.createManualEntry(payload, keyRef.current);

        if (result.outcome === 'recorded') {
          // Only cleared on a recorded outcome. A duplicate answer leaves the
          // key in place deliberately: the user has not decided yet, and a
          // retry of the same question must not become a second entry.
          keyRef.current = null;
          setDuplicate(null);

          // Tell every screen that reads the ledger that it just changed.
          //
          // Without this, recording a payment by hand left the dashboard
          // showing the month and balance it had cached before the entry
          // existed, and the only way to see the new figure was to know to
          // pull down on it. Someone recording their first transaction has no
          // reason to know that — they see the app fail to notice what they
          // just told it, which reads as the entry not having saved.
          //
          // `ledgerKeys.all(user)` is the PREFIX ['ledger', user], and every
          // affected query hangs off it: the ledger list, the dashboard's
          // month window, and the accounts query the balance is summed from.
          // React Query matches invalidation by prefix, so one call reaches
          // all three. Accounts matters most and is easiest to miss — it is
          // cached for an hour, and it carries the adjustment that makes a
          // manual entry move the balance at all. Invalidation overrides
          // staleTime, so the hour does not hold the old figure on screen.
          //
          // Deliberately not a focus-refetch on the dashboard instead. That
          // would refetch on every tab switch and undo the 30-second staleTime
          // that makes tab switching instant (see queryClient.ts). The write
          // is what knows the data changed, so the write is what says so —
          // which is also how correctCategory and correctDate already work.
          void queryClient.invalidateQueries({ queryKey: ledgerKeys.all(user) });

          return result.transaction;
        }

        setDuplicate({
          certainty: result.outcome,
          existing: result.transaction,
          reason: result.reason,
        });
        return null;
      } catch (err) {
        const apiError = readApiError(err);
        if (apiError !== null) {
          setError(apiError.message);
          setErrorCode(apiError.code);
        } else {
          // The request never reached the server, so the outcome is unknown
          // rather than failed. Saying so matters: it tells the user to retry
          // rather than to re-enter.
          setError('Could not reach the server. Nothing has been saved — try again.');
        }
        // The key survives, so pressing save again is a retry of this
        // submission rather than a new one.
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [repository, queryClient, user],
  );

  const submit = useCallback(
    (payload: ManualEntryPayload): Promise<CapturedTransaction | null> => send(payload),
    [send],
  );

  const recordAnyway = useCallback(async (): Promise<CapturedTransaction | null> => {
    const payload = lastPayloadRef.current;
    if (payload === null) return null;

    // A NEW key, or the server replays the duplicate answer it cached against
    // the old one and this button does nothing.
    keyRef.current = createIdempotencyKey();
    setDuplicate(null);
    return send({ ...payload, force: true });
  }, [send]);

  const dismissDuplicate = useCallback((): void => {
    setDuplicate(null);
    // The user backed out, so the next save is a fresh submission.
    keyRef.current = null;
  }, []);

  const clearError = useCallback((): void => {
    setError(null);
    setErrorCode(undefined);
  }, []);

  return { isSubmitting, error, errorCode, duplicate, submit, recordAnyway, dismissDuplicate, clearError };
}
