import { describe, expect, it } from 'vitest'
import { sceneFixture } from './__tests__/scene-fixtures.js'
import { dumpScene } from './scene.js'

const fixture = () =>
  sceneFixture(
    [
      [0, 0, 0, 0],
      [12, 5, 0, 0],
      [13, 0, 0, 2],
    ],
    [
      [3, 10, 20, -2, 59, 0, 1, 4, 78, 3, 2, 1, 4, 0, 3, 5],
      [0, 15, 25, 0, 100, 200, 1, 0, 82, 0, 0, 0, 0, 0, 0, 0],
    ],
  )

describe('dumpScene', () => {
  it('scene 1 含两个 NPC', () => {
    const { scenes, eventObjects } = fixture()
    expect(dumpScene(1, scenes, eventObjects)).toEqual({
      sceneId: 1,
      mapNum: 12,
      onEnterLabel: 'L_5',
      onTeleportLabel: undefined,
      eventObjects: [
        {
          id: 0,
          x: 10,
          y: 20,
          spriteNum: 78,
          triggerLabel: 'L_59',
          autoLabel: undefined,
          triggerMode: 4,
          sState: 1,
          sLayer: -2,
          vanishTime: 3,
          nSpriteFrames: 3,
          direction: 2,
          currentFrameNum: 1,
          scriptIdleFrame: 4,
          spritePtrOffset: 0,
          nSpriteFramesAuto: 3,
          scriptIdleFrameCountAuto: 5,
        },
        {
          id: 1,
          x: 15,
          y: 25,
          spriteNum: 82,
          triggerLabel: 'L_100',
          autoLabel: 'L_200',
          triggerMode: 0,
          sState: 1,
          sLayer: 0,
          vanishTime: 0,
          nSpriteFrames: 0,
          direction: 0,
          currentFrameNum: 0,
          scriptIdleFrame: 0,
          spritePtrOffset: 0,
          nSpriteFramesAuto: 0,
          scriptIdleFrameCountAuto: 0,
        },
      ],
    })
  })

  it('triggerScript=0 → triggerLabel undefined', () => {
    const { scenes, eventObjects } = sceneFixture(
      [
        [0, 0, 0, 0],
        [12, 5, 0, 0],
        [13, 0, 0, 1],
      ],
      [[0, 10, 20, 0, 0, 0, 1, 0, 78, 0, 0, 0, 0, 0, 0, 0]],
    )
    const result = dumpScene(1, scenes, eventObjects)
    expect(result.eventObjects[0]?.triggerLabel).toBeUndefined()
    expect(result.eventObjects[0]?.autoLabel).toBeUndefined()
  })

  it('末场景兜底:sceneId = scenes.length - 1 → toIdx = eventObjects.length', () => {
    const { scenes, eventObjects } = fixture()
    expect(dumpScene(2, scenes, eventObjects)).toEqual({
      sceneId: 2,
      mapNum: 13,
      onEnterLabel: undefined,
      onTeleportLabel: undefined,
      eventObjects: [],
    })
  })
})
