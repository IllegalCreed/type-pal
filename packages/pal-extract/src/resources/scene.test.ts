import { describe, expect, it } from 'vitest'
import type { EventObject, Scene } from '../io/sss.js'
import { dumpScene } from './scene.js'

// sdlpal EVENTOBJECT 后 7 字段默认 0(zero-init struct);测试只关心前 9 字段。
const ZERO_TAIL = {
  nSpriteFrames: 0,
  direction: 0,
  currentFrameNum: 0,
  scriptIdleFrame: 0,
  spritePtrOffset: 0,
  nSpriteFramesAuto: 0,
  scriptIdleFrameCountAuto: 0,
}

describe('dumpScene', () => {
  const fakeEventObjects: EventObject[] = [
    {
      ...ZERO_TAIL,
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
      ...ZERO_TAIL,
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
      triggerMode: 0,
      sState: 1,
      sLayer: 0,
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

describe('dumpScene triggerMode 字段(M3.5)', () => {
  const fakeScenes: Scene[] = [
    { mapNum: 0, scriptOnEnter: 0, scriptOnTeleport: 0, eventObjectIndex: 0, raw: new Uint16Array(4) },
    { mapNum: 12, scriptOnEnter: 0, scriptOnTeleport: 0, eventObjectIndex: 0, raw: new Uint16Array(4) },
    { mapNum: 13, scriptOnEnter: 0, scriptOnTeleport: 0, eventObjectIndex: 1, raw: new Uint16Array(4) },
  ]

  it('SceneEventObject dump 含 triggerMode raw u16', () => {
    const fakeEventObjects: EventObject[] = [
      {
        ...ZERO_TAIL,
        state: 1,
        vanishTime: 0,
        x: 10,
        y: 20,
        spriteNum: 78,
        triggerScript: 59,
        autoScript: 0,
        layer: 0,
        triggerMode: 4,
        raw: new Uint16Array(16),
      },
    ]
    const result = dumpScene(1, fakeScenes, fakeEventObjects)
    expect(result.eventObjects[0]?.triggerMode).toBe(4)
  })

  it('triggerMode=0 正确 dump(不是 undefined)', () => {
    const fakeEventObjects: EventObject[] = [
      {
        ...ZERO_TAIL,
        state: 1,
        vanishTime: 0,
        x: 10,
        y: 20,
        spriteNum: 78,
        triggerScript: 0,
        autoScript: 0,
        layer: 0,
        triggerMode: 0,
        raw: new Uint16Array(16),
      },
    ]
    const result = dumpScene(1, fakeScenes, fakeEventObjects)
    expect(result.eventObjects[0]?.triggerMode).toBe(0)
  })
})
