import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const repo = fileURLToPath(new URL('../../..', import.meta.url))

/**
 * Production-entry regression.  This deliberately starts the exact ordinary command (without
 * flags) in a clean child process. The current canonical project must take the content16
 * read-only replay path and never fall through into a historical transition.
 */
describe('content16 ordinary migrate:content replay', () => {
  test('verifies the stable team/variable census and exits without historical migration', () => {
    const env: NodeJS.ProcessEnv = { ...process.env }
    delete env.TYPE_PAL_MIGRATE_TEST_GATE
    const result = spawnSync('pnpm', ['--filter', '@type-pal/migrate', 'run', 'migrate:content'], {
      cwd: repo,
      encoding: 'utf8',
      env,
    })
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
    expect(result.error, output).toBeUndefined()
    expect(result.signal, output).toBeNull()
    expect(result.status, output).toBe(0)
    expect(output).toContain(
      '[current replay] content16 无写入: teams=380 hostile=828 startBattle=174 dangling=0 worldVariables=0',
    )
    expect(output).not.toContain('[迁移 plan]')
    expect(output).not.toContain('[W9 lifecycle dry-run]')
    expect(output).not.toContain('items[55].throw.target')
  }, 180_000)
})
