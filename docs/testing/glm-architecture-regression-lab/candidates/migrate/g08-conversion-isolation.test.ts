/**
 * ARCH-REGRESSION-LAB-GLM-1 · G08 迁移转换边界（候选回归，隔离实验区；r7 重写）。
 * 验证轴：mapScenesStatic 六参数内存入口——重复调用输出稳定、输入深保真、
 * soundAssetForNum 回调**真实被调用**（raw 0x47 playSound 经 translate-events.ts:1597
 * resolveSoundAsset 走 ctx.soundAssetForNum）且主动塑造输出、缺省路径回 palSoundAssetId、
 * 非法操作码登记 gap 不抛（gap kind 与源 legacyId 见证）后下次调用照常成功。
 * 只调用内存函数，不 import 有写盘副作用的 CLI；不 structuredClone 回调。
 * 去重：migrate-content.test.ts 既有矩阵（真实 PAL 输入）+ translate-events.test.ts 66 条；
 * 本组差异在「自包含小型输入的隔离/保真/幂等轴」。
 */

import { describe, expect, test, vi } from 'vitest'
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

/** 收集 scriptChunks 全部 playSound asset（结构化见证，不靠字符串 indexOf 单点）。 */
function playSoundAssets(chunks: Record<string, unknown>): string[] {
  const assets: string[] = []
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>
      if (record.kind === 'playSound' && typeof record.asset === 'string') assets.push(record.asset)
      Object.values(record).forEach(visit)
    }
  }
  Object.values(chunks).forEach(visit)
  return assets
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

  test('G08-02 soundAssetForNum 回调真实被调用（raw 0x47 playSound）且主动塑造输出', () => {
    const scenes = [sourceScene(0)]
    // 0x47 = playSound（translate-events.ts:1594-1597）：operand[0] 经 soundAssetForNum 解析
    const soundEvents: SourceCmd[] = [
      { label: 'L_1', op: 'raw', opcode: 0x47, operands: [5] },
      { op: 'end' },
    ]
    const events = new Map([[0, soundEvents]])
    const soundCb = vi.fn((num: number) => `sound.lab.${String(num).padStart(3, '0')}`)
    const withCb = mapScenesStatic(scenes, events, new Map(), [], soundCb)
    // 回调真实被调用，参数是源音效号 5（见证：不再是"传了但没人调"）
    expect(soundCb).toHaveBeenCalledWith(5)
    // 回调产物直接进入输出 chunk（回调主动塑造输出，非旁观）
    expect(playSoundAssets(withCb.scriptChunks)).toEqual(['sound.lab.005'])
    // 缺省路径：不传回调 → palSoundAssetId(5) 默认命名（回归锁定）
    const without = mapScenesStatic(scenes, events, new Map(), [])
    expect(playSoundAssets(without.scriptChunks)).toEqual(['sound.pal.005'])
  })

  test('G08-04 非法操作码登记 gap 不抛（gap 含源 legacyId 见证）后，下次调用照常成功', () => {
    const scenes = [sourceScene(0)]
    const badEvents = new Map([
      [0, [{ label: 'L_1', op: 'raw', opcode: 0xffff, operands: [] }, { op: 'end' }]],
    ])
    // 非法操作码的行为合同是「登记 gap、翻译继续」，不是抛异常
    let bad: ReturnType<typeof mapScenesStatic>
    expect(() => {
      bad = mapScenesStatic(scenes, badEvents)
    }).not.toThrow()
    // gap 被真实登记在 TranslateReport.gaps 数组，且携带源操作码见证
    expect(bad!.scriptReport.gaps.length).toBeGreaterThanOrEqual(1)
    expect(JSON.stringify(bad!.scriptReport.gaps)).toContain('65535')
    // 下次调用不受污染
    const good = mapScenesStatic(scenes, new Map([[0, sourceEvents()]]))
    expect(good.scenes.length).toBe(1)
    expect(good.scenes[0]!.entities.length).toBeGreaterThan(0)
  })
})
