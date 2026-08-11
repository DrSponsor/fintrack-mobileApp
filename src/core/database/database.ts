/**
 * WatermelonDB Database Singleton
 *
 * Single database instance for the entire app. Opened asynchronously
 * to avoid blocking the JS thread during cold start.
 *
 * Uses SQLiteAdapter with JSI bindings for New Architecture compatibility.
 */
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { migrations } from './migrations';

// Import all models
import { TransactionModel } from './models/Transaction.model';
import { AccountModel } from './models/Account.model';
import { CategoryModel } from './models/Category.model';
import { BudgetModel } from './models/Budget.model';
import { ReportModel } from './models/Report.model';
import { SyncQueueItemModel } from './models/SyncQueueItem.model';

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  // Use JSI for New Architecture — direct memory access, no JSON bridge
  jsi: true,
  // In production, use the onSetUpError callback to detect and handle
  // database corruption on startup
  onSetUpError: (error) => {
    // In production, this would log to Sentry and attempt recovery
    console.error('WatermelonDB setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [
    TransactionModel,
    AccountModel,
    CategoryModel,
    BudgetModel,
    ReportModel,
    SyncQueueItemModel,
  ],
});
