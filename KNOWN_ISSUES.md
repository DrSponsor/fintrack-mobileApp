# Known Issues & Deliberate Workarounds

Tracked deviations from the architecture spec (`FinTrack Architecture/mobileapp-engineering-prompt`, `FinTrack Architecture/FinTrack_Mobile_Architecture.md`) that are intentional, time-boxed decisions rather than oversights.

## New Architecture disabled (jsi: false, newArchEnabled: false)

**Status:** Active workaround as of 2026-08-14.

**What:** React Native's New Architecture (Fabric/JSI/TurboModules) is disabled project-wide — `app.config.ts` (`newArchEnabled: false`), `android/gradle.properties` (`newArchEnabled=false`), and `src/core/database/database.ts` (`SQLiteAdapter({ jsi: false })`) all agree on this.

**Why:** The architecture doc's Law 1 calls New Architecture non-negotiable. In practice, WatermelonDB's JSI SQLite adapter crashed on Android under the New Architecture. `jsi: false` (legacy bridge) is the proven-stable configuration for this WatermelonDB version (`@nozbe/watermelondb ~0.27.0`) on this React Native version (`0.76.9`).

**Re-evaluation trigger** — re-attempt New Architecture when **any** of the following occurs, whichever comes first:
1. A WatermelonDB release changelog explicitly documents a fix for New Architecture / Fabric stability on Android.
2. Phase 3's exit criterion "FlashList scrolls 10,000 test transactions at 60fps on Android emulator" fails to hold under `jsi: false` — if the legacy bridge introduces a real performance regression, that promotes the re-attempt ahead of schedule.
3. Phase 7 (production hardening) begins — this is the hard backstop. New Architecture must be deliberately revisited once, on purpose, before store submission, not left off by accident.

**Validation bar when re-attempting:** run the full Jest/integration suite plus Phase 3's WatermelonDB write-heavy paths (10k-row batch insert, migrations, concurrent read+write) on 2-3 real Android devices from different manufacturers (JSI/Fabric crashes are often GPU/vendor-specific, not reliably reproducible on an emulator alone).

**Do not** flip `jsi`/`newArchEnabled` back to `true` in only one of the three files above — all three must move together, or the app will silently run in a mismatched, untested configuration.

## jail-monkey pinned to 2.8.5 (not ^3.0.0)

**Status:** Active workaround as of 2026-08-15.

**What:** `package.json` pins `jail-monkey` to the exact version `2.8.5` instead of the natural `^3.0.0` range.

