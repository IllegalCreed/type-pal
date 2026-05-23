import { describe, expect, it } from 'vitest'
import type { EventObject, Scene } from '../io/sss.js'
import { dumpScene } from './scene.js'

describe('dumpScene', () => {
  const fakeEventObjects: EventObject[] = [
    {
      state: 1,
      vanishTime: 0,
      x: 10,
      y: 20,
      spriteNum: 78,
      triggerScript: 59,
      autoScript: 0,
      layer: 0,
      triggerMode: 0,
      raw: new Uint16Array(16),
    },
    {
      state: 1,
      vanishTime: 0,
      x: 15,
      y: 25,
      spriteNum: 82,
      triggerScript: 100,
      autoScript: 200,
      layer: 0,
      triggerMode: 0,
      raw: new Uint16Array(16),
    },
  ]

  const fakeScenes: Scene[] = [
    { mapNum: 0, scriptOnEnter: 0, scriptOnTeleport: 0, eventObjectIndex: 0, raw: new Uint16Array(4) },
    { mapNum: 12, scriptOnEnter: 5, scriptOnTeleport: 0, eventObjectIndex: 0, raw: new Uint16Array(4) },
    { mapNum: 13, scriptOnEnter: 0, scriptOnTeleport: 0, eventObjectIndex: 2, raw: new Uint16Array(4) },
  ]

  it('scene 1 含两个 NPC', () => {
    const result = dumpScene(1, fakeScenes, fakeEventObjects)
    expect(result.sceneId).toBe(1)
    expect(result.mapNum).toBe(12)
    expect(result.onEnterLabel).toBe('L_5')
    expect(result.eventObjects).toHaveLength(2)
    expect(result.eventObjects[0]).toEqual({
      id: 0,
      x: 10,
      y: 20,
      spriteNum: 78,
      triggerLabel: 'L_59',
      autoLabel: undefined,
    })
    expect(result.eventObjects[1]?.triggerLabel).toBe('L_100')
    expect(result.eventObjects[1]?.autoLabel).toBe('L_200')
  })

  it('triggerScript=0 → triggerLabel undefined', () => {
    const eos: EventObject[] = [
      // biome-ignore lint/style/noNonNullAssertion: fakeEventObjects[0] is defined above
      { ...fakeEventObjects[0]!, triggerScript: 0, autoScript: 0 },
    ]
    const result = dumpScene(1, fakeScenes, eos)
    expect(result.eventObjects[0]?.triggerLabel).toBeUndefined()
    expect(result.eventObjects[0]?.autoLabel).toBeUndefined()
  })

  it('末场景兜底:sceneId = scenes.length - 1 → toIdx = eventObjects.length', () => {
    const result = dumpScene(2, fakeScenes, fakeEventObjects)
    expect(result.sceneId).toBe(2)
    expect(result.mapNum).toBe(13)
    // scene[2].eventObjectIndex=2,末场景兜底走 eventObjects.length=2 → 0 个对象
    expect(result.eventObjects).toHaveLength(0)
  })
})
