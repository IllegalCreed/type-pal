import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  type ShopDef,
  validateAuthorEnemies,
  validateAuthorItems,
  validateAuthorScenes,
  validateAuthorSharedScripts,
  validateSceneIndex,
} from '@type-pal/content'
import { describe, expect, it } from 'vitest'
import { loadPalBaseline } from './migration-baseline.js'
import { loadPalMigrationSources } from './pal-migration-io.js'
import { assertPalStoreBoundaryInvariant } from './pal-store-boundary.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

function baselineContent() {
  const baseline = loadPalBaseline(repo)
  if (!baseline) throw new Error('缺 PAL baseline')
  const sceneIndex = validateSceneIndex(baseline.files.get('content/scenes/index.json'))
  const items = validateAuthorItems(baseline.files.get('content/items.json'))
  const scenes = validateAuthorScenes(
    sceneIndex.scenes.map((entry) => baseline.files.get(entry.path)),
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
  const sceneIndex = validateSceneIndex(readJson('content/scenes/index.json'))
  const items = validateAuthorItems(readJson('content/items.json'))
  const scenes = validateAuthorScenes(sceneIndex.scenes.map((entry) => readJson(entry.path)))
  const enemies = validateAuthorEnemies(readJson('content/enemies.json'))
  const sharedScripts = validateAuthorSharedScripts(readJson('content/shared-scripts.json'))
  return {
    shops: readJson('content/shops.json') as ShopDef[],
    items,
    commandRoots: [scenes, items, enemies, sharedScripts],
  }
}

describe('PAL Store0 publication boundary', () => {
  it('keeps baseline/current mirrored at exact item268 recipes/message and item270 source closure', () => {
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
