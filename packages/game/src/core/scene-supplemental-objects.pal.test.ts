// @vitest-environment node
import { readFileSync } from 'node:fs'
import type { Command, EventObjectsFile, SceneObjects, Tilemap } from '@type-pal/shared'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { SceneAssetsCache } from '../assets/loader.js'
import { parseImportedSave, serializeSave } from '../tools/save-io.js'
import { finalizeBattleCleanup } from './battle/battle-finalization.js'
import { setSceneLoader, setStartBattleHandler, tickEventSystem } from './event-system.js'
import {
  createInitialGameState,
  type GameState,
  npcFromEventObject,
  sliceSceneEventObjects,
} from './game-state.js'
import { Save } from './save/api.js'
import { makeSceneAssets, snap } from './scene.test-fixtures.js'
import { loadScene, tickSceneSystem } from './scene-system.js'
import { setGlobalEvents } from './script-catalog.js'

function resource<T>(path: string): T {
  return JSON.parse(
    readFileSync(new URL(`../../../../data/extracted/${path}`, import.meta.url), 'utf8'),
  )
}
const current = resource<EventObjectsFile>('data/event-objects.json')
const commands = resource<{ segments: { commands: Command[] }[] }>('events/all.json').segments[0]!
  .commands
const room = resource<SceneObjects>('data/scene/286.json')
const map = resource<Tilemap>('data/tilemap/204.json')
let now = 0
function tick(gs: GameState) {
  now += 1000
  gs.nowMs = now
  tickEventSystem(gs, snap([], ['Confirm']))
}
function finishScript(gs: GameState) {
  for (let frame = 0; frame < 50 && gs.mode === 'event'; frame++) tick(gs)
  expect(gs.mode).toBe('explore')
}
function oldGame() {
  const gs = createInitialGameState({ x: 928, y: 816, facing: 'down' })
  gs.wNumScene = 287
  gs.allEventObjects = current.eventObjects
    .filter((object) => !object.supplemental)
    .map((object) => npcFromEventObject(object))
  gs.sceneEventRanges = structuredClone(current.sceneRanges)
  gs.npcs = sliceSceneEventObjects(gs, 287)!
  gs.allEventObjects[4845]!.scriptedFrame = 1 // An unrelated already-opened chest.
  return gs
}
function sceneCache() {
  return new SceneAssetsCache(async (id) => {
    const scene = resource<SceneObjects>(`data/scene/${id}.json`)
    return {
      ...makeSceneAssets(id, scene.eventObjects),
      mapNum: scene.mapNum,
      tilemap: resource<Tilemap>(`data/tilemap/${scene.mapNum}.json`),
    }
  })
}

beforeEach(() => {
  now = 0
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  setGlobalEvents(structuredClone(commands))
  setStartBattleHandler(({ gs }) => {
    gs.mode = 'battle'
  })
})
afterEach(async () => {
  setGlobalEvents([])
  setStartBattleHandler(null)
  setSceneLoader(null)
  await Save.deleteSlot(1)
  vi.restoreAllMocks()
})

test.each([
  'normal',
  'won',
  'fled',
  'published-portal',
] as const)('loaded %s palace save receives an independent exit and preserves native progress', async (kind) => {
  const gs = oldGame()
  if (kind === 'won' || kind === 'fled') {
    gs.mode = 'event'
    gs.eventCursor = { ip: 41999, currentEventObjectId: 4841, triggerOwnerId: 4841 }
    tick(gs)
    expect(gs.mode).toBe('battle')
    finalizeBattleCleanup(gs, kind)
    finishScript(gs)
    expect(gs.allEventObjects![4841]!.sVanishTime).toBe(kind === 'won' ? 800 : -15)
  } else if (kind === 'published-portal') {
    // Exact pre-existing D10 published portal definition. It must never turn back into an enemy.
    gs.allEventObjects![4841] = npcFromEventObject({
      id: 4841,
      x: 880,
      y: 840,
      spriteNum: 0,
      triggerLabel: 'L_43518',
      triggerMode: 5,
      sState: 1,
      nSpriteFrames: 0,
      vanishTime: 0,
      direction: 0,
      currentFrameNum: 0,
    })
  } else {
    // A legal persisted chase step (default speed 4 gives an 8x4 pixel move).
    gs.allEventObjects![4841]!.x = 1080
    gs.allEventObjects![4841]!.y = 460
  }
  gs.npcs = sliceSceneEventObjects(gs, 287)!
  await Save.saveSlot(1, gs)
  const stored = await Save.loadSlot(1)
  if (!stored) throw new Error('saved slot missing')
  const loaded: GameState = Object.assign(
    createInitialGameState({ x: 0, y: 0, facing: 'down' }),
    parseImportedSave(serializeSave(stored)),
  )
  const nativeBefore = structuredClone(loaded.allEventObjects)
  const cache = sceneCache()
  let pendingLoad: Promise<void> | undefined
  setSceneLoader((scene) => {
    pendingLoad = loadScene({ gs: loaded, sceneId: scene - 1, assets: cache }).then(() => {
      // The asset host releases loading after publication, as bootstrap's normal loader does.
      loaded.sceneLoading = false
    })
    return pendingLoad
  })
  await loadScene({ gs: loaded, sceneId: 286, assets: cache })
  expect(loaded.allEventObjects!.slice(0, 5077)).toEqual(nativeBefore)
  const exit = loaded.allEventObjects![5077]!
  expect(exit).toMatchObject({ id: 5077, x: 880, y: 840, spriteNum: 0, sState: 1, triggerMode: 5 })
  expect(loaded.npcs.find((npc) => npc.id === 5077)).toBe(exit)
  for (const keys of [['Down'], ['Down'], []] as const)
    tickSceneSystem(loaded, snap([...keys]), { tilemap: map })
  expect(loaded.eventCursor?.triggerOwnerId).toBe(kind === 'published-portal' ? 4841 : 5077)
  finishScript(loaded)
  await pendingLoad
  expect(loaded.sceneLoading).toBe(false)
  expect([loaded.wNumScene, loaded.party.x, loaded.party.y]).toEqual([286, 1392, 616])
  tickSceneSystem(loaded, snap())
  expect(loaded.mode).toBe('explore')
  expect(loaded.wNumScene).toBe(286)
  const exitBefore = structuredClone(exit)
  await loadScene({ gs: loaded, sceneId: 286, assets: cache })
  expect(loaded.npcs.filter((npc) => npc.id === 5077)).toEqual([exitBefore])
  expect(loaded.npcs.find((npc) => npc.id === 5077)).toBe(exit)
  expect(loaded.allEventObjects).toHaveLength(5078)
  expect(parseImportedSave(serializeSave(loaded)).allEventObjects?.[5077]).toEqual(exitBefore)
  expect(loaded.inventory).toEqual(gs.inventory)
  expect(loaded.partyMembers).toEqual(gs.partyMembers)
})

test('new canonical data retains the original ordinary enemy beside the independent exit', () => {
  expect(current.eventObjects[4841]).toMatchObject({
    x: 1088,
    y: 464,
    spriteNum: 548,
    triggerLabel: 'L_41999',
    autoLabel: 'L_41099',
    sState: 2,
  })
  expect(current.eventObjects[4841]!.supplemental).toBeUndefined()
  expect(
    room.eventObjects.filter((object) => object.supplemental).map((object) => object.id),
  ).toEqual([5077])
})
