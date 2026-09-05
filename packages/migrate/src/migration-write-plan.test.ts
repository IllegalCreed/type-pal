import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import {
  CONTENT_VERSION,
  CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  type CurrentManifest,
} from '@type-pal/content'
import { afterEach, describe, expect, test } from 'vitest'
import { baselineWrites, type MigrationSnapshot, sha256 } from './migration-baseline.js'
import { commitMigrationTransaction } from './migration-transaction.js'
import { buildMigrationTransactionChanges } from './migration-write-plan.js'
import { planPalAssetRetirements } from './pal-assets.js'
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
const manifest = (): CurrentManifest => ({
  id: 'pal',
  name: 'PAL',
  contentVersion: CONTENT_VERSION,
  minimumSaveVersion: CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  defaultEntryId: 'new-game',
  content: {
    scenes: 'content/scenes/',
    actors: 'content/actors.json',
    skills: 'content/skills.json',
    items: 'content/items.json',
    locale: 'content/locale.json',
    sprites: 'content/sprites.json',
    enemies: 'content/enemies.json',
    enemyTeams: 'content/enemy-teams.json',
    battleFields: 'content/battle-fields.json',
    poisons: 'content/poisons.json',
    tilesets: 'content/tilesets.json',
    ambiences: 'content/ambiences.json',
    shops: 'content/shops.json',
    maps: 'content/maps/index.json',
    stamps: 'content/stamps.json',
    battleSprites: 'content/battle-sprites.json',
    migrationDiagnostics: 'content/migration-diagnostics.json',
    sharedScripts: 'content/shared-scripts.json',
    worldVariables: 'content/world-variables.json',
  },
  assets: { catalog: 'assets/index.json', roles: {} },
  entryPoints: [
    {
      id: 'new-game',
      label: '开始游戏',
      scene: 's000',
      startWorld: { party: [], money: 0, inventory: [] },
    },
  ],
})

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('current migration transaction change list', () => {
  test.each([
    ['assets/migrated/../author.png', 'a'.repeat(64)],
    ['assets/migrated//retired.png', 'a'.repeat(64)],
    ['assets/migrated\\retired.png', 'a'.repeat(64)],
    ['assets/author.png', 'a'.repeat(64)],
    ['assets/migrated/retired.png', 'not-a-sha256'],
  ])('拒绝越界或缺少完整指纹的资源退役计划 %s', (path, expectedSha256) => {
    const repo = tempRepo()
    expect(() =>
      buildMigrationTransactionChanges({
        repo,
        plan: { writes: new Map(), deletes: [] },
        nextBaseline: snapshot({}),
        retiredAssets: [{ id: 'retired', path, expectedSha256 }],
      }),
    ).toThrow('退役迁移资源计划无效')
    expect(existsSync(resolve(repo, 'packages/migrate/baselines/pal/_state.json'))).toBe(false)
  })

  test('同一工程文件不能同时写入和删除', () => {
    expect(() =>
      buildMigrationTransactionChanges({
        repo: tempRepo(),
        plan: { writes: new Map([['content/items.json', []]]), deletes: ['content/items.json'] },
        nextBaseline: snapshot({}),
      }),
    ).toThrow('迁移写入计划包含重复工程目标')
  })

  test('manifest 发布在没有资源闭包前置条件时拒绝生成计划', () => {
    expect(() =>
      buildMigrationTransactionChanges({
        repo: tempRepo(),
        plan: { writes: new Map(), deletes: [] },
        nextBaseline: snapshot({}),
        nextManifest: manifest(),
      }),
    ).toThrow('manifest 变更缺资源闭包前置条件')
  })

  test('baseline 与 manifest 已相同时不产生重复发布写入', () => {
    const repo = tempRepo()
    const nextBaseline = snapshot({ 'content/items.json': [] })
    for (const [path, content] of baselineWrites(nextBaseline)) put(repo, path, content)
    const nextManifest = manifest()
    put(repo, 'projects/pal/manifest.json', `${JSON.stringify(nextManifest, null, 2)}\n`)
    expect(
      buildMigrationTransactionChanges({
        repo,
        plan: { writes: new Map(), deletes: [] },
        previousBaseline: nextBaseline,
        nextBaseline,
        nextManifest,
        manifestPreconditions: [{ target: 'projects/pal/assets/index.json', hash: 'a'.repeat(64) }],
      }),
    ).toEqual([])
  })

  test('工程、baseline 与 current manifest 同事务且 manifest 最后提交', () => {
    const repo = tempRepo()
    const changes = buildMigrationTransactionChanges({
      repo,
      plan: { writes: new Map([['content/items.json', [{ id: 'manual' }]]]), deletes: [] },
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
    expect(changes.at(-1)?.scope).toBe('manifest')
  })

  test('场景正文先于 SceneIndex，manifest 仍为最终提交点', () => {
    const repo = tempRepo()
    const changes = buildMigrationTransactionChanges({
      repo,
      plan: {
        writes: new Map<string, MigrationJson>([
          ['content/scenes/index.json', { version: 1, scenes: [] }],
          ['content/scenes/s000.json', { id: 's000' }],
        ]),
        deletes: [],
      },
      nextBaseline: snapshot({}),
      nextManifest: manifest(),
      manifestPreconditions: [{ target: 'projects/pal/assets/index.json', hash: 'a'.repeat(64) }],
    })
    expect(changes.map(({ target }) => target)).toEqual([
      'projects/pal/content/scenes/s000.json',
      'projects/pal/content/scenes/index.json',
      'packages/migrate/baselines/pal/_state.json',
      'projects/pal/manifest.json',
    ])
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

  test('退役迁移资源作为 project delete 进入同一事务且重放为空', () => {
    const repo = tempRepo()
    const bytes = Buffer.from('retired-asset')
    const path = 'assets/migrated/faces/retired.png'
    put(repo, `projects/pal/${path}`, bytes.toString())
    const previousCatalog = {
      version: 1 as const,
      assets: {
        'face.pal.retired': {
          kind: 'face' as const,
          path,
          mediaType: 'image/png',
          bytes: bytes.byteLength,
          sha256: sha256(bytes),
          origin: { kind: 'legacy-migrated' as const },
        },
      },
    }
    const targetCatalog = { version: 1 as const, assets: {} }
    const retiredAssets = planPalAssetRetirements({ repo, previousCatalog, targetCatalog })
    const changes = buildMigrationTransactionChanges({
      repo,
      plan: { writes: new Map(), deletes: [] },
      nextBaseline: snapshot({}),
      retiredAssets,
    })
    expect(changes).toContainEqual({
      target: `projects/pal/${path}`,
      scope: 'project',
      expectedPreviousHash: sha256(bytes),
    })
    commitMigrationTransaction(repo, changes)
    expect(existsSync(resolve(repo, 'projects/pal', path))).toBe(false)
    expect(planPalAssetRetirements({ repo, previousCatalog, targetCatalog })).toEqual([])
  })
})
