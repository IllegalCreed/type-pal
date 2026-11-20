import { mkdirSync, readFileSync, symlinkSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import { migrationCliFixture } from './__tests__/migration-cli-fixture.js'
import { put, tempRepo } from './__tests__/pal-asset-fixtures.js'

const repo = fileURLToPath(new URL('../../../', import.meta.url))
const demo = 'projects/demo/assets/generated/battle-sprites/player-fighter.rle'
const e2e = 'projects/e2e-own/assets/generated/battle-sprites/player-fighter.rle'

function fixture() {
  return migrationCliFixture('packages/migrate/scripts/generate-project-battle-placeholders.mts', [
    'packages/migrate/src/migration-path.ts',
  ])
}

test.each([
  'dir',
  'file',
] as const)('rejects a linked %s at the second destination before changing either output', (kind) => {
  const { root, run } = fixture()
  const first = put(root, demo, 'existing demo sprite')
  const outside = tempRepo()
  const external = put(outside, 'player-fighter.rle', 'external sprite')
  const second = resolve(root, e2e)
  const linked = kind === 'dir' ? dirname(second) : second
  mkdirSync(dirname(linked), { recursive: true })
  symlinkSync(kind === 'dir' ? outside : external, linked, kind)

  const result = run()

  expect(readFileSync(external, 'utf8')).toBe('external sprite')
  expect(readFileSync(first, 'utf8')).toBe('existing demo sprite')
  expect(result.status).toBe(1)
  expect(result.stderr).toContain('占位战斗精灵输出 不得经过符号链接')
  expect(result.stderr).toContain(e2e)
})

test('recreates both tracked sprites when one output is stale and the other is absent', () => {
  const { root, run } = fixture()
  const first = put(root, demo, 'existing demo sprite')
  const result = run()

  expect(result.status).toBe(0)
  expect(result.stderr).toBe('')
  expect(readFileSync(first)).toEqual(readFileSync(resolve(repo, demo)))
  expect(readFileSync(resolve(root, e2e))).toEqual(readFileSync(resolve(repo, e2e)))
})
