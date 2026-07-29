import { defineConfig } from 'vitest/config'
import { ALL_MIGRATE_TESTS } from './vitest.tests.js'

export default defineConfig({
  define: {
    'process.env.TYPE_PAL_MIGRATE_TEST_GATE': JSON.stringify('release'),
  },
  test: {
    include: [...ALL_MIGRATE_TESTS],
    passWithNoTests: true,
    pool: 'forks',
    isolate: true,
    fileParallelism: false,
    // Release intentionally rebuilds every PAL proof in a fresh isolate.
    hookTimeout: 1_200_000,
  },
})
