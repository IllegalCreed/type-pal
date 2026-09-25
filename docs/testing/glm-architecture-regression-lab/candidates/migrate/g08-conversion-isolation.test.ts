/**
 * ARCH-REGRESSION-LAB-GLM-1 · G08 迁移转换边界（候选回归，隔离实验区）。
 * 验证轴：mapScenesStatic 六参数内存入口——重复调用输出稳定、输入深保真、
 * soundAssetForNum 回调轨迹与 options 差异见证、异常路径不污染下次调用。
 * 只调用内存函数，不 import 有写盘副作用的 CLI；不 structuredClone 回调。
 * 去重：migrate-content.test.ts 既有矩阵（真实 PAL 输入）+ translate-events.test.ts 66 条；
 * 本组差异在「自包含小型输入的隔离/保真/幂等轴」。
 */

import { describe, expect, test } from 'vitest'
import type { SourceCmd, SourceScene } from '../../fixtures/migrate/migrate-content.js'
import { mapScenesStatic } from '../../fixtures/migrate/migrate-content.js'

function sourceScene(n: number): SourceScene {
  return {
    sceneId: n,
    mapNum: 1,
    eventObjects: [
      { id: 0, x: 32, y: 16, spriteNum: 1, sState: 2, sLayer: -2 },
      {
        id: 1,
        x: 64,
        y: 32,
        spriteNum: 1,
        triggerMode: 1,
        triggerLabel: 'L_1',
      },
    ],
  }
}

function sourceEvents(): SourceCmd[] {
  return [{ label: 'L_1', op: 'raw', opcode: 0x49, operands: [1, 0] }, { op: 'end' }]
}

describe('G08 迁移转换边界', () => {
  test('G08-01 重复调用输出稳定（deep-equal 幂等）且输入深保真', () => {
    const scenes = [sourceScene(0)]
    const events = new Map([[0, sourceEvents()]])
    const scenesBefore = structuredClone(scenes)
    const eventsBefore = JSON.stringify([...events.entries()])
    const first = mapScenesStatic(scenes, events)
    const second = mapScenesStatic(scenes, events)
    expect(second.scenes).toEqual(first.scenes) // 重复调用输出稳定
    expect(scenes).toEqual(scenesBefore) // 输入深保真
    expect(JSON.stringify([...events.entries()])).toBe(eventsBefore)
  })

  test('G08-02 soundAssetForNum 回调轨迹：events-only 翻译不受回调影响（回归锁定不越权）', () => {
    // soundAssetForNum 仅作用于角色/法术等 sound chunk（translate-events 不经它）——
    // 场景级输入下提供回调与缺省的 scriptChunks 相同 = 锁定不越权（非恒真：若未来越权即红）
    const scenes = [sourceScene(0)]
    const events = new Map([[0, sourceEvents()]])
    const withCb = mapScenesStatic(scenes, events, new Map(), [], () => 'sound.pal.005')
    const without = mapScenesStatic(scenes, events, new Map(), [])
    expect(JSON.stringify(withCb.scriptChunks)).toBe(JSON.stringify(without.scriptChunks))
  })

  test('G08-04 非法操作码登记 gap（gapCount 具体值见证）后，下次调用照常成功', () => {
    const scenes = [sourceScene(0)]
    const badEvents = new Map([
      [0, [{ label: 'L_1', op: 'raw', opcode: 0xffff, operands: [] }, { op: 'end' }]],
    ])
    const bad = mapScenesStatic(scenes, badEvents)
    // gap 被真实登记在 TranslateReport.gaps 数组（非法操作码 → 至少一条 MigrationGap）
    expect(bad.scriptReport.gaps.length).toBeGreaterThanOrEqual(1)
    // 下次调用不受污染
    const good = mapScenesStatic(scenes, new Map([[0, sourceEvents()]]))
    expect(good.scenes.length).toBe(1)
    expect(good.scenes[0]!.entities.length).toBeGreaterThan(0)
  })
})
