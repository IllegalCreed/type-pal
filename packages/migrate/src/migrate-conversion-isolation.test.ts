/**
 * ARCH-REGRESSION-LAB-GLM-1 · G08 迁移转换边界（正式转换隔离回归）。
 * 验证轴：mapScenesStatic 六参数内存入口——重复调用输出稳定、输入深保真、
 * soundAssetForNum 回调**真实被调用**（raw 0x47 playSound 经 translate-events.ts:1597
 * resolveSoundAsset 走 ctx.soundAssetForNum）且主动塑造输出、缺省路径回 palSoundAssetId、
 * 非法操作码登记 gap 不抛（gap kind 与源 legacyId 见证）后下次调用照常成功。
 * 只调用内存函数，不 import 有写盘副作用的 CLI；不 structuredClone 回调。
 * 去重：migrate-content.test.ts 既有矩阵（真实 PAL 输入）+ translate-events.test.ts 66 条；
 * 本组差异在「自包含小型输入的隔离/保真/幂等轴」。
 */

import { describe, expect, test, vi } from 'vitest'
import { mapScenesStatic, type SourceScene } from './migrate-content.js'
import type { SourceCmd } from './source-facts.js'

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

  test('G08-05 非法 options 预检拒绝：抛错含 636 且拒绝后可重试（预检层，非转换中段异常）', () => {
    // 与 G08-04 的「gap 不抛」相区分：worldSpriteFrameCounts ≠ 636 项在输入**预检层**即抛出
    // （migrate-content.ts:2157-2158 assertPalWorldSpriteLayoutOverlaySources），尚未进入转换；
    // 本例只证预检拒绝 + 拒绝后同输入可重试，不宣称转换中段异常隔离
    const scenes = [sourceScene(0)]
    const badOptions = { worldSpriteFrameCounts: [1, 2, 3] }
    expect(() =>
      mapScenesStatic(scenes, new Map([[0, sourceEvents()]]), new Map(), [], undefined, badOptions),
    ).toThrowError(/636/)
    // 预检拒绝后可重试：同一输入不带坏 options 再跑，照常成功；不证明转换中段回滚
    const good = mapScenesStatic(scenes, new Map([[0, sourceEvents()]]))
    expect(good.scenes.length).toBe(1)
    expect(good.scenes[0]!.entities.length).toBeGreaterThan(0)
  })

  test('G08-06 globalRoots 进入可达图：根地址 owner=global、可达性随根存在变化（非计数回显）', () => {
    // 真实可达图结果：-2 表（all.json 全局事件表，地址=索引）提供图地址空间；
    // 全局根 {entry:3} 独占地址 3（场景根只达地址 1，'end' 终结不再外溢）。
    // 断言 ownership 的 global/unreachable 随根存在翻转 —— 若图根忽略 globalRoots
    //（migrate-content.ts:2305 [...graphRoots] 反控变异），ownership 维持无根形态 → 本例红。
    const scenes = [sourceScene(0)]
    const globalTable: SourceCmd[] = [
      { op: 'end' },
      { label: 'L_1', op: 'end' },
      { label: 'L_2', op: 'raw', opcode: 0x49, operands: [1, 0] },
      { op: 'end' },
    ]
    const events = new Map<number, readonly SourceCmd[]>([
      [0, sourceEvents()],
      [-2, globalTable],
    ])
    const without = mapScenesStatic(scenes, events)
    expect(without.scriptGraphReport.commands).toBe(4) // 图地址空间来自 -2 表
    expect(without.scriptGraphReport.roots).toBe(1) // 仅场景根（triggerLabel L_1）
    expect(without.scriptGraphReport.ownership).toEqual({
      scene: 1,
      shared: 0,
      global: 0,
      unreachable: 3,
    })
    const withRoot = mapScenesStatic(scenes, events, new Map(), [
      { entry: 3, owner: 'global/item', kind: 'global' },
    ])
    // 全局根真实进入图根集合：地址 3 的 owner 变为 global/item → global 0→1、unreachable 3→2
    expect(withRoot.scriptGraphReport.roots).toBe(2)
    expect(withRoot.scriptGraphReport.ownership).toEqual({
      scene: 1,
      shared: 0,
      global: 1,
      unreachable: 2,
    })
    // 场景实体不受影响（根只进图分析）
    expect(withRoot.scenes).toEqual(without.scenes)
  })

  test('G08-07 转换中段真异常：缺布局证据中段抛出；修复后断言实际 setActorSprite 输出与资源身份，并与新鲜正确运行全量对照', () => {
    // 与 G08-05（输入预检层）相区分：raw 0x65（换角色大世界精灵）经 translate-events.ts:1624
    // 走 spriteIdForNum → migrate-content.ts resolveSpriteIdForNum 在**转换中段**抛出
    // 「sprite 42 缺布局证据；禁止从脚本资源号猜布局」。
    // 输出断言落在真实业务产物：chunk 内 setActorSprite 命令（actor/sprite 身份）+ SpriteDef
    // 注册身份；并与一次**独立构造的新鲜正确运行**做全量 deep-equal 对照 ——
    // 若成功路径吞掉命令（如 translate-events.ts:1625 push 被置空的丢输出反控），本例即红。
    const buildInputs = () => {
      const scene = sourceScene(0)
      scene.eventObjects.push({ id: 2, x: 96, y: 48, spriteNum: 42, sState: 0, sLayer: -2 })
      const spriteEvents: SourceCmd[] = [
        { label: 'L_1', op: 'raw', opcode: 0x65, operands: [0, 42] },
        { op: 'end' },
      ]
      return {
        scenes: [scene],
        events: new Map([[0, spriteEvents]]),
      }
    }
    // 先在失败发生前运行独立合法正控，避免两份“失败之后”输出共享污染而伪等价。
    const referenceInputs = buildInputs()
    const referenceBefore = structuredClone(referenceInputs)
    const reference = mapScenesStatic(referenceInputs.scenes, referenceInputs.events)
    expect(referenceInputs).toEqual(referenceBefore)
    // ① 失败路径：无 sprite 42 布局证据 → 中段抛出（预检已通过）
    const missing = buildInputs()
    delete (missing.scenes[0]!.eventObjects[2] as { spriteNum?: number }).spriteNum
    const missingBefore = structuredClone(missing)
    let message = ''
    try {
      mapScenesStatic(missing.scenes, missing.events)
    } catch (error) {
      message = error instanceof Error ? error.message : String(error)
    }
    expect(message).toContain('sprite 42 缺布局证据')
    expect(missing).toEqual(missingBefore) // 抛出前后输入深保真
    // ② 修复路径（独立构造，不复用失败输入引用）
    const fixed = buildInputs()
    const fixedBefore = JSON.stringify([fixed.scenes, [...fixed.events.entries()]])
    const good = mapScenesStatic(fixed.scenes, fixed.events)
    expect(JSON.stringify([fixed.scenes, [...fixed.events.entries()]])).toBe(fixedBefore)
    // 实际 setActorSprite 输出与稳定资源身份
    const triggerBody = good.scriptChunks['scene/s000']?.scripts[
      'scene/s000/root/entity-e1/page-0/trigger/stage-0'
    ] as unknown
    expect(triggerBody).toEqual([
      { kind: 'setActorSprite', actor: 'li-xiaoyao', sprite: 'sprite-42' },
    ])
    const spriteDef = good.sprites.find((s) => s.id === 'sprite-42')
    expect(spriteDef).toMatchObject({ id: 'sprite-42', asset: 'sprite.pal.042' })
    // 实体也引用同一稳定 id（资源身份一致）
    expect(good.scenes[0]!.entities.find((e) => e.id === 'e2')).toMatchObject({
      sprite: 'sprite-42',
    })
    // ③ 与失败前的独立合法运行比较全部输出，含报告和脚本注册信息。
    expect(good).toEqual(reference)
  })
})
