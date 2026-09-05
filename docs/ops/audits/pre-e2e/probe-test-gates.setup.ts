// Actual Vitest execution with only read-only fs presence/read boundaries replaced in memory.
// TYPE_PAL_AUDIT_RESOURCE_CASE = missing-raw | missing-effect | normal.
// No real file is removed or changed; normal mode calls the real filesystem reads.
import { afterEach, expect, vi } from 'vitest'

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  const mode = process.env.TYPE_PAL_AUDIT_RESOURCE_CASE ?? 'normal'
  console.log('AUDIT_RESOURCE_MODE', mode)
  if (!['normal', 'missing-raw', 'missing-effect'].includes(mode))
    throw new Error(`Unknown audit mode: ${mode}`)
  const hidden = (path: unknown): boolean => {
    const normalized = String(path).replaceAll('\\', '/')
    return mode === 'missing-raw'
      ? /\/data\/raw\/(?:RNG|GOP)\.MKF$/.test(normalized)
      : mode === 'missing-effect' && normalized.endsWith('/data/extracted/data/magic/effect.rle')
  }
  const existsSync = (path: Parameters<typeof actual.existsSync>[0]) =>
    hidden(path) ? false : actual.existsSync(path)
  const readFileSync = (...args: Parameters<typeof actual.readFileSync>) => {
    if (hidden(args[0])) {
      const error = new Error(`AUDIT simulated ENOENT: ${String(args[0])}`)
      Object.assign(error, { code: 'ENOENT' })
      throw error
    }
    return actual.readFileSync(...args)
  }
  return { ...actual, existsSync, readFileSync, default: { ...actual, existsSync, readFileSync } }
})

afterEach((context) => {
  // Observe before making any assertions; this setup never adds assertions to the original test.
  console.log('AUDIT_ASSERTION_COUNT', context.task.name, expect.getState().assertionCalls)
})
