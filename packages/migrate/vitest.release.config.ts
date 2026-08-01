import { defineConfig } from 'vitest/config'
import {
  ALL_MIGRATE_TESTS,
  PAL_CANARY_TESTS,
  PAL_FRESH_TESTS,
  PAL_HEAVY_TESTS,
  PAL_RELEASE_PREFLIGHT_TESTS,
  PAL_SHARED_TESTS,
} from './vitest.tests.js'

export default defineConfig({
  define: {
    'process.env.TYPE_PAL_MIGRATE_TEST_GATE': JSON.stringify('release'),
  },
  test: {
    passWithNoTests: false,
    projects: [
      {
        test: {
          name: 'release-preflight',
          include: [...PAL_RELEASE_PREFLIGHT_TESTS],
          pool: 'forks',
          isolate: true,
          fileParallelism: false,
          hookTimeout: 120_000,
          sequence: { groupOrder: 0 },
        },
      },
      {
        test: {
          name: 'release-unit',
          include: [...ALL_MIGRATE_TESTS],
          exclude: [...PAL_HEAVY_TESTS, ...PAL_CANARY_TESTS, ...PAL_RELEASE_PREFLIGHT_TESTS],
          pool: 'forks',
          isolate: true,
          maxWorkers: 2,
          sequence: { groupOrder: 1 },
        },
      },
      {
        define: {
          'process.env.TYPE_PAL_MIGRATE_TEST_GATE': JSON.stringify('release-shared'),
        },
        test: {
          name: 'release-pal-shared',
          include: [...PAL_SHARED_TESTS],
          pool: 'forks',
          // All source-backed PAL files share one live producer fixture in this worker. This is
          // process-local reuse only; the explicit canary and fresh project remain independent.
          isolate: false,
          fileParallelism: false,
          hookTimeout: 1_200_000,
          sequence: { groupOrder: 2 },
        },
      },
      {
        test: {
          name: 'release-pal-fresh',
          include: [...PAL_FRESH_TESTS],
          pool: 'forks',
          isolate: true,
          fileParallelism: false,
          hookTimeout: 1_200_000,
          sequence: { groupOrder: 3 },
        },
      },
    ],
  },
})
