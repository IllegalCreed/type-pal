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
    // The source producer has been made streaming/COW, but V8 otherwise retains a multi-GB
    // default old-space allowance and cold-run RSS varies with its expansion heuristics. Keep
    // the canary close to the documented resource envelope and fail loudly if the live producer
    // regresses toward the former 3–4 GB path. The 1168 MiB heap leaves room for one canonical
    // digest while the process-level RSS gate remains 1.5 GB.
    execArgv: ['--expose-gc', '--max-old-space-size=1168'],
    isolate: true,
    fileParallelism: false,
    hookTimeout: 900_000,
  },
})
