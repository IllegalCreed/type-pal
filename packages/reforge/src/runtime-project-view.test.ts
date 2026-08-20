import { emptyWorldScriptState, type AuthorItemCoreMap, type BaseSceneDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  isRuntimeScriptRef,
  projectItemsView,
  baseSceneView,
  projectedWorldScriptScratch,
  refreshSceneViewBindings,
} from './runtime-project-view.js'

function scene(): BaseSceneDef {
  return {
    id: 's001',
    mapId: 'map-001',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [
      {
        id: 'e001',
        sprite: 'sprite-1',
        pos: { col: 1, row: 2, height: 0 },
        behaviors: {
          trigger: {
            talk: {
              label: '交谈',
              order: 0,
              flow: {
                kind: 'stages',
                initial: 'hello',
                stages: [{ id: 'hello', body: [] }],
              },
            },
          },
          auto: {
            patrol: {
              label: '巡逻',
              order: 0,
              flow: {
                kind: 'stages',
                initial: 'walk',
                stages: [{ id: 'walk', body: [] }],
              },
            },
          },
        },
        pages: [
          {
            id: 'idle',
            label: '默认',
            trigger: 'talk',
            triggerActivation: { on: 'interact', range: 2 },
          },
          {
            id: 'moving',
            label: '移动',
            auto: 'patrol',
            animation: { sprite: 'sprite-1', action: 'idle', loop: true },
          },
        ],
        initialPage: 'idle',
      },
    ],
    hooks: {
      onEnter: {
        initial: 'default',
        variants: {
          default: {
            label: '入场',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'first',
              stages: [
                {
                  id: 'first',
                  entry: { prepare: [], reveal: { kind: 'cut' } },
                  body: [],
                },
              ],
            },
          },
        },
      },
    },
  }
}

describe('current runtime projection', () => {
  test('projects canonical page/behavior/hook selection without copying script bodies', () => {
    const world = emptyWorldScriptState()
    const legacy = baseSceneView(scene(), world)
    expect(legacy.entities[0]?.pages?.[0]).toEqual({
      trigger: { on: 'interact', range: 2, stages: [{ body: [] }] },
    })
    expect(legacy.onEnter).toEqual([{ entry: { prepare: [], reveal: { kind: 'cut' } }, body: [] }])

    world.behaviors.entities = {
      s001: { e001: { page: 'moving' } },
    }
    const live = legacy.entities[0]
    if (!live) throw new Error('missing entity')
    live.pos = { col: 9, row: 9, height: 0 }
    refreshSceneViewBindings(legacy, scene(), world)
    expect(live.pos).toEqual({ col: 9, row: 9, height: 0 })
    expect(live.pages?.[0]).toEqual({
      auto: { stages: [{ body: [] }] },
      animation: { sprite: 'sprite-1', action: 'idle', loop: true },
    })
  })

  test('adapts stable shared and item-private refs only inside the runtime shell', () => {
    const items: AuthorItemCoreMap = {
      shared: {
        id: 'shared',
        name: '共享',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'scene',
          consuming: false,
          effects: [{ kind: 'runScript', script: 'shared/teleport' }],
        },
      },
      private: {
        id: 'private',
        name: '私有',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'scene',
          consuming: false,
          effects: [
            {
              kind: 'itemPrivateScript',
              script: { id: 'use', body: [{ kind: 'setFlag', flag: 'used', value: true }] },
            },
          ],
        },
      },
    }
    const legacy = projectItemsView(items)
    const shared = legacy.shared?.use?.effects[0]
    const privateEffect = legacy.private?.use?.effects[0]
    expect(shared?.kind).toBe('runScript')
    expect(privateEffect?.kind).toBe('runScript')
    if (shared?.kind !== 'runScript' || privateEffect?.kind !== 'runScript')
      throw new Error('bad test fixture')
    expect(isRuntimeScriptRef(shared.script)).toBe(true)
    expect(shared.script.id).toBe('shared/teleport')
    expect(privateEffect.script.id).toBe('item:private:use')
    expect(items.private?.use?.effects[0]?.kind).toBe('itemPrivateScript')
  })

  test('flattens only the active scene into a non-persistent scratch view', () => {
    const world = emptyWorldScriptState()
    world.flags.done = true
    world.entityState = { s001: { e001: 2 }, s002: { e001: 0 } }
    world.entityPos = {
      s001: { e001: { col: 3, row: 4, height: 0 } },
    }
    expect(projectedWorldScriptScratch(world, 's001')).toMatchObject({
      flags: { done: true },
      entityState: { e001: 2 },
      entityStage: {},
      entityPos: { e001: { col: 3, row: 4, height: 0 } },
    })
  })
})
