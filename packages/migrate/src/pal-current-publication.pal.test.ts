import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type ActorDef, type ItemData, type ShopDef, validateSceneIndex } from '@type-pal/content'
import { describe, expect, it } from 'vitest'
import { loadPalBaseline } from './migration-baseline.js'
import {
  buildPalCurrentPublication,
  validatePalCurrentPublication,
} from './pal-current-publication.js'
import { buildPalCurrentManifest } from './pal-manifest.js'
import { loadPalMigrationSources } from './pal-migration-io.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

describe('PAL current-only publication', () => {
  it('publishes the current baseline and raw-owned partitions directly as content20/SAVE8', () => {
    const baseline = loadPalBaseline(repo)
    expect(baseline).toBeDefined()
    const sources = loadPalMigrationSources(repo)
    const staleItems = structuredClone(
      baseline!.files.get('content/items.json'),
    ) as unknown as ItemData[]
    const staleVessel = staleItems.find(({ id }) => id === '268')!
    staleVessel.desc = ['作者字段必须保留']
    staleVessel.buyPrice = 1_234
    const staleCraft = staleVessel.use!.effects.find((effect) => effect.kind === 'craftRecipe')!
    if (staleCraft.kind !== 'craftRecipe') throw new Error('expected craftRecipe')
    delete staleCraft.unavailableMessage
    const staleGourd = staleItems.find(({ id }) => id === '270')!
    staleGourd.desc = ['紫金葫芦作者字段必须保留']
    const stalePool = staleGourd.use!.effects.find(
      (effect) => effect.kind === 'drawFromResourcePool',
    )!
    if (stalePool.kind !== 'drawFromResourcePool') throw new Error('expected resource pool')
    delete stalePool.unavailableMessage
    const staleBaseline = { ...baseline!, files: new Map(baseline!.files) }
    staleBaseline.managedFiles = new Set(baseline!.managedFiles)
    staleBaseline.files.set('content/items.json', staleItems as never)
    const sceneIndex = validateSceneIndex(staleBaseline.files.get('content/scenes/index.json'))
    const authoredScene = sceneIndex.scenes[0]!
    const previousScenePath = authoredScene.path
    const authoredScenePath = 'content/authored/opening.json'
    authoredScene.name = '作者命名的开场'
    authoredScene.path = authoredScenePath
    staleBaseline.files.set('content/scenes/index.json', sceneIndex as never)
    staleBaseline.files.set(authoredScenePath, staleBaseline.files.get(previousScenePath)!)
    staleBaseline.files.delete(previousScenePath)
    staleBaseline.managedFiles.delete(previousScenePath)
    staleBaseline.managedFiles.add(authoredScenePath)
    const publication = buildPalCurrentPublication(staleBaseline, sources)
    const manifest = buildPalCurrentManifest(sources.assetCatalog)
    const report = validatePalCurrentPublication({ publication, manifest, sources })

    expect(report).toMatchObject({ scenes: 294, maps: 223, assets: 1_934 })
    const publishedSceneIndex = validateSceneIndex(
      publication.files.get('content/scenes/index.json'),
    )
    expect(publishedSceneIndex.scenes[0]).toEqual({
      id: authoredScene.id,
      name: '作者命名的开场',
      path: authoredScenePath,
    })
    expect(publication.files.has(authoredScenePath)).toBe(true)
    expect(publication.files.has(previousScenePath)).toBe(false)
    const actors = publication.files.get('content/actors.json') as unknown as ActorDef[]
    expect(actors.map(({ id }) => id)).toEqual([
      'li-xiaoyao',
      'zhao-linger',
      'lin-yueru',
      'wu-hou',
      'anu',
      'gai-luojiao',
      'jiu-jianxian',
      'li-daniang',
    ])
    const gai = actors.find(({ id }) => id === 'gai-luojiao')!
    expect(gai.portraits).toEqual({ default: 'portrait.pal.044' })
    expect(gai).not.toHaveProperty('face')
    const faceRecords = Object.values(sources.assetCatalog.assets).filter(
      (record) => record.kind === 'face',
    )
    expect(faceRecords).toHaveLength(5)
    expect(faceRecords.reduce((total, record) => total + record.bytes, 0)).toBe(10_324)
    expect(actors.filter(({ face }) => face !== undefined)).toHaveLength(5)
    expect(
      actors.every(
        ({ face }) => face === undefined || sources.assetCatalog.assets[face]?.kind === 'face',
      ),
    ).toBe(true)
    expect(sources.assetCatalog.assets).not.toHaveProperty('face.pal.gai-luojiao')
    expect(sources.binaryAssets.some(({ id }) => id === 'face.pal.gai-luojiao')).toBe(false)
    expect(manifest).not.toHaveProperty('migrations')
    expect(manifest).not.toHaveProperty('entryScene')
    expect(manifest).not.toHaveProperty('startWorld')
    expect(manifest.assets).not.toHaveProperty('legacy')
    expect([...publication.managedFiles]).not.toContain('content/migrations/script-v4-v5-save.json')
    expect([...publication.managedFiles].some((path) => path.startsWith('_transitions/'))).toBe(
      false,
    )
    const items = publication.files.get('content/items.json') as unknown as ItemData[]
    const vessel = items.find(({ id }) => id === '268')!
    const craft = vessel.use!.effects.find((effect) => effect.kind === 'craftRecipe')!
    expect(vessel.desc).toEqual(['作者字段必须保留'])
    expect(vessel.buyPrice).toBe(1_234)
    expect(craft).toMatchObject({ unavailableMessage: '炼蛊的材料不足' })
    const gourd = items.find(({ id }) => id === '270')!
    const pool = gourd.use!.effects.find((effect) => effect.kind === 'drawFromResourcePool')!
    expect(gourd.desc).toEqual(['紫金葫芦作者字段必须保留'])
    expect(pool).toMatchObject({ unavailableMessage: '无任何效果' })
    const shops = publication.files.get('content/shops.json') as unknown as ShopDef[]
    expect(shops.map(({ id }) => id)).toEqual(Array.from({ length: 20 }, (_, index) => index + 1))
    expect(shops.some(({ id }) => id === 0)).toBe(false)
  })

  it('rejects invalid poison definitions before publishing a current project', () => {
    const baseline = loadPalBaseline(repo)
    expect(baseline).toBeDefined()
    const sources = loadPalMigrationSources(repo)
    const publication = buildPalCurrentPublication(baseline!, sources)
    const manifest = buildPalCurrentManifest(sources.assetCatalog)
    const poisonsPath = manifest.content.poisons!
    const poisons = publication.files.get(poisonsPath)
    if (!Array.isArray(poisons) || poisons.length === 0)
      throw new Error(`${poisonsPath}: 期望非空毒定义数组`)
    const firstPoison = poisons[0]!
    const invalidPublication = {
      ...publication,
      files: new Map(publication.files),
    }
    invalidPublication.files.set(poisonsPath, [...poisons, structuredClone(firstPoison)])

    expect(() =>
      validatePalCurrentPublication({ publication: invalidPublication, manifest, sources }),
    ).toThrow(/poisons\[\d+\]\.id: 毒 \d+ 重复/)
  })
})
