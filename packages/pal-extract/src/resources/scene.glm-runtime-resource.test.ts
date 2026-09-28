/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R04（pal-extract/resources/scene.ts）。
 * 去重账：scene.test 覆盖 dumpScene 基本字段/trigger0→undefined/末场景兜底/triggerMode。
 * 本文件只做未占用合同：dumpAllEventObjects（此前零覆盖：全局 id=下标、每景 [start,end)
 * 区间含末景兜底）、场景 0 入口、中间场景非零起点切片的全局 id 保留、onTeleportLabel、
 * 未知 sceneId 抛错、输入零突变。
 */
import { describe, expect, test } from 'vitest'
import type { EventObject, Scene } from '../io/sss.js'
import { dumpAllEventObjects, dumpScene } from './scene.js'

const ZERO_TAIL = {
  nSpriteFrames: 0,
  direction: 0,
  currentFrameNum: 0,
  scriptIdleFrame: 0,
  spritePtrOffset: 0,
  nSpriteFramesAuto: 0,
  scriptIdleFrameCountAuto: 0,
}

const eo = (over: Partial<EventObject>): EventObject => ({
  ...ZERO_TAIL,
  state: 0,
  vanishTime: 0,
  x: 0,
  y: 0,
  spriteNum: 0,
  triggerScript: 0,
  autoScript: 0,
  layer: 0,
  triggerMode: 0,
  raw: new Uint16Array(16),
  ...over,
})

const scene = (over: Partial<Scene>): Scene => ({
  mapNum: 0,
  scriptOnEnter: 0,
  scriptOnTeleport: 0,
  eventObjectIndex: 0,
  raw: new Uint16Array(4),
  ...over,
})

describe('R04 dumpAllEventObjects（此前零覆盖）', () => {
  const scenes = [
    scene({ mapNum: 1, eventObjectIndex: 0 }),
    scene({ mapNum: 2, eventObjectIndex: 2 }),
    scene({ mapNum: 3, eventObjectIndex: 3 }), // 末景
  ]
  const objects = [
    eo({ x: 1, spriteNum: 10 }),
    eo({ x: 2, spriteNum: 20 }),
    eo({ x: 3, spriteNum: 30 }),
  ]

  test('全局 id = eventObjects 下标；每景区间 [start,end)，末景兜底 eventObjects.length', () => {
    const file = dumpAllEventObjects(scenes, objects)
    expect(file.eventObjects.map((o) => o.id)).toEqual([0, 1, 2])
    expect(file.eventObjects.map((o) => o.x)).toEqual([1, 2, 3])
    expect(file.sceneRanges).toEqual({
      0: [0, 2],
      1: [2, 3],
      2: [3, 3], // 末景兜底 = length → 空区间
    })
  })

  test('scenes/objects 输入零突变（structuredClone 前后相等）', () => {
    const scenesClone = structuredClone(scenes)
    const objectsClone = structuredClone(objects)
    dumpAllEventObjects(scenes, objects)
    expect(scenes).toEqual(scenesClone)
    expect(objects).toEqual(objectsClone)
  })
})

describe('R04 dumpScene 未占用切片轴', () => {
  const scenes = [
    scene({ mapNum: 7, scriptOnEnter: 0, scriptOnTeleport: 903 }),
    scene({ mapNum: 8, eventObjectIndex: 2 }),
  ]
  const objects = [eo({ x: 1 }), eo({ x: 2 }), eo({ x: 3 }), eo({ triggerScript: 59 })]

  test('入口 0：sceneId=0 从 0 切片；onEnter=0 → undefined；onTeleport 非 0 → L_ip', () => {
    const result = dumpScene(0, scenes, objects)
    expect(result.sceneId).toBe(0)
    expect(result.mapNum).toBe(7)
    expect(result.onEnterLabel).toBeUndefined()
    expect(result.onTeleportLabel).toBe('L_903')
    expect(result.eventObjects.map((o) => o.id)).toEqual([0, 1])
  })

  test('中间场景非零起点：区间 [2,4)，全局 id 保留为 2/3', () => {
    const result = dumpScene(1, scenes, objects)
    expect(result.eventObjects).toHaveLength(2)
    expect(result.eventObjects[0]!.id).toBe(2)
    expect(result.eventObjects[0]!.x).toBe(3)
    expect(result.eventObjects[1]!.id).toBe(3)
    expect(result.eventObjects[1]!.triggerLabel).toBe('L_59')
  })

  test('未知 sceneId 抛错并带 scenes.length', () => {
    expect(() => dumpScene(9, scenes, objects)).toThrow('scenes.length=2')
  })
})
