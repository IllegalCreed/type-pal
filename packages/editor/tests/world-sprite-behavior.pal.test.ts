import { resolve } from 'node:path'
import type { SpriteDef } from '@type-pal/content'
import {
  decodeWorldSpriteAssetBytes,
  loadAllAuthorScenes,
  loadCurrentProjectFrom,
  loadStampTemplates,
} from '@type-pal/reforge/author-io'
import { expect, test } from 'vitest'
import { authorProjectSource } from '../scripts/author-project-source.js'
import { toEditorState } from '../src/core/project-io.js'
import { collectCurrentProjectReferenceIndex } from '../src/core/project-reference-adapters.js'
import {
  collectAutomaticScriptSpriteInstanceSites,
  describeSpriteReferenceBehavior,
  projectCanonicalSpritePreviewState,
} from '../src/core/world-sprite-behavior.js'

const projectRoot = resolve(import.meta.dirname, '../../../projects/pal')

const entityRange = (scene: string, from: number, to: number): string[] =>
  Array.from({ length: to - from + 1 }, (_, index) => `${scene}/e${from + index}`)

const previouslyUnpreviewed = new Map<string, readonly string[]>([
  ['sprite-44', ['s004/e89', 's049/e822']],
  ['sprite-45', ['s004/e90', 's049/e827', 's206/e3490']],
  ['sprite-48', ['s004/e85', 's267/e4670']],
  ['sprite-49', ['s004/e86', 's267/e4671']],
  ['sprite-224', ['s019/e273', 's116/e2150', 's204/e3438']],
  ['sprite-371', ['s082/e1569']],
  ['sprite-447', ['s192/e3300', 's192/e3301']],
  ['sprite-490', [...entityRange('s156', 2541, 2552), ...entityRange('s168', 2824, 2848)]],
  ['sprite-502', ['s112/e2109']],
  [
    'sprite-566',
    [
      's228/e4037',
      's228/e4039',
      's228/e4043',
      's229/e4083',
      's229/e4087',
      's230/e4136',
      's243/e4295',
    ],
  ],
  [
    'sprite-567',
    [
      's228/e4031',
      's228/e4033',
      's228/e4041',
      's229/e4075',
      's229/e4077',
      's229/e4081',
      's229/e4085',
      's230/e4132',
      's230/e4134',
      's243/e4297',
    ],
  ],
  ['sprite-593', ['s228/e4029', 's228/e4035', 's229/e4073', 's229/e4079', 's229/e4091']],
  ['sprite-594', ['s228/e4027', 's229/e4089']],
  [
    'sprite-597',
    [
      's228/e4030',
      's228/e4040',
      's229/e4074',
      's229/e4084',
      's229/e4092',
      's230/e4137',
      's243/e4296',
      's243/e4299',
    ],
  ],
  [
    'sprite-598',
    [
      's228/e4028',
      's228/e4032',
      's229/e4076',
      's229/e4090',
      's230/e4133',
      's230/e4135',
      's243/e4298',
    ],
  ],
  ['sprite-599', ['s228/e4036', 's228/e4038', 's228/e4044', 's229/e4080', 's229/e4088']],
  ['sprite-600', ['s228/e4034', 's228/e4042', 's229/e4078', 's229/e4082', 's229/e4086']],
])

async function readPalPreview() {
  const source = await authorProjectSource(projectRoot)
  const project = await loadCurrentProjectFrom(source)
  const [scenes, stamps] = await Promise.all([
    loadAllAuthorScenes(project),
    loadStampTemplates(project),
  ])
  const canonical = {
    scenes,
    items: project.authorContent.items,
    sharedScripts: project.authorContent.sharedScripts,
  }
  const shell = toEditorState(project, scenes, {}, {}, stamps)
  const state = projectCanonicalSpritePreviewState(shell, canonical)
  const references = collectCurrentProjectReferenceIndex(shell, canonical)
  const automaticSites = collectAutomaticScriptSpriteInstanceSites(state)
  const definitions = new Map(shell.sprites.map((definition) => [definition.id, definition]))
  const sceneById = new Map(scenes.map((scene) => [scene.id, scene]))
  const sceneReference = (definitionId: string, sceneId: string, entityId: string) => {
    const reference = references
      .referencesTo({ kind: 'world-sprite', id: definitionId })
      .find(
        ({ source: referenceSource, relation }) =>
          relation.kind === 'world-sprite-use' &&
          referenceSource.owner.kind === 'scene-entity' &&
          referenceSource.owner.sceneId === sceneId &&
          referenceSource.owner.entityId === entityId,
      )
    if (!reference) throw new Error(`缺 PAL 精灵引用 ${definitionId} · ${sceneId}/${entityId}`)
    return reference
  }
  const frameCount = async (definition: SpriteDef) => {
    const record = shell.assetCatalog.assets[definition.asset]
    if (!record) throw new Error(`缺 PAL 精灵资源 ${definition.asset}`)
    const bytes = await source.readBytes(record.path)
    return (await decodeWorldSpriteAssetBytes(record, bytes)).frames.length
  }
  return { state, references, automaticSites, definitions, sceneById, sceneReference, frameCount }
}

