/**
 * WatermelonDB Migrations
 *
 * CRITICAL RULES — READ BEFORE TOUCHING:
 *
 * Rule 1: Migrations are additive only in each deploy.
 *         Add new columns as nullable with defaults. Never remove or
 *         rename a column in the same deploy that adds its replacement.
 *
 * Rule 2: Never edit a migration that has shipped.
 *         A shipped migration is immutable. If it was wrong, write a
 *         new migration that corrects it.
 *
 * Rule 3: Version numbers are sequential and never reused.
 *         Never skip a version. Never renumber versions.
 *
 * Rule 4: Schema version in schema.ts MUST match highest migration version.
 *
 * Rule 5: Every migration has an integration test that seeds data at
 *         version N-1 and asserts integrity at version N.
 */
import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    // v1 is the initial schema — no migration steps needed.
    // WatermelonDB creates all tables from schema.ts on first launch.
    //
    // Future migrations go here:
    //
    // {
    //   toVersion: 2,
    //   steps: [
    //     addColumns({
    //       table: 'transactions',
    //       columns: [
    //         { name: 'new_field', type: 'string', isOptional: true },
    //       ],
    //     }),
    //   ],
    // },
  ],
});
