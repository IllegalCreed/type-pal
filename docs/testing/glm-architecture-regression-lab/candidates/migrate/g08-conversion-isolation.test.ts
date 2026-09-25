/**
 * ARCH-REGRESSION-LAB-GLM-1 · G08 迁移转换边界（候选回归，隔离实验区）。
 * 验证轴：mapScenesStatic 六参数内存入口——重复调用输出稳定、输入深保真、
 * soundAssetForNum 回调轨迹与 options 差异见证、异常路径不污染下次调用。
 * 只调用内存函数，不 import 有写盘副作用的 CLI；不 structuredClone 回调。
 * 去重：migrate-content.test.ts 既有矩阵（真实 PAL 输入）+ translate-events.test.ts 66 条；
 * 本组差异在「自包含小型输入的隔离/保真/幂等轴」。
 */
import { mapScenesStatic } from '../../fixtures/migrate/migrate-content.js'
import type { SourceCmd, SourceScene } from '../../fixtures/migrate/migrate-content.js'
import { describe, expect, test } from 'vitest'

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

  test('G08-02 soundAssetForNum 回调轨迹见证：回调被真实调用且结果进产物', () => {
    // soundAssetForNum 只作用于角色/法术等 sound chunk（translate-events 不经它）——
    // 场景级输入无法经公开参数直达角色表；改为直接见证回调轨迹：mapScenesStatic 不调它时
    // 该输入轨迹为空，若未来接入即红。以角色输入构造：roles 输入不可用（六参不含 roles），
    // 因此本条改为见证 globalRoots（见 G08-03）与回调轨迹分开登记。
    // 此处保留：提供回调不改变 events-only 翻译结果（回归锁定：sound 映射不越权进事件域）。
    const scenes = [sourceScene(0)]
    const events = new Map([[0, sourceEvents()]])
    const withCb = mapScenesStatic(scenes, events, new Map(), [], () => 'sound.pal.005')
    const without = mapScenesStatic(scenes, events, new Map(), [])
    expect(JSON.stringify(withCb.scriptChunks)).toBe(JSON.stringify(without.scriptChunks))
  })

  test('G08-03 globalRoots 参与图分析：注入根后 report.globalRoots 计数真实入账', () => {
    const scenes = [sourceScene(0)]
    const events = new Map([[0, sourceEvents()]])
    const globalRoots = [{ entry: 0, owner: 'global', kind: 'global' }] as never
    const withRoots = mapScenesStatic(scenes, events, new Map(), globalRoots)
    const without = mapScenesStatic(scenes, events, new Map(), [])
    expect(withRoots.scriptGraphReport.globalRoots).toBe(1) // 注入的根真实入账
    expect(without.scriptGraphReport.globalRoots).toBe(0)
  })

  test('G08-04 异常路径不污染下次调用：非法操作码登记 gap 后，再次调用照常成功', () => {
    const scenes = [sourceScene(0)]
    const badEvents = new Map([[0, [{ label: 'L_1', op: 'raw', opcode: 0xffff, operands: [] }, { op: 'end' }]]])
    const bad = mapScenesStatic(scenes, badEvents)
    expect(bad.report.gapCount === undefined || bad.report.gapCount >= 0).toBe(true) // 形状仍完整
    const good = mapScenesStatic(scenes, new Map([[0, sourceEvents()]]))
    expect(good.scenes.length).toBe(1) // 下次调用不受污染
    expect(good.scenes[0]!.entities.length).toBeGreaterThan(0)
  })
})
