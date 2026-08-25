import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { CONTENT_VERSION, CURRENT_PROJECT_MINIMUM_SAVE_VERSION, type CurrentManifest } from '@type-pal/content'
import { afterEach, describe, expect, test } from 'vitest'
import { sha256, type MigrationSnapshot } from './migration-baseline.js'
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
  files: new Map(Object.entries(files)), managedFiles: new Set(Object.keys(files)),
})
const put = (repo: string, path: string, content: string): void => {
  const full = resolve(repo, path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, content)
}
const manifest = (): CurrentManifest => ({
  id: 'pal', name: 'PAL', contentVersion: CONTENT_VERSION,
  minimumSaveVersion: CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  defaultEntryId: 'new-game',
  content: {
    scenes: 'content/scenes/', actors: 'content/actors.json', skills: 'content/skills.json',
    items: 'content/items.json', locale: 'content/locale.json', sprites: 'content/sprites.json',
    enemies: 'content/enemies.json', enemyTeams: 'content/enemy-teams.json',
    battleFields: 'content/battle-fields.json', poisons: 'content/poisons.json',
    tilesets: 'content/tilesets.json', ambiences: 'content/ambiences.json',
    shops: 'content/shops.json', maps: 'content/maps/index.json', stamps: 'content/stamps.json',
    battleSprites: 'content/battle-sprites.json', migrationDiagnostics: 'content/migration-diagnostics.json',
    sharedScripts: 'content/shared-scripts.json', worldVariables: 'content/world-variables.json',
  },
  assets: { catalog: 'assets/index.json', roles: {} },
  entryPoints: [{
    id: 'new-game', label: '开始游戏', scene: 's000',
    startWorld: { party: [], money: 0, inventory: [] },
  }],
})

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('current migration transaction change list', () => {
  test('工程、baseline 与 current manifest 同事务且 manifest 最后提交', () => {
    const repo = tempRepo()
    const changes = buildMigrationTransactionChanges({
      repo,
      plan: { writes: new Map([['content/items.json', [{ id: 'manual' }]]]), deletes: [] },
      nextBaseline: snapshot({ 'content/items.json': [{ id: 'generated' }] }),
      nextManifest: manifest(),
      manifestPreconditions: [{ target: 'projects/pal/assets/index.json', hash: 'a'.repeat(64) }],
    })
    expect(changes.find((item) => item.target === 'projects/pal/content/items.json')?.content).toContain('manual')
    expect(changes.find((item) => item.target.includes('baselines/pal/content/items.json'))?.content).toContain('generated')
    expect(changes.at(-2)?.target).toBe('packages/migrate/baselines/pal/_state.json')
    expect(changes.at(-1)?.scope).toBe('manifest')
  })

  test('删除退役 baseline 文件且跳过内容未变写入', () => {
    const repo = tempRepo()
    const old = snapshot({ 'content/old.json': { a: 1 }, 'content/keep.json': { a: 1 } })
    const next = snapshot({ 'content/keep.json': { a: 1 } })
    put(repo, 'packages/migrate/baselines/pal/content/old.json', '{"a":1}\n')
    put(repo, 'packages/migrate/baselines/pal/content/keep.json', `${JSON.stringify({ a: 1 }, null, 2)}\n`)
    const changes = buildMigrationTransactionChanges({ repo, plan: { writes: new Map(), deletes: [] }, previousBaseline: old, nextBaseline: next })
    expect(changes).toContainEqual({ target: 'packages/migrate/baselines/pal/content/old.json', scope: 'baseline' })
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
