/**
 * Budget Model — WatermelonDB
 */
import { Model, type Relation } from '@nozbe/watermelondb';
import { field, date, readonly, relation, writer } from '@nozbe/watermelondb/decorators';
import type { CategoryModel } from './Category.model';

export class BudgetModel extends Model {
  static table = 'budgets';

  static associations = {
    categories: { type: 'belongs_to' as const, key: 'category_id' },
  };

  @field('server_id') serverId!: string | null;
  @field('user_id') userId!: string;
  @field('category_id') categoryId!: string;
  @field('limit_kobo') limitKobo!: number;
  @field('spent_kobo') spentKobo!: number;
  @field('period_type') periodType!: 'WEEKLY' | 'MONTHLY';
  @date('period_start') periodStart!: Date;
  @date('period_end') periodEnd!: Date;
  @field('sync_status') localSyncStatus!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('categories', 'category_id') category!: Relation<CategoryModel>;

  /** Limit as BigInt */
  get limitKoboBigInt(): bigint {
    return BigInt(Math.round(this.limitKobo));
  }

  /** Spent as BigInt */
  get spentKoboBigInt(): bigint {
    return BigInt(Math.round(this.spentKobo));
  }

  /** Remaining as BigInt */
  get remainingKoboBigInt(): bigint {
    const remaining = this.limitKoboBigInt - this.spentKoboBigInt;
    return remaining < 0n ? 0n : remaining;
  }

  /** Percentage used (0-100+) */
  get percentUsed(): number {
    if (this.limitKobo === 0) return 0;
    return Math.round((this.spentKobo / this.limitKobo) * 100);
  }

  /** Budget status for display */
  get status(): 'on_track' | 'warning' | 'breached' {
    const pct = this.percentUsed;
    if (pct >= 100) return 'breached';
    if (pct >= 70) return 'warning';
    return 'on_track';
  }

  @writer async updateSpent(spentKobo: number): Promise<void> {
    await this.update((record) => {
      record.spentKobo = spentKobo;
    });
  }
}
