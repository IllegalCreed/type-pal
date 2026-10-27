import type { SceneEventObject } from '@type-pal/shared'
import { expect, test } from 'vitest'
import { npcFromEventObject } from './game-state.js'
import { supplySupplementalSceneObjects } from './scene-supplemental-objects.js'

const native: SceneEventObject = {
  id: 0,
  x: 32,
  y: 32,
  spriteNum: 10,
  triggerMode: 1,
  nSpriteFrames: 0,
}
const addition: SceneEventObject = {
  id: 1,
  x: 64,
  y: 64,
  spriteNum: 0,
  triggerMode: 5,
  nSpriteFrames: 0,
  triggerLabel: 'L_9',
  supplemental: true,
}

test('a missing authored tail object is shared by scene and global state without resetting native progress', () => {
  const original = npcFromEventObject(native)
  original.scriptedFrame = 1
  const before = structuredClone(original)
  const gs = { npcs: [original], allEventObjects: [original] }
  supplySupplementalSceneObjects(gs, [native, addition])
  expect(original).toEqual(before)
  expect(gs.npcs[0]).toBe(original)
  expect(gs.npcs[1]).toBe(gs.allEventObjects[1])
  expect(gs.npcs[1]).toMatchObject({ id: 1, x: 64, y: 64, spriteNum: 0, triggerLabel: 'L_9' })
  gs.npcs[1]!.sState = 0
  gs.npcs = [original]
  supplySupplementalSceneObjects(gs, [native, addition])
  expect(gs.npcs[1]).toBe(gs.allEventObjects[1])
  expect(gs.npcs[1]!.sState).toBe(0)
  expect(gs.allEventObjects).toHaveLength(2)
})

test('scene-only saves receive the missing addition once and retain an existing current object', () => {
  const gs = { npcs: [npcFromEventObject(native)] }
  supplySupplementalSceneObjects(gs, [native, addition])
  const added = gs.npcs[1]!
  added.sVanishTime = -15
  supplySupplementalSceneObjects(gs, [native, addition])
  expect(gs.npcs).toHaveLength(2)
  expect(gs.npcs[1]).toBe(added)
  expect(added.sVanishTime).toBe(-15)
})

test('ID collisions, gaps and unmarked native definitions never overwrite or invent state', () => {
  const original = npcFromEventObject(native)
  const collision = npcFromEventObject({ ...addition, spriteNum: 10 })
  const gs = { npcs: [original], allEventObjects: [original, collision] }
  const before = structuredClone(gs)
  supplySupplementalSceneObjects(gs, [addition])
  expect(gs).toEqual(before)
  const short = { npcs: [original], allEventObjects: [original] }
  supplySupplementalSceneObjects(short, [
    { ...addition, id: 2 },
    { ...addition, supplemental: false },
  ])
  expect(short.npcs).toEqual([original])
  expect(short.allEventObjects).toEqual([original])
})
