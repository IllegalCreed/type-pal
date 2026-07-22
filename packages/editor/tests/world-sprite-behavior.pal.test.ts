import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { AssetRecordV1, SceneDef, ScriptChunkV1, SpriteDef } from '@type-pal/content'
import { decodeWorldSpriteAssetBytes } from '@type-pal/reforge'
import { expect, test } from 'vitest'
import type { EditorState } from '../src/core/edit-session.js'
import {
  collectSpriteAutomaticScriptBehaviors,
  describeSpriteReferenceBehavior,
} from '../src/core/world-sprite-behavior.js'

const root = resolve(import.meta.dirname, '../../..')
const readJson = <T>(path: string): T => JSON.parse(readFileSync(resolve(root, path), 'utf8')) as T

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

async function actualFrameCount(
  definition: SpriteDef,
  catalog: { assets: Record<string, AssetRecordV1> },
): Promise<number> {
  const record = catalog.assets[definition.asset]
  if (!record) throw new Error(`缺 PAL 精灵资源 ${definition.asset}`)
  const bytes = Uint8Array.from(readFileSync(resolve(root, 'projects/pal', record.path))).buffer
  return (await decodeWorldSpriteAssetBytes(record, bytes)).frames.length
}

test('PAL 曾漏预览的 102 个安全 auto 实例全部生成有效帧预览', async () => {
  const sceneIds = readJson<string[]>('projects/pal/content/scenes/index.json')
  const scriptIndex = readJson<{ chunks: Record<string, { path: string }> }>(
    'projects/pal/content/scripts/index.json',
  )
  const state = {
    actors: readJson('projects/pal/content/actors.json'),
    scenes: sceneIds.map((id) => readJson<SceneDef>(`projects/pal/content/scenes/${id}.json`)),
    scriptChunks: Object.fromEntries(
      Object.entries(scriptIndex.chunks).map(([id, record]) => [
        id,
        readJson<ScriptChunkV1>(`projects/pal/content/scripts/${record.path}`),
      ]),
    ),
  } as unknown as EditorState
  const definitions = readJson<SpriteDef[]>('projects/pal/content/sprites.json')
  const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]))
  const scenesById = new Map(state.scenes.map((scene) => [scene.id, scene]))
  const catalog = readJson<{ assets: Record<string, AssetRecordV1> }>(
    'projects/pal/assets/index.json',
  )

  let auditedInstances = 0
  for (const [definitionId, sites] of previouslyUnpreviewed) {
    const definition = definitionsById.get(definitionId)
    if (!definition) throw new Error(`缺 PAL 用途定义 ${definitionId}`)
    const frameCount = await actualFrameCount(definition, catalog)
    for (const site of sites) {
      const [sceneId, entityId] = site.split('/')
      const entity = scenesById
        .get(sceneId!)
        ?.entities.find((candidate) => candidate.id === entityId)
      if (!entity) throw new Error(`缺 PAL 实例 ${site}`)
      if (!('sprite' in entity) || entity.sprite !== definitionId)
        throw new Error(`${site} 未引用 ${definitionId}`)
      const behavior = describeSpriteReferenceBehavior(
        state,
        {
          sprite: definitionId,
          where: `scene:${sceneId}:entity:${entityId}`,
          site: `scene:${sceneId}:entity:${entityId}`,
        },
        definition,
        frameCount,
      )
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
        expect(step.frame, `${definitionId} ${site}`).toBeGreaterThanOrEqual(0)
        expect(step.frame, `${definitionId} ${site}`).toBeLessThan(frameCount)
      }
    }
    auditedInstances += sites.length
  }

  expect(auditedInstances).toBe(102)
}, 30_000)

test('035/072 保留实例行为预览，076 只由预制动作消费', async () => {
  const sceneIds = readJson<string[]>('projects/pal/content/scenes/index.json')
  const scriptIndex = readJson<{ chunks: Record<string, { path: string }> }>(
    'projects/pal/content/scripts/index.json',
  )
  const state = {
    actors: readJson('projects/pal/content/actors.json'),
    scenes: sceneIds.map((id) => readJson<SceneDef>(`projects/pal/content/scenes/${id}.json`)),
    scriptChunks: Object.fromEntries(
      Object.entries(scriptIndex.chunks).map(([id, record]) => [
        id,
        readJson<ScriptChunkV1>(`projects/pal/content/scripts/${record.path}`),
      ]),
    ),
  } as unknown as EditorState
  const definitions = readJson<SpriteDef[]>('projects/pal/content/sprites.json')
  const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]))
  const catalog = readJson<{ assets: Record<string, AssetRecordV1> }>(
    'projects/pal/assets/index.json',
  )
  const summariesFor = async (id: string) => {
    const definition = definitionsById.get(id)
    if (!definition) throw new Error(`缺 PAL 用途定义 ${id}`)
    return collectSpriteAutomaticScriptBehaviors(
      state,
      definition,
      await actualFrameCount(definition, catalog),
    )
  }

  expect(
    (await summariesFor('sprite-35')).some((summary) => summary.label === '自动脚本定时循环'),
  ).toBe(true)
  expect(
    (await summariesFor('sprite-72')).every((summary) => summary.preview.kind === 'variants'),
  ).toBe(true)
  expect(await summariesFor('sprite-76')).toEqual([])

  const sprite76 = definitionsById.get('sprite-76')
  const actionEntries = Object.entries(sprite76?.poses ?? {})
  expect(actionEntries).toHaveLength(1)
  const [actionId, action] = actionEntries[0]!
  expect(action).toMatchObject({
    loopFrom: 0,
    steps: [
      { frame: 0, durationMs: 240 },
      { frame: 1, durationMs: 240 },
      { frame: 2, durationMs: 240 },
      { frame: 3, durationMs: 240 },
    ],
  })
  const scene22 = state.scenes.find((scene) => scene.id === 's022')
  const entity407 = scene22?.entities.find((entity) => entity.id === 'e407')
  expect(entity407?.pages[0]).toMatchObject({
    animation: {
      sprite: 'sprite-76',
      action: actionId,
      loop: true,
      startAtMs: 240,
    },
  })
}, 30_000)
