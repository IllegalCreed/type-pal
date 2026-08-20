import { describe, expect, test } from 'vitest'
import { DeleteEntityCommand, UpdateEntityCommand } from './commands.js'
import type { EditorState } from './edit-session.js'
import { EditSession } from './edit-session.js'
import {
  collectEntityAddressReferences,
  collectMissingEntityAddressReferences,
} from './entity-address-references.js'
import {
  collectEntityLifecycleCommandBodies,
  DeleteEntityLifecycleCommand,
  InsertEntityLifecycleCommand,
  UpdateEntityLifecycleCommand,
} from './lifecycle-command-editor.js'

function currentState(): EditorState {
  return {
    manifest: {
      id: 'current-editor-test',
      name: 'Current editor test',
      contentVersion: 16,
      entryScene: 's',
      content: {
        scenes: 'content/scenes/',
        maps: 'content/maps/index.json',
        sharedScripts: 'content/shared-scripts.json',
      },
      assets: { catalog: 'assets/index.json', roles: {} },
      startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
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
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
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

  test('lifecycle leaf insert/update/delete share EditSession undo and redo', () => {
    const session = new EditSession(currentState())
    const [bodyLocation] = collectEntityLifecycleCommandBodies(session.getState(), 's', 'a')
    if (!bodyLocation) throw new Error('test lifecycle body 缺失')
    const location = bodyLocation.location
    expect(bodyLocation.label).toBe('触发 / main / main')
    const body = () =>
      (
        session.getState().scenes[0] as unknown as {
          entities: Array<{
            behaviors: {
              trigger: Record<string, { flow: { stages: Array<{ body: unknown[] }> } }>
            }
          }>
        }
      ).entities[0]!.behaviors.trigger.main!.flow.stages[0]!.body

    expect(
      session.dispatch(
        new UpdateEntityLifecycleCommand(location, 0, {
          kind: 'suspendEntity',
          target: { scene: 's', entity: 'b' },
          ticks: 15,
        }),
      ),
    ).toBe(true)
    expect(body()[0]).toMatchObject({ kind: 'suspendEntity', ticks: 15 })
    expect(session.undo()).toBe(true)
    expect(body()[0]).toMatchObject({ kind: 'hideEntity', ticks: 10 })
    expect(session.redo()).toBe(true)
    expect(body()[0]).toMatchObject({ kind: 'suspendEntity', ticks: 15 })

    expect(
      session.dispatch(
        new InsertEntityLifecycleCommand(location, 1, {
          kind: 'restoreEntity',
          target: { scene: 's', entity: 'b' },
        }),
      ),
    ).toBe(true)
    expect(body().map((command) => (command as { kind: string }).kind)).toEqual([
      'suspendEntity',
      'restoreEntity',
    ])
    expect(session.dispatch(new DeleteEntityLifecycleCommand(location, 0))).toBe(true)
    expect(body().map((command) => (command as { kind: string }).kind)).toEqual(['restoreEntity'])
    expect(session.undo()).toBe(true)
    expect(body().map((command) => (command as { kind: string }).kind)).toEqual([
      'suspendEntity',
      'restoreEntity',
    ])
  })

  test('lifecycle CRUD rejects unknown targets before mutating state or history', () => {
    const session = new EditSession(currentState())
    const location = {
      root: 'sharedScripts' as const,
      path: ['cleanup', 'body'],
    }
    expect(() =>
      session.dispatch(
        new InsertEntityLifecycleCommand(location, 1, {
          kind: 'removeEntity',
          target: { scene: 's', entity: 'missing' },
        }),
      ),
    ).toThrow(/未知实体/)
    expect(session.getState().sharedScripts?.cleanup?.body).toHaveLength(1)
    expect(session.canUndo()).toBe(false)
  })
})
