import type { AuthorSceneDef, AuthorScriptFlow, ScriptChunkV1 } from '@type-pal/content'
import { expect, test } from 'vitest'
import { loadWorldSpriteProject } from '../__tests__/world-sprite-project.js'
import {
  LANTERN,
  loadScriptedSpritePreview,
  visualInstance,
} from './__tests__/scripted-sprite-preview-fixture.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'
import {
  collectAutomaticScriptSpriteInstanceSites,
  describeSpriteReferenceBehavior,
  projectCanonicalSpritePreviewState,
  SCRIPT_PREVIEW_SHARED_CHUNK,
} from './world-sprite-behavior.js'

test('the initial page gives distinct links for direct and actor-based automatic instances', async () => {
  const flow: AuthorScriptFlow = {
    kind: 'stages',
    initial: 'listen',
    stages: [{ id: 'listen', body: [{ kind: 'wait', ms: 80 }] }],
  }
  const prop = visualInstance('lamp', { sprite: 'lamp-use' }, flow)
  const actor = visualInstance('guide', { actor: 'hero' }, flow)
  const secondProp = visualInstance('lamp-two', { sprite: 'lamp-use' }, flow)
  const resting = visualInstance('resting', { sprite: 'lamp-use' }, flow)
  const project = await loadWorldSpriteProject(
    'sprite-preview-reference-sites',
    [
      {
        asset: 'sprite.authored.lamps',
        label: '灯笼',
        frameCount: 3,
        definitions: [{ id: 'lamp-use', label: '灯笼用途', layout: { kind: 'static' } }],
      },
    ],
    {
      entities: [
        prop,
        { ...actor, pages: [{ id: 'rest', label: '休息' }, ...actor.pages!] },
        secondProp,
        {
          ...resting,
          initialPage: 'rest',
          pages: [{ id: 'rest', label: '休息' }, ...resting.pages!],
        },
        {
          ...visualInstance('still', { sprite: 'lamp-use' }, flow),
          pages: [{ id: 'default', label: '无自动行为' }],
        },
      ],
    },
  )

  const output = projectCanonicalSpritePreviewState(project.state, project.canonical)
  expect(collectAutomaticScriptSpriteInstanceSites(output)).toEqual([
    {
      spriteId: 'lamp-use',
      sceneId: 'start',
      entityId: 'lamp',
      where: 'scenes[0].entities[0].sprite',
      site: 'scene:start:entity:lamp',
      via: 'direct',
    },
    {
      spriteId: 'hero',
      sceneId: 'start',
      entityId: 'guide',
      where: 'scenes[0].entities[1].actor(hero) → actors.spriteId',
      site: 'scene:start:entity:guide',
      via: 'actor',
    },
    {
      spriteId: 'lamp-use',
      sceneId: 'start',
      entityId: 'lamp-two',
      where: 'scenes[0].entities[2].sprite',
      site: 'scene:start:entity:lamp-two',
      via: 'direct',
    },
  ])
})

