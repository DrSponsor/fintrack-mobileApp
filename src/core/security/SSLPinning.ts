/**
 * SSL Certificate Pinning Configuration
 *
 * The app only trusts our specific TLS certificate. A man-in-the-middle
 * attack presenting a different certificate — even a valid CA-signed
 * one — is rejected.
 *
 * ═══════════════════════════════════════════════════════════════
 * CERTIFICATE ROTATION RUNBOOK — FOLLOW EXACTLY:
 *
 * Step 1: 90 days before cert expiry
 *   → Generate new certificate
 *   → Add NEW cert hash as the second entry in pinnedHashes[]
 *   → Keep the OLD cert hash as the first entry
 *   → Ship this update via EAS Update (JS-only, no store review)
 *   → Monitor: confirm 90%+ of active users have received the update
 *
 * Step 2: Renew the server certificate
 *   → Swap the cert on the server
 *   → Both hashes are pinned — old and new — no user broken yet
 *
 * Step 3: 30 days after cert swap
 *   → Remove the OLD cert hash from pinnedHashes[]
 *   → Ship via EAS Update
 *   → Only the new hash remains
 *
 * Emergency kill switch:
 *   → FEATURE_SSL_PINNING flag in backend remote config
 *   → If set to false, app falls back to standard validation
 *   → Used only if rotation fails and users are locked out
 *   → Re-enable strict pinning after recovery
 * ═══════════════════════════════════════════════════════════════
 *
 * MECHANISM: uses `react-native-ssl-public-key-pinning` — OkHttp
 * CertificatePinner on Android, TrustKit on iOS. Pinning is applied
 * transparently to every request made through the standard networking
 * APIs (fetch/XHR), which is what Axios uses under the hood — no
 * per-request wiring needed in client.ts beyond calling init() once.
 *
 * STATUS: mechanism wired, `enabled: false`. Do NOT flip to `true` with
 * the placeholder hashes below — that would pin every request to a
 * certificate that doesn't exist and lock every user out. Populate real
 * production cert hashes (see the FAQ in the package README for how to
 * extract them) and verify against a real dev/staging cert before this
 * is ever enabled. Production cert hashes + verification is a Phase 7
 * pre-submission task (see KNOWN_ISSUES.md / implementation plan).
 */

export interface SSLPinConfig {
  readonly domain: string;
  readonly pinnedHashes: readonly string[];
  readonly enabled: boolean;
}

/**
 * SSL pinning configuration.
 * Update pinnedHashes following the rotation runbook above.
 */
export const sslPinConfig: SSLPinConfig = {
  domain: 'api.fintrack.ng',
  pinnedHashes: [
    // Primary cert fingerprint — replace with actual hash
    'sha256/PLACEHOLDER_PRIMARY_CERT_HASH',
    // Backup cert for rotation — add new cert hash here before rotation
    'sha256/PLACEHOLDER_BACKUP_CERT_HASH',
  ],
  // Disabled during local development — enable for staging/production
  enabled: false,
};

/**
 * Check remote config to determine if SSL pinning should be active.
 * This is the emergency kill switch.
 */
export async function shouldEnableSSLPinning(
  fetchRemoteConfig: () => Promise<{ sslPinningEnabled: boolean }>,
): Promise<boolean> {
  try {
    const config = await fetchRemoteConfig();
    return config.sslPinningEnabled;
  } catch {
    // If remote config is unreachable, maintain current state
    return sslPinConfig.enabled;
  }
}

/**
 * Initialize SSL pinning if `sslPinConfig.enabled` is true. No-op
 * (resolves immediately) when disabled, which is the default today.
 *
 * Called once, at module load time, from client.ts — before the module
 * that creates the Axios instance finishes evaluating, so pinning is
 * active (when enabled) before any request can possibly be made. This
 * avoids relying on React effect ordering, which does not guarantee
 * this module's init runs before a child component's first API call.
 *
 * Failures are swallowed (never crash app startup over pinning setup)
 * but reported so a broken pinning config doesn't fail silently forever.
 */
export async function initSslPinningIfEnabled(): Promise<void> {
  if (!sslPinConfig.enabled) {
    return;
  }

  try {
    const { initializeSslPinning, isSslPinningAvailable } = await import(
      'react-native-ssl-public-key-pinning'
    );

    if (!isSslPinningAvailable()) {
      // e.g. running in Expo Go, which has no native module for this.
      console.error('[SSLPinning] Native module unavailable — pinning NOT active.');
      return;
    }

    await initializeSslPinning({
      [sslPinConfig.domain]: {
        includeSubdomains: false,
        // The native API expects bare base64 hashes; our config stores
        // the OpenSSL/curl "sha256/" pin-sha256 convention for clarity
        // and to match the rotation runbook above — strip the prefix.
        publicKeyHashes: sslPinConfig.pinnedHashes.map((hash) =>
          hash.replace(/^sha256\//, ''),
        ),
      },
    });
  } catch (error) {
    // Never let a pinning setup failure crash app startup.
    console.error('[SSLPinning] Initialization failed:', error);
  }
}
