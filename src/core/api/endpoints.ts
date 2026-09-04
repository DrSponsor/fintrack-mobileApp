/**
 * API Endpoints — Single Source of Truth
 *
 * Every API URL used in the app is defined here.
 * Never hardcode endpoint strings in services or use cases.
 */

const V1 = '/v1';

export const endpoints = {
  // ── Auth ─────────────────────────────────────────────────
  auth: {
    register: `${V1}/auth/register`,
    login: `${V1}/auth/login`,
    google: `${V1}/auth/google`,
    refresh: `${V1}/auth/refresh`,
    logout: `${V1}/auth/logout`,
  },

  // ── Transactions ─────────────────────────────────────────
  transactions: {
    list: `${V1}/transactions`,
    detail: (id: string) => `${V1}/transactions/${id}`,
    updateCategory: (id: string) => `${V1}/transactions/${id}/category`,
    // Only rows the user typed themselves, and only until a bank alert
    // confirms one. The bank’s timestamp outranks anybody’s recollection.
    updateDate: (id: string) => `${V1}/transactions/${id}/date`,
    // Only removes rows the user entered themselves. Bank-sourced transactions
    // are immutable records, and the backend rejects deleting one.
    delete: (id: string) => `${V1}/transactions/${id}`,
  },

  // ── Capture ──────────────────────────────────────────────
  // NOTE: new transactions from a connected Gmail account arrive purely
  // via a server-side Pub/Sub webhook → BullMQ worker → DB write. There
  // is no client-facing poll/status endpoint — the mobile client only
  // ever discovers new email-captured transactions through the regular
  // `transactions.list` pull (SyncEngine / pull-to-refresh / background
  // sync). Do not build a "checking for new emails" polling UI state.
  capture: {
    manual: `${V1}/capture/manual`,
    email: {
      // Where the consent flow begins. Returns { url, state }; the client keeps
      // `state` and must refuse any redirect that returns a different one.
      oauthUrl: `${V1}/capture/email/oauth/url`,
      // The inbox belongs to the PERSON, so the body is just { code }. It used
      // to require an accountId, which meant an account had to be typed in
      // before its own inbox could be connected — the backwards ordering that
      // discovery below exists to remove.
      oauthCallback: `${V1}/capture/email/oauth/callback`,
      // No body. A caller can only ever disconnect their own inbox.
      oauthDisconnect: `${V1}/capture/email/oauth/disconnect`,
      // Whether an inbox is connected, and which one. Cheap on purpose: the
      // only other signal was the discovery scan, which fetches forty messages
      // and calls a model to answer a yes/no question.
      connection: `${V1}/capture/email/connection`,
      // Reads the connected inbox and reports the accounts found in it.
      // Stores NOTHING — a shared or forwarded inbox can surface another
      // person's name and account number, so only what the user confirms
      // below is ever written.
      discoveredAccounts: `${V1}/capture/email/discovered-accounts`,
      confirmAccounts: `${V1}/capture/email/discovered-accounts/confirm`,
    },
  },

  // ── Accounts ─────────────────────────────────────────────
  accounts: {
    list: `${V1}/accounts`,
    detail: (id: string) => `${V1}/accounts/${id}`,
    // Removing an account CASCADES to its transactions. The confirmation on
    // the client has to say so — it is not recoverable and it is not obvious.
    delete: (id: string) => `${V1}/accounts/${id}`,
  },

  // ── Categories ───────────────────────────────────────────
  categories: {
    list: `${V1}/categories`,
  },

  // ── Budgets ──────────────────────────────────────────────
  budgets: {
    list: `${V1}/budgets`,
    create: `${V1}/budgets`,
    detail: (id: string) => `${V1}/budgets/${id}`,
    update: (id: string) => `${V1}/budgets/${id}`,
    delete: (id: string) => `${V1}/budgets/${id}`,
  },

  // ── Analysis ─────────────────────────────────────────────
  analysis: {
    weekly: `${V1}/analysis/weekly`,
    monthly: `${V1}/analysis/monthly`,
  },

  // ── Billing ──────────────────────────────────────────────
  billing: {
    checkout: `${V1}/billing/checkout`,
    // Response shape is { status: 'ACTIVE'|'GRACE_PERIOD'|'CANCELLED'|
    // 'EXPIRED'|'NONE', currentPeriodEnd }, not a `subscription` field.
    status: `${V1}/billing/status`,
    cancel: `${V1}/billing/cancel`,
  },

  // ── Notifications ────────────────────────────────────────
  notifications: {
    // Same path for register (POST, body { token, platform }) and
    // unregister (DELETE, body { token }).
    tokens: `${V1}/notifications/tokens`,
  },

  // ── Privacy / NDPR ───────────────────────────────────────
  privacy: {
    emailAccessLog: `${V1}/privacy/email-access-log`,
    dataExport: `${V1}/users/me/data-export`,
    deleteAccount: `${V1}/users/me/data`,
  },

  // ── Security ─────────────────────────────────────────────
  security: {
    events: `${V1}/security/events`,
    remoteConfig: `${V1}/security/remote-config`,
  },

  // ── Users ────────────────────────────────────────────────
  users: {
    me: `${V1}/users/me`,
  },
} as const;
