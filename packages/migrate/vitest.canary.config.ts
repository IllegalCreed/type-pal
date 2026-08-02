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
    execArgv: ['--expose-gc'],
    isolate: true,
    fileParallelism: false,
    hookTimeout: 900_000,
  },
})
