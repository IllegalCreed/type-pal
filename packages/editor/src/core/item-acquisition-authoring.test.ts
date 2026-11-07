import {
  type AuthorAcquisitionFlow,
  type AuthorSceneDef,
  type AuthorScriptLibrary,
  expandAcquisitionFlow,
} from '@type-pal/content'
import { fsaSource, loadAllAuthorScenes, loadCurrentProjectFrom } from '@type-pal/reforge'
import { expect, test } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { serializeProjectWithMapCopies, toEditorState } from './project-io.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'
import { ScriptEditSession, UpdateEntityBehaviorCommand } from './script-editor.js'
import { mergeEditorProjectionWithCurrentAuthorState } from './script-editor-projection.js'
import { authorFlowInitial, previewFlowCursor } from './script-flow-preview.js'
import {
  emptyScriptPreviewLibrary,
  removeDeletedScriptPreviewReferences,
  resolveScriptPreviewBinding,
  scriptPreviewSceneEntries,
} from './script-preview-library.js'
import { buildBlankProject } from './seed.js'

const chest: AuthorAcquisitionFlow = {
  kind: 'acquisition',
  recipe: 'builtin/item/chest',
  stages: {
    available: { id: 'original-first', label: '开箱' },
    collected: { id: 'original-empty', label: '空箱' },
  },
  rewards: [
    { kind: 'item', itemId: 'gift', count: 2 },
    { kind: 'money', amount: 5 },
  ],
  notice: { kind: 'standard', timing: 'before' },
  opening: { facing: 'left', frame: 1 },
  empty: { kind: 'silent' },
}
async function fixture(flow = chest) {
  const files = await buildBlankProject('acquisition-authoring')
  const disk = memoryAuthorDirectory(files)
  const project = await loadCurrentProjectFrom(fsaSource(disk.dir))
  const initial = (await loadAllAuthorScenes(project))[0]!
  const scene: AuthorSceneDef = {
    ...initial,
    entities: [
      {
        id: 'box',
        sprite: 'hero',
        pos: { col: 1, row: 2, height: 0 },
        behaviors: { trigger: { collect: { label: '药箱', order: 0, flow } } },
        pages: [{ id: 'base', label: '默认', trigger: 'collect' }],
        initialPage: 'base',
      },
    ],
  }
  const items = [
    { id: 'gift', name: '止血草', desc: [], buyPrice: 0, sellPrice: 0, sellable: false },
  ]
  const sharedScripts: AuthorScriptLibrary = {
    story: {
      name: '剧情发药',
      self: 'none',
      body: [
        {
          kind: 'grantReward',
          rewards: [{ kind: 'item', itemId: 'gift', count: 3 }],
          notice: { kind: 'silent' },
        },
      ],
    },
  }
  const script = new ScriptEditSession({ scenes: [scene], items, sharedScripts })
  const main = toEditorState(project, [scene], {}, {}, [])
  main.items = items
  return { project, disk, main, script, scene }
}

test('recipe parameters and nested direct rewards retain actual reference owners, including custom dialogue actors and sounds', async () => {
  const flow: AuthorAcquisitionFlow = {
    ...chest,
    opening: { facing: 'left', frame: 1, sound: 'missing-sound' },
    notice: {
      kind: 'custom',
      timing: 'before',
      cue: { identity: { kind: 'actor', actor: 'hero' }, rows: [{ text: '礼物' }] },
    },
  }
  const f = await fixture(flow)
  const index = collectCurrentProjectReferenceIndex(f.main, f.script.getState())
  const rewards = index.referencesTo({ kind: 'item', id: 'gift' })
  expect(rewards).toHaveLength(2)
  const recipe = rewards.find((edge) => edge.locator.kind === 'script-owner')!
  expect(recipe.where).toBe(
    'scenes.start.entities.box.behaviors.trigger.collect.flow.rewards[0].itemId',
  )
  expect(recipe.locator).toEqual({
    kind: 'script-owner',
    owner: {
      kind: 'entity-behavior',
      sceneId: 'start',
      entityId: 'box',
      channel: 'trigger',
      behaviorId: 'collect',
    },
  })
  const direct = rewards.find((edge) => edge.locator.kind === 'canonical-script')!
  expect(direct.where).toBe('sharedScripts.story.body[0].rewards[0].itemId')
  expect(index.referencesTo({ kind: 'asset', id: 'missing-sound' })).toMatchObject([
    {
      where: 'scenes.start.entities.box.behaviors.trigger.collect.flow.opening.sound',
      locator: recipe.locator,
    },
  ])
  expect(
    index
      .referencesTo({ kind: 'actor', id: 'hero' })
      .some(
        (edge) =>
          edge.where ===
            'scenes.start.entities.box.behaviors.trigger.collect.flow.notice.cue.identity.actor' &&
          edge.locator.kind === 'script-owner',
      ),
  ).toBe(true)
})

