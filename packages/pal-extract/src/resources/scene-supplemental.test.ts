import { expect, test } from 'vitest'
import type { SupplementalEventObject } from '../events/script-corrections.js'
import type { EventObject, Scene } from '../io/sss.js'
import { dumpAllEventObjects, dumpScene } from './scene.js'

test('supplemental objects publish globally and only in their scene without widening the last native range', () => {
  const scenes: Scene[] = [0, 1, 2].map((id) => ({
    mapNum: id + 1,
    scriptOnEnter: 0,
    scriptOnTeleport: 0,
    eventObjectIndex: id,
    raw: new Uint16Array([id + 1, 0, 0, id]),
  }))
  const native: EventObject[] = [0, 1, 2].map((id) => ({
    vanishTime: 0,
    x: id * 32,
    y: 16,
    layer: 0,
    triggerScript: id + 1,
    autoScript: 0,
    state: 1,
    triggerMode: 5,
    spriteNum: 0,
    nSpriteFrames: 0,
    direction: 0,
    currentFrameNum: 0,
    scriptIdleFrame: 0,
    spritePtrOffset: 0,
    nSpriteFramesAuto: 0,
    scriptIdleFrameCountAuto: 0,
    raw: new Uint16Array([0, id * 32, 16, 0, id + 1, 0, 1, 5, 0, 0, 0, 0, 0, 0, 0, 0]),
  }))
  const supplemental: SupplementalEventObject[] = [
    {
      sceneId: 0,
      object: {
        id: 3,
        x: 96,
        y: 32,
        spriteNum: 0,
        triggerMode: 5,
        triggerLabel: 'L_8',
        supplemental: true,
      },
    },
    {
      sceneId: 1,
      object: {
        id: 4,
        x: 128,
        y: 48,
        spriteNum: 0,
        triggerMode: 5,
        autoLabel: 'L_9',
        supplemental: true,
      },
    },
    {
      sceneId: 0,
      object: { id: 5, x: 160, y: 64, spriteNum: 0, triggerMode: 0, supplemental: true },
    },
  ]
  for (const row of [...scenes, ...native]) Object.freeze(row)
  for (const entry of supplemental) {
    Object.freeze(entry.object)
    Object.freeze(entry)
  }
  Object.freeze(scenes)
  Object.freeze(native)
  Object.freeze(supplemental)
  const metadata = new Map([[1, { autoTriggerOnce: true }]])
  const global = dumpAllEventObjects(scenes, native, metadata, supplemental)
  expect(global.sceneRanges).toEqual({ 0: [0, 1], 1: [1, 2], 2: [2, 3] })
  expect(global.eventObjects.map((object) => object.id)).toEqual([0, 1, 2, 3, 4, 5])
  expect(global.eventObjects.map((object) => object.x)).toEqual([0, 32, 64, 96, 128, 160])
  expect(global.eventObjects.slice(3)).toEqual([
    { id: 3, x: 96, y: 32, spriteNum: 0, triggerMode: 5, triggerLabel: 'L_8', supplemental: true },
    { id: 4, x: 128, y: 48, spriteNum: 0, triggerMode: 5, autoLabel: 'L_9', supplemental: true },
    { id: 5, x: 160, y: 64, spriteNum: 0, triggerMode: 0, supplemental: true },
  ])
  const published = scenes.map((_, id) => dumpScene(id, scenes, native, metadata, supplemental))
  expect(published.map((scene) => scene.eventObjects.map((object) => object.id))).toEqual([
    [0, 3, 5],
    [1, 4],
    [2],
  ])
  for (const scene of published)
    for (const object of scene.eventObjects) expect(object).toEqual(global.eventObjects[object.id])
  expect(published[1]!.eventObjects[0]).toMatchObject({ id: 1, autoTriggerOnce: true })
})
