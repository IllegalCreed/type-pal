// @vitest-environment node
/** Real dev-jump records must leave the party able to walk on the selected map. */
import { readFileSync } from 'node:fs'
import type { EventFile, SceneEventObject, Tilemap } from '@type-pal/shared'
import { afterEach, describe, expect, it } from 'vitest'
import { SceneAssetsCache } from '../assets/loader.js'
import { freshPlayerOpcodeState } from '../core/event-opcode-player.test-fixtures.js'
import { buildLabelMap, setGlobalEvents } from '../core/event-system.js'
import { makeFlatMap, makeSceneAssets, snap } from '../core/scene.test-fixtures.js'
import {
  loadScene,
  setCurrentMapNum,
  setSceneContext,
  tickSceneInput,
} from '../core/scene-system.js'
import jumps from './fixtures/scene-jumps.json' with { type: 'json' }

const extracted = new URL('../../../../data/extracted/', import.meta.url)

afterEach(() => {
  setGlobalEvents([])
  setSceneContext({ tilemap: makeFlatMap(0, 0) })
  setCurrentMapNum(0)
})

describe('dev scene jump spawn', () => {
  it('scene-86 can leave in all four directions after the real loader applies its fallback start', async () => {
    const jump = jumps.jumps.find((entry) => entry.id === 'scene-86')
    if (!jump?.partyStart) throw new Error('scene-86 requires its declared fallback start')
    const scene: { mapNum: number; eventObjects: SceneEventObject[]; onEnterLabel?: string } =
      JSON.parse(readFileSync(new URL(`data/scene/${jump.sceneId}.json`, extracted), 'utf8'))
    const tilemap: Tilemap = JSON.parse(
      readFileSync(new URL(`data/tilemap/${scene.mapNum}.json`, extracted), 'utf8'),
    )
    const events: EventFile = JSON.parse(
      readFileSync(new URL('events/all.json', extracted), 'utf8'),
    )
    const commands = events.segments[0]?.commands
    if (!commands) throw new Error('the real global script table is required')
    setGlobalEvents(commands)
    const cache = new SceneAssetsCache(async (id) => {
      expect(id).toBe(jump.sceneId)
      return {
        ...makeSceneAssets(
          id,
          scene.eventObjects,
          commands,
          buildLabelMap(commands),
          scene.onEnterLabel,
        ),
        tilemap,
        mapNum: scene.mapNum,
      }
    })
    const gs = freshPlayerOpcodeState()
    await loadScene({
      gs,
      sceneId: jump.sceneId,
      assets: cache,
      partyStart: { x: jump.partyStart.x, y: jump.partyStart.y, facing: 'down' },
    })
    expect(gs.wNumScene).toBe(87)
    expect([gs.party.x, gs.party.y]).toEqual([jump.partyStart.x, jump.partyStart.y])
    const canLeave = (['Down', 'Left', 'Up', 'Right'] as const).map((key) => {
      const moving = structuredClone(gs)
      tickSceneInput(moving, snap([key]), { tilemap })
      return moving.party.x !== gs.party.x || moving.party.y !== gs.party.y
    })
    expect(canLeave).toEqual([true, true, true, true])
  })
})
