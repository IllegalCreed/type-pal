// @vitest-environment jsdom
import { emptyWorldScriptState, type WorldState } from '@type-pal/content'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { makeTestWorld } from '../test-fixtures.js'
import {
  buildCurrentSavePayload,
  buildMeta,
  captureThumbnail,
  resolveRestoredMusic,
} from './ops.js'

afterEach(() => vi.restoreAllMocks())

function currentWorld(): WorldState {
  return {
    ...makeTestWorld(),
    script: emptyWorldScriptState(),
    entityLifecycles: {},
  }
}

describe('current save operations', () => {
  test('buildMeta creates the slot summary with injected time', () => {
    const world = currentWorld()
    expect(buildMeta('m01', world, '鬼界·民居', (c) => `名:${c.template}`, 999)).toEqual({
      slotId: 'm01',
      kind: 'manual',
      party: [{ name: '名:li-xiaoyao', level: 1 }],
      mapName: '鬼界·民居',
      savedAt: 999,
    })
  })

  test('the only builder writes SAVE12/content23 without startup-entry identity', () => {
    const world = currentWorld()
    const position = {
      sceneId: 's001',
      pos: { col: 1, row: 2, height: 3 },
      facing: 'down' as const,
    }
    const payload = buildCurrentSavePayload(world, position, 'demo')
    expect(payload).toEqual({
      version: 12,
      sceneRuntime: {},
      contentVersion: 23,
      projectId: 'demo',
      world,
      position,
    })
    expect(payload.world).toBe(world)
    expect(payload).not.toHaveProperty('entryId')
    expect(payload).not.toHaveProperty('defaultEntryId')
  })

  test('restored music never leaks the pre-load track', () => {
    expect(resolveRestoredMusic('music.saved', 'music.scene')).toEqual({
      currentMusic: 'music.saved',
      action: 'play',
    })
    expect(resolveRestoredMusic(undefined, 'music.scene')).toEqual({
      currentMusic: 'music.scene',
      action: 'play',
    })
    expect(resolveRestoredMusic(null, 'music.scene')).toEqual({
      currentMusic: null,
      action: 'stop',
    })
    expect(resolveRestoredMusic(undefined, undefined)).toEqual({
      currentMusic: undefined,
      action: 'stop',
    })
  })

  test('captureThumbnail rejects when 2d context is unavailable', async () => {
    const source = document.createElement('canvas')
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    await expect(captureThumbnail(source)).rejects.toThrow('thumbnail: no 2d context')
  })
})