test('detach, undo and preview cleanup keep both existing step bindings and their selected cursors', async () => {
  const f = await fixture()
  const entries = scriptPreviewSceneEntries(f.scene)
  expect(entries.map((entry) => entry.stageId)).toEqual(['original-first', 'original-empty'])
  const library = {
    ...emptyScriptPreviewLibrary(),
    bindings: entries.map((entry) => ({ entry, stateId: null })),
  }
  const detached = expandAcquisitionFlow(
    chest,
    { scene: f.scene.id, entity: 'box' },
    f.script.getState().items,
  )
  f.script.dispatch(
    new UpdateEntityBehaviorCommand({ scene: f.scene.id, entity: 'box' }, 'trigger', 'collect', {
      flow: detached,
    }),
  )
  expect(
    removeDeletedScriptPreviewReferences(library, [f.scene], f.script.getState().scenes),
  ).toEqual(library)
  expect(previewFlowCursor(chest, { kind: 'stage', stage: 'original-empty' })).toEqual({
    kind: 'stage',
    stage: 'original-empty',
  })
  expect(authorFlowInitial(chest)).toBe('original-first')
  expect(resolveScriptPreviewBinding(library, entries[1]!)).toEqual({
    stateId: null,
    source: 'step',
  })
  f.script.undo()
  expect(f.script.getState().scenes[0]!.entities[0]!.behaviors!.trigger!.collect!.flow).toEqual(
    chest,
  )
})

test('the real author serializer and current loader reopen all four typed workflows without baking commands into saved content', async () => {
  const f = await fixture()
  const author = f.script.getState()
  const schemes = author.scenes[0]!.entities[0]!.behaviors!.trigger!
  const common = { kind: 'acquisition' as const, rewards: chest.rewards, notice: chest.notice }
  schemes.pickup = {
    label: '拾取',
    order: 1,
    flow: { ...common, recipe: 'builtin/item/pickup', stages: { available: { id: 'pick' } } },
  }
  schemes.search = {
    label: '搜刮',
    order: 2,
    flow: {
      ...common,
      recipe: 'builtin/item/search',
      stages: { available: { id: 'search' }, collected: { id: 'empty' } },
      afterCollect: 'repeat',
      empty: {
        kind: 'custom',
        cue: { identity: { kind: 'narration' }, rows: [{ text: '这里没有了。' }] },
      },
    },
  }
  const merged = mergeEditorProjectionWithCurrentAuthorState(author, f.main)
  const files = await serializeProjectWithMapCopies(merged, fsaSource(f.disk.dir))
  const reopened = await loadCurrentProjectFrom(fsaSource(memoryAuthorDirectory(files).dir))
  const saved = (await loadAllAuthorScenes(reopened))[0]!
  expect(saved.entities[0]!.behaviors!.trigger).toEqual(schemes)
  expect(reopened.authorContent.sharedScripts).toEqual(author.sharedScripts)
  expect(reopened.authorContent.sharedScripts.story!.body[0]!.kind).toBe('grantReward')
  expect(reopened.manifest.contentVersion).toBe(23)
})