**Why:** `jail-monkey@3.0.0` added TurboModule/New Architecture support by splitting its Android source into `oldarch`/`newarch` variants sharing a static `JailMonkeyModuleImpl`. The `oldarch` variant (the one this project's build picks, since New Architecture is off — see above) references a constructor and a local variable that no longer exist in that shared impl class, so it fails to compile: `error: constructor JailMonkeyModuleImpl in class JailMonkeyModuleImpl cannot be applied to given types` and `error: cannot find symbol ... rootedCheck`. This looks like an upstream packaging bug (the `newarch` variant was updated correctly when the impl was refactored to a static-context pattern; `oldarch` was not). Confirmed by inspecting `node_modules/jail-monkey/android/src/newarch/.../JailMonkeyModule.java` directly — it correctly delegates to the static `JailMonkeyModuleImpl` API, so the bug is isolated to the legacy-bridge file only.

**What we lose by staying on 2.8.5:** TurboModule support (irrelevant while New Architecture is off) and 3.0.0's enhanced mock-location permission handling. `RootDetection.ts` only calls `JailMonkey.isJailBroken()`, which doesn't touch mock-location detection, so this pin has no effect on the app's actual fraud-signal behavior today. The core detection logic (`RootedCheck`, `HookDetection`, `AdbEnabled`, `ExternalStorage` checks) is structurally the same in both versions.

**Re-evaluation trigger:** re-upgrade to `jail-monkey@^3.0.0` (or whatever is current) at the same time New Architecture is re-enabled (see trigger conditions above) — by then the build will pick the `newarch` source instead of the broken `oldarch` one, so this bug won't apply. Worth checking upstream (github.com/GantMan/jail-monkey) for a patch release fixing the `oldarch` file before then, which would let this pin be removed earlier.

## react-native-mmkv pinned to 2.12.2 (not ~3.2.0)

**Status:** Active workaround as of 2026-08-15.

**What:** `package.json` pins `react-native-mmkv` to the exact version `2.12.2` instead of `~3.2.0`.

**Why:** `react-native-mmkv@3.x` added a small auxiliary native module (`MmkvPlatformContextModule`, used to resolve the storage base directory) that unconditionally extends a Codegen-generated TurboModule spec class (`NativeMmkvPlatformContextSpec`) — there is no legacy-bridge fallback for it, unlike jail-monkey. React Native's Gradle plugin skips Codegen artifact generation (`:app:generateCodegenArtifactsFromSchema`) whenever New Architecture is off, so the generated spec class never exists and the build fails: `error: cannot find symbol ... class NativeMmkvPlatformContextSpec`. Unlike the jail-monkey issue, this isn't a packaging bug — v3's core module is simply New-Architecture-only by design; there is no working combination of `react-native-mmkv@3.x` + `newArchEnabled: false`.

**What we lose by staying on 2.12.2:** multi-process mode and the `useMMKV*` React hooks family, both added in v3. Neither is used anywhere in this codebase — `src/core/storage/mmkv.ts` only calls `new MMKV({ id })`, `.set`, `.getString`, `.delete`, which is the same stable API (backed by the same JSI-direct C++ storage engine) in both major versions. No functional loss today.

**Re-evaluation trigger:** re-upgrade to the latest `react-native-mmkv` (v4.x as of 2026-08-15) at the same time New Architecture is re-enabled (see trigger conditions above) — Codegen will then run and the v3+ module will build correctly. Do not attempt this upgrade before New Architecture is back on; it will reproduce this exact failure.

## Android applicationId fixed to `ng.fintrack.app` (doesn't yet honor per-environment suffixes)

**Status:** Active gap as of 2026-08-15.

**What:** `android/app/build.gradle`'s `namespace`/`applicationId` is hardcoded to `ng.fintrack.app`. `app.config.ts`'s `getBundleId()` already expresses per-environment suffixes (`ng.fintrack.app.dev`, `ng.fintrack.app.staging`, `ng.fintrack.app` for prod) but the committed native Android project doesn't implement that — it always builds as the prod identifier regardless of `APP_ENV`.

**Why this exists:** the committed `android/` tree (bare workflow, hand-maintained) had drifted — `build.gradle` said `namespace "com.fintrack"` / `applicationId "com.fintrack"`, which matched neither `app.config.ts`'s `ng.fintrack.app` nor the actual committed Kotlin source package (`ng.fintrack.app`, i.e. `android/app/src/main/java/ng/fintrack/app/{MainActivity,MainApplication}.kt`). This meant `R`/`BuildConfig` were generated under the wrong package and the app had apparently never successfully compiled natively before — `compileDebugKotlin` failed with `Unresolved reference: R` / `Unresolved reference: BuildConfig`. Fixed the immediate mismatch by aligning `build.gradle` to the already-committed Kotlin package (`ng.fintrack.app`), the lower-risk direction versus moving source files.

**What's still missing:** a dev build and a prod build now can't be installed side-by-side on the same device (same applicationId collides). Implementing the `.dev`/`.staging` suffixes properly means either moving the Kotlin source tree per-environment (invasive) or, more standard, using Gradle product flavors / `applicationIdSuffix` per build variant driven by `APP_ENV` — worth doing before Phase 6+ needs concurrent dev+prod installs for testing, not urgent before then.
