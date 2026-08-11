/**
 * WatermelonDB Schema v1
 *
 * Matches backend Prisma schema. This is the SQLite schema for local
 * offline-first data storage. All tables mirror their backend counterparts
 * with the fields needed for local display and sync.
 *
 * RULE: schema version MUST match the highest migration version.
 * WatermelonDB throws on startup if they don't match.
 */
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const SCHEMA_VERSION = 1;

export const schema = appSchema({
  version: SCHEMA_VERSION,
  tables: [
    // ── Transactions ─────────────────────────────────────
    tableSchema({
      name: 'transactions',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'account_id', type: 'string' },
        { name: 'amount_kobo', type: 'number' }, // BigInt stored as number in SQLite, cast on read
        { name: 'type', type: 'string' }, // 'DEBIT' | 'CREDIT'
        { name: 'merchant_name', type: 'string' },
        { name: 'category_id', type: 'string' },
        { name: 'transaction_date', type: 'number' }, // Unix timestamp ms
        { name: 'source', type: 'string' }, // 'EMAIL' | 'MANUAL' | 'SMS' | 'MONO'
        { name: 'is_verified', type: 'boolean' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'custom_merchant', type: 'string', isOptional: true },
        { name: 'balance_after_kobo', type: 'number', isOptional: true },
        { name: 'idempotency_key', type: 'string' },
        { name: 'sync_status', type: 'string' }, // 'pending' | 'synced' | 'error'
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ── Accounts ──────────────────────────────────────────
    tableSchema({
      name: 'accounts',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string' },
        { name: 'bank_name', type: 'string' },
        { name: 'account_last4', type: 'string' },
        { name: 'account_type', type: 'string' }, // 'CURRENT' | 'SAVINGS' | 'WALLET'
        { name: 'capture_method', type: 'string' }, // 'EMAIL' | 'MANUAL' | 'SMS' | 'MONO'
        { name: 'gmail_connected', type: 'boolean' },
        { name: 'balance_kobo', type: 'number' },
        { name: 'last_transaction_date', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ── Categories ─────────────────────────────────────────
    tableSchema({
      name: 'categories',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'name', type: 'string' },
        { name: 'icon', type: 'string' },
        { name: 'is_custom', type: 'boolean' },
        { name: 'usage_count', type: 'number' }, // For ML-sorted display (most used first)
      ],
    }),

    // ── Budgets ────────────────────────────────────────────
    tableSchema({
      name: 'budgets',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string' },
        { name: 'category_id', type: 'string' },
        { name: 'limit_kobo', type: 'number' },
        { name: 'spent_kobo', type: 'number' },
        { name: 'period_type', type: 'string' }, // 'WEEKLY' | 'MONTHLY'
        { name: 'period_start', type: 'number' },
        { name: 'period_end', type: 'number' },
        { name: 'sync_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ── Reports (cached) ──────────────────────────────────
    tableSchema({
      name: 'reports',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'user_id', type: 'string' },
        { name: 'period_type', type: 'string' }, // 'WEEKLY' | 'MONTHLY'
        { name: 'period_start', type: 'number' },
        { name: 'period_end', type: 'number' },
        { name: 'schema_version', type: 'number' },
        { name: 'data_json', type: 'string' }, // Serialised report JSON
        { name: 'is_stale', type: 'boolean' },
        { name: 'generated_at', type: 'number' },
      ],
    }),

    // ── Sync Queue ─────────────────────────────────────────
    // Persistent queue for offline writes awaiting server sync
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'method', type: 'string' }, // 'POST' | 'PATCH' | 'DELETE'
        { name: 'url', type: 'string' },
        { name: 'body_json', type: 'string' },
        { name: 'idempotency_key', type: 'string' },
        { name: 'status', type: 'string' }, // 'pending' | 'processing' | 'failed'
        { name: 'attempts', type: 'number' },
        { name: 'max_attempts', type: 'number' },
        { name: 'last_error', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'next_retry_at', type: 'number', isOptional: true },
      ],
    }),
  ],
});
