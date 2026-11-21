import { spawnSync } from 'node:child_process'
import { readFileSync, symlinkSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect } from 'vitest'
import { put, tempRepo } from './pal-asset-fixtures.js'

const repo = fileURLToPath(new URL('../../../../', import.meta.url))
const tsx = createRequire(import.meta.url).resolve('tsx/cli')

/** Run the real CLI with a disposable repository root and the installed package dependencies. */
export function migrationCliFixture(script: string, dependencies: readonly string[]) {
  const root = tempRepo()
  for (const path of [script, ...dependencies]) {
    put(root, path, readFileSync(resolve(repo, path)))
  }
  symlinkSync(
    resolve(repo, 'packages/migrate/node_modules'),
    resolve(root, 'packages/migrate/node_modules'),
    'dir',
  )
  return {
    root,
    run(args: readonly string[] = []) {
      const result = spawnSync(process.execPath, [tsx, resolve(root, script), ...args], {
        cwd: root,
        encoding: 'utf8',
      })
      if (result.error) throw result.error
      expect(result.signal).toBeNull()
      return result
    },
  }
}
