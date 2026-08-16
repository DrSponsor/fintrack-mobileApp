/**
 * Transaction Model — WatermelonDB
 *
 * The most critical model in the entire app. Represents a financial
 * transaction stored locally in SQLite.
 *
 * IMPORTANT: WatermelonDB stores all numbers as SQLite 'real' (float).
 * amountKobo and balanceAfterKobo are stored as numbers but MUST be
 * cast to BigInt at every usage boundary for monetary arithmetic.
 * See the kobo casting helpers at the bottom.
 */
import { Model, type Relation } from '@nozbe/watermelondb';
import { field, date, readonly, relation, text, writer } from '@nozbe/watermelondb/decorators';
import type { AccountModel } from './Account.model';
import type { CategoryModel } from './Category.model';

export class TransactionModel extends Model {
  static table = 'transactions';

  static associations = {
    accounts: { type: 'belongs_to' as const, key: 'account_id' },
    categories: { type: 'belongs_to' as const, key: 'category_id' },
  };

  /** Server-assigned UUID. Null until synced. */
  @field('server_id') serverId!: string | null;

  @field('account_id') accountId!: string;

  /**
   * Amount in kobo. Stored as SQLite number (float).
   * ALWAYS cast to BigInt for arithmetic: BigInt(Math.round(this.amountKobo))
   */
  @field('amount_kobo') amountKobo!: number;

  /** 'DEBIT' | 'CREDIT' */
  @field('type') type!: 'DEBIT' | 'CREDIT';

  @field('merchant_name') merchantName!: string;

  @field('category_id') categoryId!: string;

  @date('transaction_date') transactionDate!: Date;

  /** 'EMAIL' | 'MANUAL' | 'SMS' | 'MONO' */
  @field('source') source!: string;

  @field('is_verified') isVerified!: boolean;

  @text('notes') notes!: string | null;

  @text('custom_merchant') customMerchant!: string | null;

  @field('balance_after_kobo') balanceAfterKobo!: number | null;

  @field('idempotency_key') idempotencyKey!: string;

  /** 'pending' | 'synced' | 'error' */
  @field('sync_status') localSyncStatus!: 'pending' | 'synced' | 'error';

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('accounts', 'account_id') account!: Relation<AccountModel>;
  @relation('categories', 'category_id') category!: Relation<CategoryModel>;

  // ── Kobo helpers ───────────────────────────────────────
  // These are the ONLY acceptable way to get BigInt values from this model.

  /** Amount as BigInt — safe for monetary arithmetic */
  get amountKoboBigInt(): bigint {
    return BigInt(Math.round(this.amountKobo));
  }

  /** Balance after as BigInt — safe for monetary arithmetic */
  get balanceAfterKoboBigInt(): bigint | null {
    if (this.balanceAfterKobo == null) return null;
    return BigInt(Math.round(this.balanceAfterKobo));
  }

  get isDebit(): boolean {
    return this.type === 'DEBIT';
  }

  get isCredit(): boolean {
    return this.type === 'CREDIT';
  }

  // ── Writers ────────────────────────────────────────────
  // All writes use database.write() for transactional consistency

  @writer async updateCategory(categoryId: string): Promise<void> {
    await this.update((record) => {
      record.categoryId = categoryId;
      record.isVerified = true;
      record.localSyncStatus = 'pending';
    });
  }

  @writer async updateNotes(notes: string): Promise<void> {
    await this.update((record) => {
      record.notes = notes;
      record.localSyncStatus = 'pending';
    });
  }

  @writer async updateCustomMerchant(name: string): Promise<void> {
    await this.update((record) => {
      record.customMerchant = name;
      record.localSyncStatus = 'pending';
    });
  }

  @writer async markSynced(serverId: string): Promise<void> {
    await this.update((record) => {
      record.serverId = serverId;
      record.localSyncStatus = 'synced';
    });
  }

  @writer async markSyncError(): Promise<void> {
    await this.update((record) => {
      record.localSyncStatus = 'error';
    });
  }
}
