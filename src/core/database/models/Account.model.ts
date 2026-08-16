/**
 * Account Model — WatermelonDB
 */
import { Model, type Query } from '@nozbe/watermelondb';
import { field, date, readonly, children } from '@nozbe/watermelondb/decorators';
import type { TransactionModel } from './Transaction.model';

export class AccountModel extends Model {
  static table = 'accounts';

  static associations = {
    transactions: { type: 'has_many' as const, foreignKey: 'account_id' },
  };

  @field('server_id') serverId!: string | null;
  @field('user_id') userId!: string;
  @field('bank_name') bankName!: string;
  @field('account_last4') accountLast4!: string;
  @field('account_type') accountType!: 'CURRENT' | 'SAVINGS' | 'WALLET';
  @field('capture_method') captureMethod!: 'EMAIL' | 'MANUAL' | 'SMS' | 'MONO';
  @field('gmail_connected') gmailConnected!: boolean;
  @field('balance_kobo') balanceKobo!: number;
  @date('last_transaction_date') lastTransactionDate!: Date | null;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('transactions') transactions!: Query<TransactionModel>;

  /** Balance as BigInt — safe for monetary arithmetic */
  get balanceKoboBigInt(): bigint {
    return BigInt(Math.round(this.balanceKobo));
  }

  /** Display-friendly bank + last4 */
  get displayName(): string {
    return `${this.bankName} ••${this.accountLast4}`;
  }
}
