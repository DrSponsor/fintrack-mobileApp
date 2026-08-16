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
  // jsi: false — New Architecture is disabled project-wide (see app.config.ts,
  // android/gradle.properties, and KNOWN_ISSUES.md). We hit a real WatermelonDB
  // JSI crash on Android under the New Architecture; jsi: false + the legacy
  // bridge is the proven-stable configuration. Do not flip this back to true
  // without also re-enabling newArchEnabled in app.config.ts and
  // android/gradle.properties, and re-testing on physical Android devices.
  jsi: false,
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
