import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import {
  CONTENT_VERSION,
  CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  type CurrentManifest,
  type ItemData,
} from '@type-pal/content'
import { PNG } from 'pngjs'
import { afterEach, describe, expect, test } from 'vitest'
import { plannedChanges } from './__tests__/planned-changes-fixture.js'
import { baselineWrites, type MigrationSnapshot, sha256 } from './migration-baseline.js'
import type { MigrationJson } from './migration-files.js'
import { commitMigrationTransaction } from './migration-transaction.js'
import { planPalAssetRetirements } from './pal-assets.js'

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
const put = (repo: string, path: string, content: string | Uint8Array): void => {
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
      startWorld: { party: ['li-xiaoyao'], money: 0, inventory: [] },
    },
  ],
})

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function catalogPreconditions(repo: string) {
  const target = 'projects/pal/assets/index.json'
  const catalog = '{"version":1,"assets":{}}\n'
  put(repo, target, catalog)
  return [{ target, hash: sha256(catalog) }]
}

function item(id: string, name: string) {
  return { id, name, desc: [], buyPrice: 10, sellPrice: 0, sellable: false } satisfies ItemData
}

describe('PAL 发布事务规划', () => {
  test('manifest 发布在没有资源闭包前置条件时拒绝生成计划', () => {
    expect(() =>
      plannedChanges({
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
      plannedChanges({
        repo,
        plan: { writes: new Map(), deletes: [] },
        previousBaseline: nextBaseline,
        nextBaseline,
        nextManifest,
        manifestPreconditions: catalogPreconditions(repo),
      }),
    ).toEqual([])
  })

  test('工程、baseline 与 current manifest 同事务且 manifest 最后提交', () => {
    const repo = tempRepo()
    const currentItems = [item('manual', '作者物品')]
    const baselineItems = [item('generated', '来源物品')]
    const nextManifest = manifest()
    const preconditions = catalogPreconditions(repo)
    const changes = plannedChanges({
      repo,
      plan: { writes: new Map([['content/items.json', currentItems]]), deletes: [] },
      nextBaseline: snapshot({ 'content/items.json': baselineItems }),
      nextManifest,
      manifestPreconditions: preconditions,
    })
    expect(changes.map(({ target }) => target)).toEqual([
      'projects/pal/content/items.json',
      'packages/migrate/baselines/pal/content/items.json',
      'packages/migrate/baselines/pal/_state.json',
      'projects/pal/manifest.json',
    ])
    expect(JSON.parse(changes[0]?.content ?? '')).toEqual(currentItems)
    expect(JSON.parse(changes[1]?.content ?? '')).toEqual(baselineItems)
    expect(changes.at(-1)).toEqual({
      target: 'projects/pal/manifest.json',
      scope: 'manifest',
      content: `${JSON.stringify(nextManifest, null, 2)}\n`,
      preconditions,
    })
  })

  test('退役迁移资源作为 project delete 进入同一事务且重放为空', () => {
    const repo = tempRepo()
    const bytes = PNG.sync.write(new PNG({ width: 1, height: 1 }))
    const path = 'assets/migrated/faces/retired.png'
    put(repo, `projects/pal/${path}`, bytes)
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
    const changes = plannedChanges({
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