test('PAL 曾漏预览的 102 个安全 auto 实例全部生成有效帧预览', async () => {
  const pal = await readPalPreview()

  let auditedInstances = 0
  for (const [definitionId, sites] of previouslyUnpreviewed) {
    const definition = pal.definitions.get(definitionId)
    if (!definition) throw new Error(`缺 PAL 用途定义 ${definitionId}`)
    const frameCount = await pal.frameCount(definition)
    for (const site of sites) {
      const [sceneId, entityId] = site.split('/')
      if (!sceneId || !entityId) throw new Error(`PAL 实例地址缺场景或实体：${site}`)
      const entity = pal.sceneById
        .get(sceneId)
        ?.entities.find((candidate) => candidate.id === entityId)
      if (!entity) throw new Error(`缺 PAL 实例 ${site}`)
      if (!('sprite' in entity) || entity.sprite !== definitionId)
        throw new Error(`${site} 未引用 ${definitionId}`)
      const reference = pal.sceneReference(definitionId, sceneId, entityId)
      const behavior = describeSpriteReferenceBehavior(pal.state, reference, definition, frameCount)
      expect(behavior.preview?.kind, `${definitionId} ${site}`).not.toBe('unavailable')
      if (!behavior.preview) throw new Error(`${definitionId} ${site} 缺预览`)
      const steps =
        behavior.preview.kind === 'cycle'
          ? [...behavior.preview.intro, ...behavior.preview.cycle]
          : behavior.preview.kind === 'variants'
            ? behavior.preview.variants.flatMap((variant) => variant.steps)
            : []
      expect(steps.length, `${definitionId} ${site}`).toBeGreaterThan(0)
      for (const step of steps) {
        expect(Number.isInteger(step.frame), `${definitionId} ${site}`).toBe(true)
        expect(step.frame, `${definitionId} ${site}`).toBeGreaterThanOrEqual(0)
        expect(step.frame, `${definitionId} ${site}`).toBeLessThan(frameCount)
      }
    }
    auditedInstances += sites.length
  }

  expect(auditedInstances).toBe(102)
}, 30_000)

test('035/072 保留实例行为预览，076 只由预制动作消费', async () => {
  const pal = await readPalPreview()
  const autoSitesFor = (id: string) => pal.automaticSites.filter((site) => site.spriteId === id)
  const previewAt = async (id: string, expectedSites: readonly string[]) => {
    const definition = pal.definitions.get(id)
    if (!definition) throw new Error(`缺 PAL 用途定义 ${id}`)
    const sites = autoSitesFor(id)
    expect(sites.map((site) => `${site.sceneId}/${site.entityId}`).sort()).toEqual(expectedSites)
    const frameCount = await pal.frameCount(definition)
    return sites.map(({ sceneId, entityId }) =>
      describeSpriteReferenceBehavior(
        pal.state,
        pal.sceneReference(id, sceneId, entityId),
        definition,
        frameCount,
      ),
    )
  }

  expect(
    (await previewAt('sprite-35', ['s004/e82', 's048/e795'])).some(
      (summary) => summary.label === '自动脚本定时循环' && summary.preview?.kind === 'cycle',
    ),
  ).toBe(true)
  expect(
    (await previewAt('sprite-72', ['s025/e482', 's093/e1745', 's128/e2242'])).every(
      (summary) => summary.preview?.kind === 'variants',
    ),
  ).toBe(true)
  expect(autoSitesFor('sprite-76')).toEqual([])

  const sprite76 = pal.definitions.get('sprite-76')
  if (!sprite76) throw new Error('缺 PAL 用途定义 sprite-76')
  const actionEntries = Object.entries(sprite76.poses ?? {})
  expect(actionEntries).toHaveLength(1)
  const firstAction = actionEntries[0]
  if (!firstAction) throw new Error('缺 sprite-76 预制动作')
  const [actionId, action] = firstAction
  expect(action).toMatchObject({
    loopFrom: 0,
    steps: [
      { frame: 0, durationMs: 100 },
      { frame: 1, durationMs: 200 },
      { frame: 2, durationMs: 200 },
      { frame: 3, durationMs: 200 },
      { frame: 0, durationMs: 100 },
    ],
  })
  const entity407 = pal.sceneById.get('s022')?.entities.find((entity) => entity.id === 'e407')
  expect(entity407?.pages?.[0]).toMatchObject({
    animation: {
      sprite: 'sprite-76',
      action: actionId,
      loop: true,
    },
  })
  expect(
    pal.references.referencesTo({ kind: 'world-sprite-action', spriteId: 'sprite-76', actionId }),
  ).toContainEqual(
    expect.objectContaining({
      source: expect.objectContaining({
        owner: expect.objectContaining({ sceneId: 's022', entityId: 'e407' }),
      }),
      relation: { kind: 'world-sprite-action-use', actionId },
    }),
  )
}, 30_000)
