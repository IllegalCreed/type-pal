import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  type ShopDef,
  validateAuthorEnemies,
  validateAuthorItems,
  validateAuthorScenes,
  validateAuthorSharedScripts,
} from '@type-pal/content'
import { describe, expect, it } from 'vitest'
import { loadPalBaseline } from './migration-baseline.js'
import { loadPalMigrationSources } from './pal-migration-io.js'
import { assertPalStoreBoundaryInvariant } from './pal-store-boundary.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

function baselineContent() {
  const baseline = loadPalBaseline(repo)
  if (!baseline) throw new Error('缺 PAL baseline')
  const sceneIds = baseline.files.get('content/scenes/index.json')
  if (!Array.isArray(sceneIds)) throw new Error('PAL baseline scene index 不是数组')
  const items = validateAuthorItems(baseline.files.get('content/items.json'))
  const scenes = validateAuthorScenes(
    sceneIds.map((id) => baseline.files.get(`content/scenes/${String(id)}.json`)),
  )
  const enemies = validateAuthorEnemies(baseline.files.get('content/enemies.json'))
  const sharedScripts = validateAuthorSharedScripts(
    baseline.files.get('content/shared-scripts.json'),
  )
  return {
    shops: baseline.files.get('content/shops.json') as unknown as ShopDef[],
    items,
    commandRoots: [scenes, items, enemies, sharedScripts],
  }
}

function projectContent() {
  const readJson = (path: string): unknown =>
    JSON.parse(readFileSync(resolve(repo, 'projects/pal', path), 'utf8')) as unknown
  const sceneIds = readJson('content/scenes/index.json')
  if (!Array.isArray(sceneIds)) throw new Error('PAL project scene index 不是数组')
  const items = validateAuthorItems(readJson('content/items.json'))
  const scenes = validateAuthorScenes(
    sceneIds.map((id) => readJson(`content/scenes/${String(id)}.json`)),
  )
  const enemies = validateAuthorEnemies(readJson('content/enemies.json'))
  const sharedScripts = validateAuthorSharedScripts(readJson('content/shared-scripts.json'))
  return {
    shops: readJson('content/shops.json') as ShopDef[],
    items,
    commandRoots: [scenes, items, enemies, sharedScripts],
  }
}

describe('PAL Store0 publication boundary', () => {
  it('keeps baseline/current mirrored at 20 real shops and exact item270 source closure', () => {
    const sources = loadPalMigrationSources(repo)
    const expected = {
      sourceStores: sources.stores,
      expectedBuyCalls: 29,
      expectedSellCalls: 6,
      expectedSellShopId: 0,
    }
    const baseline = assertPalStoreBoundaryInvariant({ ...baselineContent(), ...expected })
    const project = assertPalStoreBoundaryInvariant({ ...projectContent(), ...expected })

    expect(baseline).toEqual({ buyCalls: 29, sellCalls: 6 })
    expect(project).toEqual(baseline)
    expect(projectContent().shops).toEqual(baselineContent().shops)
  })
})
