import { defineConfig } from 'vitest/config'
import {
  ALL_MIGRATE_TESTS,
  PAL_CANARY_TESTS,
  PAL_FAST_EXCLUDED_TESTS,
  PAL_LITE_TESTS,
  PAL_ORACLE_TESTS,
  PAL_RELEASE_PREFLIGHT_TESTS,
} from './vitest.tests.js'

export default defineConfig({
  define: {
    'process.env.TYPE_PAL_MIGRATE_TEST_GATE': JSON.stringify('fast'),
  },
  test: {
    passWithNoTests: false,
    projects: [
      {
        test: {
          name: 'unit',
          include: [...ALL_MIGRATE_TESTS],
          exclude: [
            ...PAL_FAST_EXCLUDED_TESTS,
            ...PAL_LITE_TESTS,
            ...PAL_ORACLE_TESTS,
            ...PAL_CANARY_TESTS,
            ...PAL_RELEASE_PREFLIGHT_TESTS,
          ],
          pool: 'forks',
          isolate: true,
          maxWorkers: 2,
          sequence: { groupOrder: 0 },
        },
      },
      {
        test: {
          name: 'pal-lite',
          include: [...PAL_LITE_TESTS],
          pool: 'forks',
          isolate: true,
          fileParallelism: false,
          hookTimeout: 120_000,
          sequence: { groupOrder: 1 },
        },
      },
      {
        test: {
          name: 'pal-oracle',
          include: [...PAL_ORACLE_TESTS],
          pool: 'forks',
          isolate: true,
          fileParallelism: false,
          hookTimeout: 120_000,
          sequence: { groupOrder: 2 },
        },
      },
    ],
  },
})
