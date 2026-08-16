/**
 * Report Model — WatermelonDB
 *
 * Cached server reports. The `data_json` field stores the full report
 * payload as serialised JSON. Schema version is checked before serving
 * to trigger recompute if stale.
 */
import { Model } from '@nozbe/watermelondb';
import { field, date, json } from '@nozbe/watermelondb/decorators';

// Sanitizer for JSON field — passes through as-is
const sanitizeJson = (raw: unknown): unknown => raw;

export class ReportModel extends Model {
  static table = 'reports';

  @field('server_id') serverId!: string | null;
  @field('user_id') userId!: string;
  @field('period_type') periodType!: 'WEEKLY' | 'MONTHLY';
  @date('period_start') periodStart!: Date;
  @date('period_end') periodEnd!: Date;
  @field('schema_version') schemaVersion!: number;
  @json('data_json', sanitizeJson) dataJson!: unknown;
  @field('is_stale') isStale!: boolean;
  @date('generated_at') generatedAt!: Date;
}
