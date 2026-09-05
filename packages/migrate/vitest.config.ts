import { defineConfig } from 'vitest/config'
import { migrateCoverageFastTestExcludes } from '../../scripts/coverage/config.mjs'

const PAL_TESTS = ['src/**/*.pal.test.ts']
const coverageFast = process.env.TYPE_PAL_COVERAGE_PROFILE === 'fast'

export default defineConfig({
  test: {
    passWithNoTests: false,
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          exclude: [...PAL_TESTS, ...(coverageFast ? migrateCoverageFastTestExcludes : [])],
          pool: 'forks',
          isolate: true,
          maxWorkers: 2,
        },
      },
      {
        test: {
          name: 'pal',
          include: PAL_TESTS,
          pool: 'forks',
          isolate: true,
          fileParallelism: false,
          hookTimeout: 120_000,
          testTimeout: 120_000,
        },
      },
    ],
  },
})
