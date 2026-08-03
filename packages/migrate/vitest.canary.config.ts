import { defineConfig } from 'vitest/config'
import { PAL_CANARY_TESTS } from './vitest.tests.js'

/**
 * The canary is deliberately a fresh producer run. It must not inherit the fast-gate define or
 * any prepared authority from another Vitest project.
 */
export default defineConfig({
  define: {
    'process.env.TYPE_PAL_MIGRATE_TEST_GATE': JSON.stringify('canary'),
  },
  test: {
    include: [...PAL_CANARY_TESTS],
    passWithNoTests: false,
    pool: 'forks',
    // Keep one worker, but leave enough heap headroom to avoid spending most of a cold run in GC.
    // A 2 GiB cap still fails well before the former 3–4 GiB producer path while prioritizing
    // stable wall time over an artificially tight 1168 MiB envelope.
    execArgv: ['--expose-gc', '--max-old-space-size=2048'],
    isolate: true,
    fileParallelism: false,
    hookTimeout: 900_000,
  },
})
