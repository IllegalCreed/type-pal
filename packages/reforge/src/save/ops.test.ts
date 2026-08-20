import { emptyWorldScriptState, type WorldState } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { makeTestWorld } from '../test-fixtures.js'
import {
  buildCurrentSavePayload,
  buildMeta,
  captureThumbnail,
  resolveRestoredMusic,
} from './ops.js'

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
      party: world.party.map((c) => ({ name: `名:${c.template}`, level: c.level })),
      mapName: '鬼界·民居',
      savedAt: 999,
    })
  })

  test('the only builder writes SAVE8/content16', () => {
    const world = currentWorld()
    const position = {
      sceneId: 's001',
      pos: { col: 1, row: 2, height: 3 },
      facing: 'down' as const,
    }
    const payload = buildCurrentSavePayload(world, position, 'demo')
    expect(payload).toEqual({
      version: 8,
      contentVersion: 16,
      projectId: 'demo',
      world,
      position,
    })
    expect(payload.world).toBe(world)
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
    expect(resolveRestoredMusic(undefined, undefined)).toEqual({
      currentMusic: undefined,
      action: 'stop',
    })
  })

  test('captureThumbnail rejects when 2d context is unavailable', async () => {
    const originalDocument = globalThis.document
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { createElement: () => ({ getContext: () => null }) },
    })
    await expect(captureThumbnail({} as HTMLCanvasElement)).rejects.toThrow(/no 2d context/)
    Object.defineProperty(globalThis, 'document', { configurable: true, value: originalDocument })
  })
})
