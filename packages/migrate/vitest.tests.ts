export const ALL_MIGRATE_TESTS = ['src/**/*.test.ts'] as const

export const PAL_SHARED_TESTS = [
  // These files contain small unit cases plus a second PAL-sized shadow section. Keeping the
  // file in the shared release worker prevents the shadow section from consuming the developer
  // worker budget; the release still runs both sections.
  'src/experimental/script-v5/p7-canonical.test.ts',
  'src/experimental/script-v5/p7-compatibility.test.ts',
  'src/experimental/script-v5/p7-owner-machine.test.ts',
  'src/experimental/script-v5/p7-project.test.ts',
  'src/experimental/script-v5/p7-state-machine-audit.test.ts',
  'src/experimental/script-v5/p7-state-machine.test.ts',
  'src/experimental/script-v5/p7-transition-ledger.test.ts',
  'src/experimental/script-v5/c8-item-use-augmentation.test.ts',
  'src/experimental/script-v5/legacy-enemy-script-v9-authority.pal.test.ts',
  'src/experimental/script-v5/p2-shadow.pal.test.ts',
  'src/experimental/script-v5/p3-shadow.pal.test.ts',
  'src/experimental/script-v5/p4-shadow.pal.test.ts',
  'src/experimental/script-v5/p5-shadow.pal.test.ts',
  'src/experimental/script-v5/p6-shadow.pal.test.ts',
  'src/experimental/script-v5/r13-cadence-mg2.pal.test.ts',
  'src/experimental/script-v5/r13-cross-activation-mg2.pal.test.ts',
  'src/experimental/script-v5/r13-confirm-control-flow.pal.test.ts',
  'src/experimental/script-v5/r13-confirm-mg2.pal.test.ts',
  'src/experimental/script-v5/r13-enemy-audits.pal.test.ts',
  'src/experimental/script-v5/r13-item-throw-augmentation.pal.test.ts',
  'src/experimental/script-v5/r13-item-throw-mg2.pal.test.ts',
  'src/experimental/script-v5/r13-source-semantics-mg2.pal.test.ts',
  'src/experimental/script-v5/pal-shared-order-probe.pal.test.ts',
  'src/experimental/script-v5/source-instruction-disposition.pal.test.ts',
] as const

/** Mixed files keep their small semantic unit cases in the developer gate while their PAL
 * sections run only in the release shared worker. The file itself remains one source of truth. */
export const PAL_MIXED_TESTS = [
  'src/experimental/script-v5/p7-canonical.test.ts',
  'src/experimental/script-v5/p7-compatibility.test.ts',
  'src/experimental/script-v5/p7-owner-machine.test.ts',
  'src/experimental/script-v5/p7-state-machine-audit.test.ts',
  'src/experimental/script-v5/p7-state-machine.test.ts',
] as const

export const PAL_SHARED_ONLY_TESTS = PAL_SHARED_TESTS.filter(
  (file) => !PAL_MIXED_TESTS.includes(file as (typeof PAL_MIXED_TESTS)[number]),
)

export const PAL_FRESH_TESTS = [
  'src/pal-migration-integration.test.ts',
  'src/pal-current-content-replay.pal.test.ts',
  'src/pal-sprite-action-census.pal.test.ts',
  'src/script-control-flow-audit.pal.test.ts',
] as const

export const PAL_HEAVY_TESTS = [...PAL_SHARED_TESTS, ...PAL_FRESH_TESTS] as const

/** Full PAL files excluded from the fast gate; mixed files are included for their unit cases. */
export const PAL_FAST_EXCLUDED_TESTS = [...PAL_SHARED_ONLY_TESTS, ...PAL_FRESH_TESTS] as const

/**
 * Real-source tests that do not construct the full P2→P7 authority chain. These stay in the
 * developer gate, but are kept in a separate project so a PAL import cannot silently leak into
 * ordinary unit workers.
 */
export const PAL_LITE_TESTS = [
  // These consume real extracted data but do not construct the P2→P7 authority chain. Keeping
  // them explicit prevents a future real-source unit test from silently consuming unit workers.
  'src/pal-c1-dialogue-identity.pal.test.ts',
  'src/pal-c1-npc-candidate-report.pal.test.ts',
  'src/pal-c1-npc-curation-transition.pal.test.ts',
  'src/migrate-content.test.ts',
  'src/migrate-enemies.test.ts',
  'src/script-library-audit.test.ts',
  'src/experimental/script-v5/cadence-compatibility.pal.test.ts',
  'src/translate-enemy-scripts.pal.test.ts',
  'src/experimental/script-v5/r13-enemy-source-disposition.pal.test.ts',
] as const

export const PAL_ORACLE_TESTS = ['src/experimental/script-v5/pal-test-oracle.test.ts'] as const

/** The one mandatory producer-backed cold canary. */
export const PAL_CANARY_TESTS = [
  'src/experimental/script-v5/r13-source-semantics-canary.pal.test.ts',
] as const

/** Release-only guard: missing source/baseline/project inputs must fail instead of skip green. */
export const PAL_RELEASE_PREFLIGHT_TESTS = ['src/pal-release-preflight.test.ts'] as const

/** Unit-only gate tests may import the guard itself, but must never call a producer getter. */
export const PAL_UNIT_SAFE_TESTS = [
  'src/experimental/script-v5/pal-test-fixture-gate.test.ts',
] as const
