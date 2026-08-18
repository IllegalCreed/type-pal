import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import type { LoadedManifest } from '@type-pal/content'
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
const manifest = (): LoadedManifest => ({
  id: 'pal',
  name: 'PAL',
  contentVersion: 4,
  entryScene: 's000',
  content: {},
  assets: { catalog: 'assets/index.json', roles: {} },
  startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
})

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('migration transaction change list', () => {
  test('合并工程与纯 theirs baseline 分开取值，manifest 在 _state 后最后提交', () => {
    const repo = tempRepo()
    const changes = buildMigrationTransactionChanges({
      repo,
      plan: {
        writes: new Map([['content/items.json', [{ id: 'manual' }]]]),
        deletes: [],
      },
      nextBaseline: snapshot({ 'content/items.json': [{ id: 'generated' }] }),
      nextManifest: manifest(),
      manifestPreconditions: [{ target: 'projects/pal/assets/index.json', hash: 'a'.repeat(64) }],
    })
    expect(
      changes.find((item) => item.target === 'projects/pal/content/items.json')?.content,
    ).toContain('manual')
    expect(
      changes.find((item) => item.target.includes('baselines/pal/content/items.json'))?.content,
    ).toContain('generated')
    expect(changes.at(-2)?.target).toBe('packages/migrate/baselines/pal/_state.json')
    expect(changes.at(-1)).toMatchObject({
      target: 'projects/pal/manifest.json',
      scope: 'manifest',
    })
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

  test('原子地图工程写正文，baseline 只写 _state hash', () => {
    const repo = tempRepo()
    const path = 'content/maps/map-001.json'
    const map: MigrationJson = {
      version: 4,
      width: 1,
      height: 1,
      tilesetRefs: ['tileset-001'],
      layers: [
        {
          id: 'floor',
          name: '地板',
          tiles: [[1], [2]],
          sources: [[0], [0]],
        },
      ],
      collision: [[0], [0]],
    }
    const changes = buildMigrationTransactionChanges({
      repo,
      plan: { writes: new Map([[path, map]]), deletes: [] },
      nextBaseline: snapshot({ [path]: map }),
    })
    expect(changes.find((item) => item.target === `projects/pal/${path}`)?.content).toContain(
      '        [1]',
    )
    expect(changes.some((item) => item.target.endsWith(`/baselines/pal/${path}`))).toBe(false)
    expect(changes.at(-1)?.content).toContain(path)
  })

  test('same-version successor 保持 manifest raw bytes 且不生成 manifest change', () => {
    const repo = tempRepo()
    const raw = '{\r\n  "contentVersion": 14\r\n}\r\n'
    put(repo, 'projects/pal/manifest.json', raw)
    const changes = buildMigrationTransactionChanges({
      repo,
      plan: { writes: new Map(), deletes: [] },
      nextBaseline: snapshot({ 'content/items.json': [] }),
      preserveManifestRawText: raw,
    })
    expect(changes.some((item) => item.scope === 'manifest')).toBe(false)
    expect(changes.some((item) => item.target === 'projects/pal/manifest.json')).toBe(false)
    expect(() =>
      buildMigrationTransactionChanges({
        repo,
        plan: { writes: new Map(), deletes: [] },
        nextBaseline: snapshot({ 'content/items.json': [] }),
        preserveManifestRawText: `${raw}\n`,
      }),
    ).toThrow(/manifest raw bytes 漂移/)
  })
})
