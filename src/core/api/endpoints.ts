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
  },

  // ── Capture ──────────────────────────────────────────────
  capture: {
    manual: `${V1}/capture/manual`,
    email: {
      connect: `${V1}/capture/email/connect`,
      disconnect: `${V1}/capture/email/disconnect`,
      poll: `${V1}/capture/email/poll`,
      status: `${V1}/capture/email/status`,
    },
  },

  // ── Accounts ─────────────────────────────────────────────
  accounts: {
    list: `${V1}/accounts`,
    detail: (id: string) => `${V1}/accounts/${id}`,
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
    subscription: `${V1}/billing/subscription`,
    cancel: `${V1}/billing/cancel`,
  },

  // ── Notifications ────────────────────────────────────────
  notifications: {
    registerDevice: `${V1}/notifications/register-device`,
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
