import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import type { MigrationSnapshot } from './migration-baseline.js'
import { buildMigrationTransactionChanges } from './migration-write-plan.js'
import type { MigrationJson } from './pal-migration.js'

const roots: string[] = []
const tempRepo = (): string => {
  const root = mkdtempSync(resolve(tmpdir(), 'type-pal-write-plan-'))
  roots.push(root)
  return root
}
const snapshot = (files: Record<string, MigrationJson>): MigrationSnapshot => ({
  files: new Map(Object.entries(files)),
  managedFiles: new Set(Object.keys(files)),
})
const put = (repo: string, path: string, content: string): void => {
  const full = resolve(repo, path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, content)
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('migration transaction change list', () => {
  test('合并工程与纯 theirs baseline 分开取值，_state 最后提交', () => {
    const repo = tempRepo()
    const changes = buildMigrationTransactionChanges({
      repo,
      plan: {
        writes: new Map([['content/items.json', [{ id: 'manual' }]]]),
        deletes: [],
      },
      nextBaseline: snapshot({ 'content/items.json': [{ id: 'generated' }] }),
    })
    expect(
      changes.find((item) => item.target === 'projects/pal/content/items.json')?.content,
    ).toContain('manual')
    expect(
      changes.find((item) => item.target.includes('baselines/pal/content/items.json'))?.content,
    ).toContain('generated')
    expect(changes.at(-1)?.target).toBe('packages/migrate/baselines/pal/_state.json')
  })

  test('删除退役 baseline 文件且跳过内容未变写入', () => {
    const repo = tempRepo()
    const old = snapshot({ 'content/old.json': { a: 1 }, 'content/keep.json': { a: 1 } })
    const next = snapshot({ 'content/keep.json': { a: 1 } })
    put(repo, 'packages/migrate/baselines/pal/content/old.json', '{"a":1}\n')
    put(
      repo,
      'packages/migrate/baselines/pal/content/keep.json',
      `${JSON.stringify({ a: 1 }, null, 2)}\n`,
    )
    const changes = buildMigrationTransactionChanges({
      repo,
      plan: { writes: new Map(), deletes: [] },
      previousBaseline: old,
      nextBaseline: next,
    })
    expect(changes).toContainEqual({
      target: 'packages/migrate/baselines/pal/content/old.json',
      scope: 'baseline',
    })
    expect(changes.some((item) => item.target.endsWith('/content/keep.json'))).toBe(false)
  })
})
