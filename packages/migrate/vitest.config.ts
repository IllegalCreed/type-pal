import { defineConfig } from 'vitest/config'

const PAL_TESTS = ['src/**/*.pal.test.ts']

export default defineConfig({
  test: {
    passWithNoTests: false,
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          exclude: PAL_TESTS,
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