test('projection preserves unrelated scenes and live inputs while resolving a current shared script', async () => {
  const result = await loadScriptedSpritePreview(
    'sprite-preview-projection-ownership',
    {
      kind: 'stages',
      initial: 'main',
      stages: [
        {
          id: 'main',
          body: [
            { kind: 'setEntityFrame', target: LANTERN, frame: 2 },
            { kind: 'callScript', script: 'pause', self: LANTERN },
            { kind: 'setEntityFrame', target: LANTERN, frame: 3 },
          ],
        },
      ],
    },
    { pause: { name: '暂停', self: 'optional', body: [{ kind: 'wait', ms: 90 }] } },
  )
  const original = structuredClone(result.project.canonical)
  const loadedScene = result.project.state.scenes[0]!
  const existing: ScriptChunkV1 = {
    version: 1,
    id: 'local-tests',
    scripts: { wait: [{ kind: 'wait', ms: 50 }] },
  }
  const shell = {
    ...result.project.state,
    scenes: [
      {
        ...loadedScene,
        entities: loadedScene.entities.map((entry) =>
          entry.id === LANTERN.entity ? { ...entry, pages: [{ state: 7 }] } : entry,
        ),
      },
    ],
    scriptChunks: { [existing.id]: existing },
  }
  const before = structuredClone(shell)
  const missingScene = projectCanonicalSpritePreviewState(shell, {
    ...result.project.canonical,
    scenes: [],
  })
  expect(missingScene.scenes[0]).toBe(shell.scenes[0])
  expect(collectAutomaticScriptSpriteInstanceSites(missingScene)).toEqual([])
  const preview = projectCanonicalSpritePreviewState(shell, result.project.canonical)
  expect(preview.scenes[0]?.entities[0]?.pages?.[0]?.state).toBe(7)
  expect(preview.scenes[0]?.entities[1]).toBe(shell.scenes[0]?.entities[1])
  expect(preview.scriptChunks[existing.id]).toEqual(existing)
  expect(result.behavior.preview).toEqual({
    kind: 'cycle',
    mode: 'explicit',
    intro: [],
    cycle: [
      { frame: 2, holdMs: 90 },
      { frame: 3, holdMs: 200 },
    ],
  })
  const projectedWait = preview.scriptChunks[SCRIPT_PREVIEW_SHARED_CHUNK]?.scripts.pause?.[0]
  if (projectedWait?.kind !== 'wait') throw new Error('The projected shared pause is missing')
  projectedWait.ms = 180
  expect(shell).toEqual(before)
  expect(result.project.canonical).toEqual(original)
})

test('a valid deterministic script requires the asset loader to confirm a positive integral frame count', async () => {
  const { projected, reference, definition, behavior } = await loadScriptedSpritePreview(
    'frame-count-for-reference-preview',
    {
      kind: 'stages',
      initial: 'main',
      stages: [
        {
          id: 'main',
          body: [{ kind: 'setEntityFrame', target: LANTERN, frame: 2 }],
        },
      ],
    },
  )
  expect(behavior.preview).toEqual({
    kind: 'cycle',
    mode: 'explicit',
    intro: [],
    cycle: [{ frame: 2, holdMs: 200 }],
  })
  for (const invalidCount of [undefined, 0, 2.5, NaN]) {
    const fallback = describeSpriteReferenceBehavior(projected, reference, definition, invalidCount)
    expect(fallback.label).toBe('自动行为脚本')
    expect(fallback.preview).toEqual({
      kind: 'unavailable',
      reason: '脚本含无法安全展开的控制流或副作用',
    })
  }
})

test('an actual actor-use edge and a directional instance report the correct source and facing', async () => {
  const actorEntity: AuthorSceneDef['entities'][number] = {
    id: 'guide',
    sprite: 'hero',
    facing: 'left',
    pos: { col: 2, row: 2, height: 0 },
  }
  const project = await loadWorldSpriteProject('directional-sprite-reference', [], {
    entities: [actorEntity],
  })
  const definition = project.state.sprites.find(({ id }) => id === 'hero')!
  const sources = collectCurrentProjectReferenceIndex(project.state).referencesTo({
    kind: 'world-sprite',
    id: definition.id,
  })
  const actor = sources.find(({ source }) => source.owner.kind === 'actor')
  const scene = sources.find(({ source }) => source.owner.kind === 'scene-entity')
  if (!actor || !scene) throw new Error('Expected actual actor and entity edges')
  expect(describeSpriteReferenceBehavior(project.state, actor, definition)).toEqual({
    kind: 'reference',
    label: '角色基础外观',
    detail: '角色实例通过此用途取得大世界外观',
  })
  expect(describeSpriteReferenceBehavior(project.state, scene, definition)).toEqual({
    kind: 'directional',
    label: '四向场景实例',
    detail: '初始朝向 left；移动时按四向帧带播放',
  })
  const otherScene = {
    ...scene,
    source: {
      ...scene.source,
      owner: { kind: 'scene-entity', sceneId: 'retired', entityId: actorEntity.id } as const,
    },
  }
  expect(describeSpriteReferenceBehavior(project.state, otherScene, definition)).toMatchObject({
    kind: 'reference',
    label: '内容引用',
  })
})
