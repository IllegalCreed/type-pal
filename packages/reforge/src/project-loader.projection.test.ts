import { expect, test } from 'vitest'
import {
  deepSnapshot,
  dProjectFiles,
  memoryFileSource,
} from './__tests__/glm-runtime-contract-fixtures.js'
import { lbMemorySource } from './__tests__/project-loading-boundaries/fixture.js'
import {
  baseJsons,
  files,
  manifest,
} from './__tests__/project-loading-boundaries/startup-fixture.js'
import { expectDefined } from './defined.js'
import {
  assembleCurrentProject,
  loadAllAuthorScenes,
  loadAllScenes,
  loadCurrentProjectFrom,
  loadScene,
} from './project-loader.js'

test('retains author identity and creates the runtime dialogue projection directly', () => {
  const project = assembleCurrentProject(manifest(), baseJsons)
  expect(project.manifest.contentVersion).toBe(23)
  expect(project.authorContent.sharedScripts.hello?.body[0]).toHaveProperty(
    'cue.identity.actor',
    'actor.li',
  )
  expect(project.sharedScripts.hello?.body[0]).toEqual({
    kind: 'dialog',
    cue: {
      speaker: 'name.li',
      portrait: { asset: 'portrait.li.angry', side: 'left' },
      rows: [{ text: 'line.hello' }],
    },
  })
})

test('fails invalid author identity before runtime projection', () => {
  const invalid = structuredClone(baseJsons)
  expectDefined(invalid.sharedScripts.hello.body[0]).cue.identity.portrait.expression = 'missing'
  expect(() => assembleCurrentProject(manifest(), invalid)).toThrow(/缺表情 "missing"/)
})

test('批量场景保留作者身份，运行态的精确投影与实际输入对象隔离', async () => {
  const sceneIds = ['s001', 's002', 's003']
  const source = memoryFileSource(dProjectFiles({ sceneIds, dialogScene: true }))
  const project = await loadCurrentProjectFrom(source)
  const author = await loadAllAuthorScenes(project)
  expect(author.map((scene) => scene.id)).toEqual(sceneIds)
  const authorFlow = author[0]?.hooks?.onEnter?.variants.main?.flow
  const authorCommand = authorFlow?.kind === 'stages' ? authorFlow.stages[0]?.body[0] : undefined
  if (authorCommand?.kind !== 'dialog') throw new Error('缺少作者对白')
  expect(authorCommand.cue.identity).toEqual({
    kind: 'actor',
    actor: 'actor.li',
    portrait: { kind: 'expression', expression: 'angry', side: 'left' },
  })

  const originalRead = source.readJson.bind(source)
  const consumed: { path: string; input: unknown; before: unknown }[] = []
  source.readJson = async <T>(path: string) => {
    const input = await originalRead<T>(path)
    if (/^content\/scenes\/s\d+\.json$/.test(path))
      consumed.push({ path, input, before: deepSnapshot(input) })
    return input
  }
  const dataBefore = structuredClone(project.authorContent)
  const actorsBefore = structuredClone(project.actorsById)
  const runtime = await loadAllScenes(project)
  expect(runtime.map(({ id, mapId, entities }) => ({ id, mapId, entities }))).toEqual(
    sceneIds.map((id) => ({ id, mapId: 'map-001', entities: [] })),
  )
  const runtimeFlow = runtime[0]?.hooks?.onEnter?.variants.main?.flow
  const runtimeCommand = runtimeFlow?.stages[0]?.body[0]
  if (runtimeCommand?.kind !== 'dialog') throw new Error('缺少运行态对白')
  expect(runtimeCommand.cue).toEqual({
    speaker: 'name.li',
    portrait: { asset: 'portrait.li.angry', side: 'left' },
    rows: [{ text: 'line.hello' }],
  })
  expect(consumed.map(({ path }) => path)).toEqual(
    sceneIds.map((id) => `content/scenes/${id}.json`),
  )
  runtimeCommand.cue = { rows: [{ text: 'mutated' }] }
  for (const { input, before } of consumed) expect(input).toEqual(before)
  expect(project.authorContent).toEqual(dataBefore)
  expect(project.actorsById).toEqual(actorsBefore)
})

test('author loader lowers grants in shared/item/hook roots and the lazy scene recipe with its own owner', async () => {
  const data = files()
  const reward = {
    kind: 'grantReward',
    rewards: [{ kind: 'item', itemId: 'gift', count: 4 }],
    notice: { kind: 'standard', timing: 'after' },
  }
  const hook = {
    label: 'Grant',
    order: 0,
    flow: { kind: 'stages', initial: 'entry', stages: [{ id: 'entry', body: [reward] }] },
  }
  data['content/items.json'] = [
    {
      id: 'gift',
      name: 'item.gift',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'scene',
        consuming: false,
        effects: [{ kind: 'itemPrivateScript', script: { id: 'use', body: [reward] } }],
      },
    },
  ]
  data['content/shared-scripts.json'] = { grant: { name: 'Grant', self: 'none', body: [reward] } }
  data['content/locale.json'] = { ...baseJsons.locale, 'item.gift': 'Gift' }
  data['content/scenes/s001.json'] = {
    ...baseJsons.entryScenes.s001,
    hooks: { onEnter: { initial: 'gift', variants: { gift: hook } } },
  }
  const lazy = {
    ...baseJsons.entryScenes.s001,
    id: 's002',
    entities: [
      {
        id: 'spot',
        zone: true,
        pos: { col: 1, row: 1, height: 0 },
        behaviors: {
          trigger: {
            collect: {
              label: 'Collect',
              order: 0,
              flow: {
                kind: 'acquisition',
                recipe: 'builtin/item/search',
                afterCollect: 'disable',
                stages: { available: { id: 'first' }, collected: { id: 'empty' } },
                rewards: reward.rewards,
                notice: reward.notice,
              },
            },
          },
        },
      },
    ],
  }
  data['content/scenes/s002.json'] = lazy
  data['content/scenes/index.json'] = {
    version: 1,
    scenes: ['s001', 's002'].map((id) => ({ id, name: id, path: `content/scenes/${id}.json` })),
  }
  const project = await loadCurrentProjectFrom(lbMemorySource(data))
  const expected = [
    { kind: 'giveItem', itemId: 'gift', count: 4 },
    {
      kind: 'dialog',
      cue: {
        slot: 'narration',
        rows: [{ reward: { kind: 'item', itemName: 'item.gift', count: 4 } }],
      },
    },
  ]
  expect(project.sharedScripts.grant?.body).toEqual(expected)
  expect(project.entryScene.hooks?.onEnter?.variants.gift?.flow.stages[0]?.body).toEqual(expected)
  const effect = project.items.gift?.use?.effects[0]
  if (effect?.kind !== 'itemPrivateScript') throw new Error('missing projected item private script')
  expect(effect.script.body).toEqual(expected)
  const projected = await loadScene(project, 's002')
  expect(projected.entities[0]?.behaviors?.trigger?.collect?.flow.stages[0]?.body).toEqual([
    ...expected,
    { kind: 'setEntityState', target: { scene: 's002', entity: 'spot' }, state: 0 },
  ])
  expect(project.authorContent.sharedScripts.grant?.body[0]).toEqual(reward)
  data['content/items.json'] = []
  await expect(loadCurrentProjectFrom(lbMemorySource(data))).rejects.toThrow('奖励物品不存在: gift')
})
