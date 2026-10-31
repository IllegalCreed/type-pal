/** Native scene slices, global object ranges, labels and input ownership; supplemental authored objects are covered separately. */
import { describe, expect, it, test } from 'vitest'
import { sceneFixture } from './__tests__/scene-fixtures.js'
import { dumpAllEventObjects, dumpScene } from './scene.js'

describe('native scene slices and labels', () => {
  const sceneSliceFixture = () =>
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

  const sliceFixture = () =>
    sceneFixture(
      [
        [7, 0, 903, 0],
        [8, 0, 0, 2],
      ],
      [
        [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 59, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      ],
    )

  it('scene 1 含两个 NPC', () => {
    const { scenes, eventObjects } = sceneSliceFixture()
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
    const { scenes, eventObjects } = sceneSliceFixture()
    expect(dumpScene(2, scenes, eventObjects)).toEqual({
      sceneId: 2,
      mapNum: 13,
      onEnterLabel: undefined,
      onTeleportLabel: undefined,
      eventObjects: [],
    })
  })

  test('入口 0：sceneId=0 从 0 切片；onEnter=0 → undefined；onTeleport 非 0 → L_ip', () => {
    const { scenes, eventObjects: objects } = sliceFixture()
    const result = dumpScene(0, scenes, objects)
    expect(result.sceneId).toBe(0)
    expect(result.mapNum).toBe(7)
    expect(result.onEnterLabel).toBeUndefined()
    expect(result.onTeleportLabel).toBe('L_903')
    expect(result.eventObjects.map((o) => o.id)).toEqual([0, 1])
  })

  test('末场景非零起点：区间 [2,4)，全局 id 保留为 2/3', () => {
    const { scenes, eventObjects: objects } = sliceFixture()
    const result = dumpScene(1, scenes, objects)
    expect(result.eventObjects.map(({ id, x, triggerLabel }) => ({ id, x, triggerLabel }))).toEqual(
      [
        { id: 2, x: 3, triggerLabel: undefined },
        { id: 3, x: 0, triggerLabel: 'L_59' },
      ],
    )
  })

  test('未知 sceneId 抛错并带 scenes.length', () => {
    const { scenes, eventObjects: objects } = sliceFixture()
    expect(() => dumpScene(9, scenes, objects)).toThrow('scenes.length=2')
  })
})

describe('global object ranges and input ownership', () => {
  const globalFixture = () =>
    sceneFixture(
      [
        [1, 0, 0, 0],
        [2, 0, 0, 2],
        [3, 0, 0, 3],
      ],
      [
        [0, 1, 0, 0, 0, 0, 0, 0, 10, 0, 0, 0, 0, 0, 0, 0],
        [0, 2, 0, 0, 0, 0, 0, 0, 20, 0, 0, 0, 0, 0, 0, 0],
        [0, 3, 0, 0, 0, 0, 0, 0, 30, 0, 0, 0, 0, 0, 0, 0],
      ],
    )

  test('全局 id = eventObjects 下标；每景区间 [start,end)，末景兜底 eventObjects.length', () => {
    const { scenes, eventObjects: objects } = globalFixture()
    const file = dumpAllEventObjects(scenes, objects)
    expect(file.eventObjects.map((o) => o.id)).toEqual([0, 1, 2])
    expect(file.eventObjects.map((o) => o.x)).toEqual([1, 2, 3])
    expect(file.sceneRanges).toEqual({ 0: [0, 2], 1: [2, 3], 2: [3, 3] })
  })

  test('scenes/objects 输入零突变（structuredClone 前后相等）', () => {
    const { scenes, eventObjects: objects } = globalFixture()
    const beforeScenes = structuredClone(scenes)
    const beforeObjects = structuredClone(objects)
    dumpAllEventObjects(scenes, objects)
    expect(scenes).toEqual(beforeScenes)
    expect(objects).toEqual(beforeObjects)
  })
})
