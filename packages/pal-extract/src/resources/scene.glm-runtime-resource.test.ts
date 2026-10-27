/** 全局对象表、非零场景起点、入口/错误与只读输入；每例从真实SSS parser取得fresh视图。 */
import { describe, expect, test } from 'vitest'
import { sceneFixture } from './__tests__/scene-fixtures.js'
import { dumpAllEventObjects, dumpScene } from './scene.js'

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

describe('R04 dumpAllEventObjects 全局表', () => {
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

describe('R04 dumpScene 未占用切片轴', () => {
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
