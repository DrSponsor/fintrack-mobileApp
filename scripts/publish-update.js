#!/usr/bin/env node
/**
 * Publish an OTA update with the SAME environment its build profile uses.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 * `eas update` does not read the `env` block from eas.json. That block applies
 * to `eas build` only. A bare `eas update --channel demo` therefore re-bundles
 * the JS with whatever happens to be in the shell — and with nothing set,
 * getApiUrl() in app.config.ts falls all the way through to
 * `https://api.fintrack.ng`, a placeholder domain that has never existed.
 *
 * `extra.apiUrl` travels inside the update manifest, so the result is an app
 * that silently repoints at a dead server. Nothing warns you: the publish
 * succeeds and the CLI output looks perfectly correct.
 *
 * This shipped to the client's demo build on 2026-09-05 and was live for about
 * seven minutes before it was caught.
 *
 * ── Why it reads eas.json rather than hardcoding ─────────────────────────
 * Hardcoding the URL here would just move the drift: the build profile and the
 * update would be two places to change, and the day they disagree is the day
 * the OTA quietly points somewhere the APK does not. Reading the profile makes
 * that impossible by construction — there is one source of truth, and it is the
 * same one the build used.
 *
 * Usage:  node scripts/publish-update.js <profile> [--message "..."]
 */
const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const ROOT = join(__dirname, '..');

/**
 * Resolve a build profile's env, following `extends` the way EAS does.
 *
 * A profile inherits its parent's env and overrides individual keys, so the
 * parent must be merged UNDER the child. `demo` extends `staging` for exactly
 * this reason: it takes staging's APP_ENV and adds its own API URL.
 */
function resolveEnv(profiles, name, seen = new Set()) {
  if (seen.has(name)) {
    throw new Error(`Circular "extends" in eas.json at profile "${name}"`);
  }
  seen.add(name);

  const profile = profiles[name];
  if (profile === undefined) {
    const available = Object.keys(profiles).join(', ');
    throw new Error(`No build profile "${name}" in eas.json. Available: ${available}`);
  }

  const inherited =
    profile.extends === undefined ? {} : resolveEnv(profiles, profile.extends, seen);

  return { ...inherited, ...(profile.env ?? {}) };
}

function main() {
  const [profileName, ...rest] = process.argv.slice(2);
  if (!profileName) {
    process.stderr.write('Usage: node scripts/publish-update.js <profile> [--message "..."]\n');
    process.exit(1);
  }

  const easJson = JSON.parse(readFileSync(join(ROOT, 'eas.json'), 'utf8'));
  const profile = easJson.build?.[profileName];
  const env = resolveEnv(easJson.build ?? {}, profileName);

  // The channel a build listens on is what an update must be published to. If
  // the profile does not name one, publishing would go to a channel no build
  // is subscribed to and silently reach nobody.
  const channel = profile.channel;
  if (channel === undefined) {
    throw new Error(
      `Build profile "${profileName}" declares no "channel", so an update ` +
        `published for it would reach no installed build.`,
    );
  }

  // The whole point of the script — if this is missing, the bundle silently
  // points at the placeholder domain rather than failing.
  if (!env.EXPO_PUBLIC_API_URL) {
    throw new Error(
      `Build profile "${profileName}" sets no EXPO_PUBLIC_API_URL. Publishing ` +
        `would bundle the placeholder API url from app.config.ts.`,
    );
  }

  process.stdout.write(`Publishing to channel "${channel}" with:\n`);
  for (const [key, value] of Object.entries(env)) {
    process.stdout.write(`  ${key}=${value}\n`);
  }
  process.stdout.write('\n');

  const result = spawnSync(
    'npx',
    ['eas', 'update', '--channel', channel, ...rest],
    { cwd: ROOT, env: { ...process.env, ...env }, stdio: 'inherit', shell: true },
  );

  process.exit(result.status ?? 1);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
