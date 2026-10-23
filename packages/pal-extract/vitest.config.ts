import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // CLI suites spawn their own Node/tsx processes; avoid multiplying CPU contention.
    maxWorkers: 2,
  },
})
