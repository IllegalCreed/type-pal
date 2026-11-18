import { expect, test } from 'vitest'
import type { AuthorSceneDef } from './author-scene.js'
import type { AuthorScriptLibrary, AuthorStagesFlow } from './author-script.js'
import { validateAuthorScenes, validateAuthorSharedScripts } from './validate-author.js'
import { type ContentBundle, validateReferences } from './validate-refs.js'

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
