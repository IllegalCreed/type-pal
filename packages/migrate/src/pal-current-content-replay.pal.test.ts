import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const repo = fileURLToPath(new URL('../../..', import.meta.url))

/**
 * Production-entry regression.  This deliberately starts the exact ordinary command (without
 * --w9) in a clean child process; unit/build helpers and the explicit W9 flag must not be able
 * to mask a content13 fall-through into the historical generic merge.
 */
describe('content13 ordinary migrate:content replay', () => {
  test('verifies the published W9 authority and exits with a strict 0/0/0 plan', () => {
    const env: NodeJS.ProcessEnv = { ...process.env }
    delete env.TYPE_PAL_MIGRATE_TEST_GATE
    const result = spawnSync(
      'pnpm',
      ['--filter', '@type-pal/migrate', 'run', 'migrate:content'],
      {
        cwd: repo,
        encoding: 'utf8',
        env,
      },
    )
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
    expect(result.error, output).toBeUndefined()
    expect(result.signal, output).toBeNull()
    expect(result.status, output).toBe(0)
    expect(output).toContain('[迁移 plan] writes=0 deletes=0 conflicts=0')
    expect(output).toContain('[W9 lifecycle dry-run]')
    expect(output).not.toContain('items[55].throw.target')
  }, 180_000)
})
