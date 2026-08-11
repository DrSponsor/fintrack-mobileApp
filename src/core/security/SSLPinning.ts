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
