import { describe, expect, test } from 'vitest'
import { DeleteEntityCommand, UpdateEntityCommand } from './commands.js'
import type { EditorState } from './edit-session.js'
import { EditSession } from './edit-session.js'
import {
  blockingEntityAddressReferences,
  collectEntityAddressReferences,
  collectMissingEntityAddressReferences,
} from './entity-address-references.js'

function currentState(): EditorState {
  return {
    manifest: {
      id: 'current-editor-test',
      name: 'Current editor test',
      contentVersion: 17,
      defaultEntryId: 'main',
      content: {
        scenes: 'content/scenes/',
        maps: 'content/maps/index.json',
        sharedScripts: 'content/shared-scripts.json',
      },
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 's',
          startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
        },
      ],
      minimumSaveVersion: 8,
    },
    scenes: [
      {
        id: 's',
        mapId: 'map-s',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [
          {
            id: 'a',
            pos: { col: 1, row: 1, height: 0 },
            sprite: 'ghost',
            behaviors: {
              trigger: {
                main: {
                  label: 'main',
                  order: 0,
                  flow: {
                    kind: 'stages',
                    initial: 'main',
                    stages: [
                      {
                        id: 'main',
                        body: [
                          {
                            kind: 'hideEntity',
                            target: { scene: 's', entity: 'b' },
                            ticks: 10,
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
          {
            id: 'b',
            pos: { col: 2, row: 2, height: 0 },
            sprite: 'ghost',
            hostile: {
              enemyTeamId: 'team-1',
              onVictory: { kind: 'remove' },
              onPlayerFlee: { kind: 'remain' },
            },
          },
        ],
      },
    ],
    sharedScripts: {
      cleanup: {
        name: 'cleanup',
        self: 'none',
        body: [{ kind: 'restoreEntity', target: { scene: 's', entity: 'b' } }],
      },
    },
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    maps: {},
    mapIndex: { version: 1, maps: [] },
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    stamps: [],
    scriptChunks: {},
    tilesetBlobs: {},
  } as unknown as EditorState
}

describe('current entity address editor closure', () => {
  test('collects lifecycle leaves recursively and reports dangling targets', () => {
    const state = currentState()
    expect(collectEntityAddressReferences(state).map((reference) => reference.path)).toEqual([
      'scenes[0].entities[0].behaviors.trigger.main.flow.stages[0].body[0].target',
      'sharedScripts.cleanup.body[0].target',
    ])
    expect(collectMissingEntityAddressReferences(state)).toEqual([])

    state.scenes[0]!.entities = state.scenes[0]!.entities.filter((entity) => entity.id !== 'b')
    expect(collectMissingEntityAddressReferences(state)).toHaveLength(2)
  })

  test('classifies every supported reference source and excludes only target-self references', () => {
    const state = currentState()
    const target = { scene: 's', entity: 'b' }
    const authorScene = state.scenes[0] as unknown as {
      hooks?: unknown
      entities: Array<{ behaviors?: unknown }>
    }
    authorScene.hooks = {
      onEnter: {
        initial: 'main',
        variants: {
          main: {
            label: 'main',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'main',
              stages: [
                {
                  id: 'main',
                  body: [{ kind: 'hideEntity', target, ticks: 1 }],
                },
              ],
            },
          },
        },
      },
    }
    authorScene.entities[1]!.behaviors = {
      trigger: {
        self: {
          label: 'self',
          order: 0,
          flow: {
            kind: 'stages',
            initial: 'main',
            stages: [
              {
                id: 'main',
                body: [{ kind: 'restoreEntity', target }],
              },
            ],
          },
        },
      },
    }
    state.items = [
      {
        id: 'item-1',
        name: 'item-1',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'scene',
          consuming: false,
          effects: [{ kind: 'placeEntityInFront', target, state: 1 }],
        },
      },
    ] as never
    state.enemies = [
      {
        id: 'enemy-1',
        onDefeated: [
          {
            kind: 'branch',
            cond: { kind: 'entityInScene', target },
            then: [],
          },
        ],
      },
    ] as never
    // World currently has no author-facing EntityAddress field. Keep its opaque/future
    // locator projection covered, but present it as read-only in the UI.
    state.worlds = [{ id: 'world-1', review: { target } }] as never

    const references = collectEntityAddressReferences(state)
    expect(references.map((reference) => reference.locator.kind)).toEqual([
      'scene',
      'scene-entity',
      'scene-entity',
      'shared-script',
      'item',
      'enemy',
      'world',
    ])
    expect(references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'scenes[0].hooks.onEnter.variants.main.flow.stages[0].body[0].target',
          locator: { kind: 'scene', sceneId: 's' },
        }),
        expect.objectContaining({
          path: 'items[0].use.effects[0].target',
          locator: { kind: 'item', itemId: 'item-1' },
        }),
        expect.objectContaining({
          path: 'enemies[0].onDefeated[0].cond.target',
          locator: { kind: 'enemy', enemyId: 'enemy-1' },
        }),
        expect.objectContaining({
          path: 'worlds[0].review.target',
          locator: { kind: 'world', worldId: 'world-1' },
        }),
      ]),
    )

    expect(
      blockingEntityAddressReferences(state, target).map((reference) => reference.locator),
    ).not.toContainEqual({ kind: 'scene-entity', sceneId: 's', entityId: 'b' })
    expect(blockingEntityAddressReferences(state, target)).toHaveLength(6)
  })

  test('delete is fail-loud while lifecycle references exist and remains undoable after cleanup', () => {
    const state = currentState()
    const session = new EditSession(state)
    expect(() => session.dispatch(new DeleteEntityCommand('s', 'b'))).toThrow(
      /hideEntity.*target|仍被引用/,
    )
    expect(session.getState().scenes[0]!.entities.map((entity) => entity.id)).toEqual(['a', 'b'])
    expect(session.canUndo()).toBe(false)

    const cleaned = structuredClone(state)
    const scene = cleaned.scenes[0] as unknown as {
      entities: Array<{
        id: string
        behaviors?: {
          trigger?: Record<string, { flow: { stages: Array<{ body: unknown[] }> } }>
        }
      }>
    }
    scene.entities[0]!.behaviors!.trigger!.main!.flow.stages[0]!.body = []
    cleaned.sharedScripts = {}
    const cleanSession = new EditSession(cleaned)
    expect(cleanSession.dispatch(new DeleteEntityCommand('s', 'b'))).toBe(true)
    expect(cleanSession.getState().scenes[0]!.entities.map((entity) => entity.id)).toEqual(['a'])
    expect(cleanSession.undo()).toBe(true)
    expect(cleanSession.getState().scenes[0]!.entities.map((entity) => entity.id)).toEqual([
      'a',
      'b',
    ])
    expect(cleanSession.redo()).toBe(true)
    expect(cleanSession.getState().scenes[0]!.entities.map((entity) => entity.id)).toEqual(['a'])
  })

  test('the reference tab and delete guard share the same blocking set', () => {
    const state = currentState()
    expect(blockingEntityAddressReferences(state, { scene: 's', entity: 'b' })).toEqual(
      collectEntityAddressReferences(state),
    )
    expect(blockingEntityAddressReferences(state, { scene: 's', entity: 'a' })).toEqual([])
  })

  test('current hostile policy replacement participates in undo and redo', () => {
    const session = new EditSession(currentState())
    const command = new UpdateEntityCommand('s', 'b', {
      hostile: {
        enemyTeamId: 'team-1',
        onVictory: { kind: 'hide', ticks: 800 },
        onPlayerFlee: { kind: 'suspend', ticks: 15 },
      } as never,
    })
    expect(session.dispatch(command)).toBe(true)
    expect(session.getState().scenes[0]!.entities[1]!.hostile).toMatchObject({
      onVictory: { kind: 'hide', ticks: 800 },
      onPlayerFlee: { kind: 'suspend', ticks: 15 },
    })
    expect(session.undo()).toBe(true)
    expect(session.getState().scenes[0]!.entities[1]!.hostile).toMatchObject({
      onVictory: { kind: 'remove' },
      onPlayerFlee: { kind: 'remain' },
    })
    expect(session.redo()).toBe(true)
    expect(session.getState().scenes[0]!.entities[1]!.hostile).toMatchObject({
      onVictory: { kind: 'hide', ticks: 800 },
      onPlayerFlee: { kind: 'suspend', ticks: 15 },
    })
  })
})
