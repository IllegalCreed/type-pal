import { describe, expect, test } from 'vitest'
import { createReferenceProject } from './__tests__/reference-project.js'
import type { AuthorSceneDef } from './author-scene.js'
import type { AuthorCommand, AuthorScriptLibrary, AuthorStagesFlow } from './author-script.js'
import { validateAuthorScenes, validateAuthorSharedScripts } from './validate-author.js'
import { type ContentBundle, type Issue, validateReferences } from './validate-refs.js'

function project(id: string, register: boolean): ContentBundle {
  const pos = { col: 0, row: 1, height: 0 }
  const door = { label: 'Door', pos }
  const arrival = {
    label: 'Arrival',
    order: 0,
    flow: {
      kind: 'stages',
      initial: 'arrive',
      stages: [{ id: 'arrive', body: [{ kind: 'wait', ms: 1 }] }],
    } satisfies AuthorStagesFlow,
  }
  const scene = {
    id: 'hall',
    mapId: 'main-map',
    entry: { pos, facing: 'down' },
    entries: register ? { front: door, [id]: door } : { front: door },
    hooks: {
      onEnter: {
        initial: 'arrival',
        variants: register ? { arrival, [id]: arrival } : { arrival },
      },
    },
    entities: [],
  } satisfies AuthorSceneDef
  const sharedScripts = {
    arrival: {
      name: 'Arrival',
      self: 'none',
      body: [
        { kind: 'loadScene', scene: 'hall', entryId: id },
        {
          kind: 'selectSceneHooks',
          scene: 'hall',
          selection: { onEnter: { kind: 'use', value: id } },
        },
      ],
    },
  } satisfies AuthorScriptLibrary
  validateAuthorScenes([scene])
  validateAuthorSharedScripts(sharedScripts)
  return {
    scenes: [scene],
    mapIndex: {
      version: 1,
      maps: [{ id: 'main-map', name: 'Main', path: 'content/maps/main.json' }],
    },
    entryPoints: [
      {
        id: 'main',
        label: 'Main',
        scene: 'hall',
        startWorld: { party: [], money: 0, inventory: [] },
      },
    ],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    sharedScripts,
  }
}

test.each(['unlisted', 'constructor'])('reports two missing target definitions named %s', (id) => {
  expect(validateReferences(project(id, false))).toEqual([
    {
      severity: 'error',
      where: 'sharedScripts["arrival"].body[0].entryId',
      message: `命名落点 "hall/${id}" 不在 scenes`,
    },
    {
      severity: 'error',
      where: 'sharedScripts["arrival"].body[1].selection.onEnter.value',
      message: `场景脚本方案 "hall/onEnter/${id}" 不存在`,
    },
  ])
})

test('accepts an entry point and hook whose constructor name is actually defined', () => {
  expect(validateReferences(project('constructor', true))).toEqual([])
})

function projectWithBehavior(body: AuthorCommand[]): ContentBundle {
  const { bundle, scene, entity } = createReferenceProject()
  const scenes = [
    {
      ...scene,
      entities: [
        {
          ...entity,
          behaviors: {
            trigger: {
              arrival: {
                label: '进门',
                order: 0,
                flow: { kind: 'stages', initial: 'enter', stages: [{ id: 'enter', body }] },
              },
            },
          },
        },
      ],
    },
  ] satisfies AuthorSceneDef[]
  validateAuthorScenes(scenes)
  bundle.scenes = scenes
  return bundle
}

describe('scene behavior and animation references', () => {
  test.each([
    {
      reason: 'unknown action',
      sprite: 'sprite.hero',
      action: 'dance',
      problem: {
        severity: 'error',
        where: 'scenes[0].entities[0].pages[0].animation.action',
        message: '精灵 "sprite.hero" 不存在动作 "dance"',
      },
    },
    {
      reason: 'unknown sprite',
      sprite: 'unregistered',
      action: 'idle',
      problem: {
        severity: 'error',
        where: 'scenes[0].entities[0].pages[0].animation.sprite',
        message: '精灵 "unregistered" 不在 sprites 注册表',
      },
    },
  ] satisfies {
    reason: string
    sprite: string
    action: string
    problem: Issue
  }[])('checks a page animation with $reason', ({ sprite, action, problem }) => {
    const { bundle, scene, entity } = createReferenceProject()
    const scenes = [
      {
        ...scene,
        entities: [
          {
            ...entity,
            initialPage: 'default',
            pages: [{ id: 'default', label: '默认', animation: { sprite, action, loop: false } }],
          },
        ],
      },
    ] satisfies AuthorSceneDef[]
    validateAuthorScenes(scenes)
    bundle.scenes = scenes
    expect(validateReferences(bundle)).toEqual([problem])
  })

  test('resolves the action inside a failed teleport handler', () => {
    const bundle = projectWithBehavior([
      {
        kind: 'teleportOut',
        onFail: [
          {
            kind: 'playEntityAction',
            target: { scene: 'hall', entity: 'sentry' },
            sprite: 'sprite.hero',
            action: 'dance',
            loop: false,
          },
        ],
      },
    ])
    expect(validateReferences(bundle)).toEqual([
      {
        severity: 'error',
        where:
          'scenes[0].entities[0].behaviors.trigger.arrival.flow.stages[0].body[0].onFail[0].action',
        message: '精灵 "sprite.hero" 不存在动作 "dance"',
      },
    ])
  })

  test.each([
    {
      reason: 'missing scene',
      target: { scene: 'missing', entity: 'sentry' },
      problem: {
        severity: 'error',
        where:
          'scenes[0](hall).entities[0].behaviors.trigger.arrival.flow.stages[0].body[0].target.scene',
        message: '场景 "missing" 不在 scenes',
      },
    },
    {
      reason: 'missing entity',
      target: { scene: 'hall', entity: 'missing' },
      problem: {
        severity: 'error',
        where:
          'scenes[0](hall).entities[0].behaviors.trigger.arrival.flow.stages[0].body[0].target.entity',
        message: '实体 "hall/missing" 不在 scenes',
      },
    },
  ] satisfies {
    reason: string
    target: { scene: string; entity: string }
    problem: Issue
  }[])('checks a behavior selection with $reason', ({ target, problem }) => {
    expect(
      validateReferences(
        projectWithBehavior([
          {
            kind: 'selectEntityBehavior',
            target,
            channel: 'trigger',
            selection: { kind: 'use', value: 'arrival' },
          },
        ]),
      ),
    ).toEqual([problem])
  })
})
