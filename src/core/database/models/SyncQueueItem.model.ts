/**
 * SyncQueueItem Model — WatermelonDB
 *
 * Persistent queue for offline writes awaiting server sync.
 * Every mutation that needs to reach the server is enqueued here
 * with an idempotency key. The SyncEngine processes the queue
 * when connectivity is available.
 */
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, writer } from '@nozbe/watermelondb/decorators';

export class SyncQueueItemModel extends Model {
  static table = 'sync_queue';

  /** HTTP method: 'POST' | 'PATCH' | 'DELETE' */
  @field('method') method!: 'POST' | 'PATCH' | 'DELETE';

  /** API endpoint URL */
  @field('url') url!: string;

  /** Request body as serialised JSON */
  @field('body_json') bodyJson!: string;

  /** Unique key to prevent duplicate processing */
  @field('idempotency_key') idempotencyKey!: string;

  /** 'pending' | 'processing' | 'failed' */
  @field('status') status!: 'pending' | 'processing' | 'failed';

  /** Number of attempts made */
  @field('attempts') attempts!: number;

  /** Maximum retry attempts before giving up */
  @field('max_attempts') maxAttempts!: number;

  /** Last error message if failed */
  @field('last_error') lastError!: string | null;

  @readonly @date('created_at') createdAt!: Date;

  @date('next_retry_at') nextRetryAt!: Date | null;

  /** Parse the serialised body */
  get body(): unknown {
    try {
      return JSON.parse(this.bodyJson);
    } catch {
      return null;
    }
  }

  /** Whether this item can be retried */
  get canRetry(): boolean {
    return this.attempts < this.maxAttempts && this.status !== 'processing';
  }

  @writer async markProcessing(): Promise<void> {
    await this.update((record) => {
      record.status = 'processing';
    });
  }

  @writer async markFailed(error: string): Promise<void> {
    const nextDelay = Math.pow(2, this.attempts) * 1000; // Exponential backoff
    await this.update((record) => {
      record.status = 'failed';
      record.attempts = this.attempts + 1;
      record.lastError = error;
      record.nextRetryAt = new Date(Date.now() + nextDelay);
    });
  }

  @writer async markCompleted(): Promise<void> {
    await this.markAsDeleted();
  }
}
