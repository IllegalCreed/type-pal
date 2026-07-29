import { defineConfig } from 'vitest/config'
import {
  ALL_MIGRATE_TESTS,
  PAL_FRESH_TESTS,
  PAL_HEAVY_TESTS,
  PAL_SHARED_TESTS,
} from './vitest.tests.js'

export default defineConfig({
  define: {
    'process.env.TYPE_PAL_MIGRATE_TEST_GATE': JSON.stringify('fast'),
  },
  test: {
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: 'unit',
          include: [...ALL_MIGRATE_TESTS],
          exclude: [...PAL_HEAVY_TESTS],
          pool: 'forks',
          isolate: true,
          maxWorkers: 2,
          sequence: { groupOrder: 0 },
        },
      },
      {
        test: {
          name: 'pal-shared',
          include: [...PAL_SHARED_TESTS],
          pool: 'forks',
          isolate: false,
          fileParallelism: false,
          // Cold targeted runs may initialize the shared P2-P7 fixture inside the
          // first synchronous beforeAll. Let it finish; per-test timeouts still
          // catch accidental repeated planner work.
          hookTimeout: 900_000,
          sequence: { groupOrder: 1 },
        },
      },
      {
        test: {
          name: 'pal-fresh',
          include: [...PAL_FRESH_TESTS],
          pool: 'forks',
          isolate: true,
          fileParallelism: false,
          sequence: { groupOrder: 2 },
        },
      },
    ],
  },
})
