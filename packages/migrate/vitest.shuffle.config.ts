import { defineConfig } from 'vitest/config'

/** Cheap deterministic-order probe for the synthetic fixture contract. The full PAL shared route
 * remains a release-only gate; this probe is intentionally safe to run three times in CI while
 * that low-frequency route is being split into smaller order probes. */
export default defineConfig({
  define: {
    'process.env.TYPE_PAL_MIGRATE_TEST_GATE': JSON.stringify('fast'),
  },
  test: {
    passWithNoTests: false,
    // Keep this probe deliberately small, but use several independent files so
    // `--sequence.shuffle.files` exercises cross-file ordering and module
    // isolation instead of becoming a one-file no-op.
    include: [
      'src/experimental/script-v5/synthetic-test-fixture.test.ts',
      'src/experimental/script-v5/pal-test-fixture-gate.test.ts',
      'src/experimental/script-v5/pal-test-oracle.test.ts',
      'src/test-manifest.test.ts',
    ],
    pool: 'forks',
    isolate: true,
    fileParallelism: false,
  },
})
