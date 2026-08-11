/**
 * Category Model — WatermelonDB
 */
import { Model } from '@nozbe/watermelondb';
import { field, children } from '@nozbe/watermelondb/decorators';

export class CategoryModel extends Model {
  static table = 'categories';

  static associations = {
    transactions: { type: 'has_many' as const, foreignKey: 'category_id' },
  };

  @field('server_id') serverId!: string | null;
  @field('name') name!: string;
  @field('icon') icon!: string;
  @field('is_custom') isCustom!: boolean;
  @field('usage_count') usageCount!: number;

  @children('transactions') transactions!: any;
}
