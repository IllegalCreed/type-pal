/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R16（reforge/battle/settlement.ts）。
 * 该文件此前无任何测试（presentation 类已有测试，不重复）。合同：buildSettlementScreens
 * 原版屏序（exp-cash → 升级者[升级屏→隐藏提升→习得]→未升级者隐藏提升收尾）、空报告空屏、
 * drawSettlementScreen 的 exp-cash 居中双卷轴逐字段（文字/数字/坐标手算）与 hidden-up 文本。
 */
import { describe, expect, test, vi } from 'vitest'
import type { LevelUpReport, HiddenUpReport } from '@type-pal/content'
import { buildSettlementScreens, drawSettlementScreen } from './settlement.js'
import {
  drawHost,
  glyphTable,
  menuAssets,
  stubDocumentCanvas,
} from '../__tests__/glm-runtime-resource/menu-draw-fixtures.js'

const textCalls = vi.hoisted(() => vi.fn())
vi.mock('../text/text-render.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../text/text-render.js')>()
  return {
    ...actual,
    renderSpans: (...args: unknown[]) => {
      textCalls(...args)
      return 0
    },
  }
})

const lu = (over: Partial<LevelUpReport>): LevelUpReport => ({
  characterId: 'li-xiaoyao',
  from: 1,
  to: 2,
  learned: [],
  before: { level: 1, hp: 100, maxHP: 100, mp: 30, maxMP: 30, attack: 33, magicAttack: 20, defense: 32, speed: 28, luck: 32 },
  after: { level: 2, hp: 120, maxHP: 120, mp: 36, maxMP: 36, attack: 36, magicAttack: 22, defense: 34, speed: 30, luck: 33 },
  ...over,
})
const hu = (characterId: string, stat: HiddenUpReport['stat'], delta: number): HiddenUpReport => ({
  characterId,
  stat,
  delta,
})

describe('R16 buildSettlementScreens 屏序', () => {
  test('exp-cash → 升级者（升级 → 其隐藏 → 其习得）→ 未升级者隐藏收尾', () => {
    const screens = buildSettlementScreens(
      15,
      100,
      [lu({ characterId: 'a', learned: ['s1'] })],
      [hu('a', 'luck', 1), hu('b', 'attack', 2)],
      (id) => `名${id}`,
      (id) => `术${id}`,
    )
    expect(screens.map((s) => s.kind)).toEqual([
      'exp-cash',
      'level-up',
      'hidden-up',
      'learn-magic',
      'hidden-up',
    ])
    expect(screens[0]).toEqual({ kind: 'exp-cash', exp: 15, cash: 100 })
    expect(screens[1]).toMatchObject({ kind: 'level-up', name: '名a' })
    expect(screens[2]).toEqual({ kind: 'hidden-up', name: '名a', statLabel: '吉运', delta: 1 })
    expect(screens[3]).toEqual({ kind: 'learn-magic', name: '名a', magicName: '术s1' })
    expect(screens[4]).toEqual({ kind: 'hidden-up', name: '名b', statLabel: '武术', delta: 2 })
  })

  test('零经验零现金零报告 → 空屏序列；隐藏提升不依赖升级独立成屏', () => {
    expect(buildSettlementScreens(0, 0, [], [], (id) => id, (id) => id)).toEqual([])
    const screens = buildSettlementScreens(0, 0, [], [hu('b', 'speed', 3)], (id) => id, (id) => id)
    expect(screens).toEqual([{ kind: 'hidden-up', name: 'b', statLabel: '身法', delta: 3 }])
  })
})

describe('R16 drawSettlementScreen exp-cash 居中双卷轴', () => {
  test('两卷轴垂直居中：文字 span 与黄色数字左对齐坐标逐项手算', () => {
    const h = drawHost()
    stubDocumentCanvas(h)
    textCalls.mockClear()
    const menu = menuAssets()
    // 手算：h=26、y0=round((200-(2*26+12))/2)=68；line1 内容 '获得经验值'(80)+num 5(6)+GAP4 → boxW=129、x=96、px=115
    drawSettlementScreen(h.ctx, { kind: 'exp-cash', exp: 5, cash: 10 }, menu, glyphTable())
    const spans = textCalls.mock.calls.map((c: unknown[]) => [
      (c[1] as { text: string }[])[0]!.text,
      c[2],
      c[3],
    ])
    expect(spans).toContainEqual(['获得经验值', 115, 73])
    expect(spans).toContainEqual(['打败敌人得', 94, 111])
    expect(spans).toContainEqual(['文钱', 194, 111])
    const digitCalls = h.drawImage.mock.calls
      .filter((c: unknown[]) => String((c[0] as { id: string }).id).startsWith('n-'))
      .map((c: unknown[]) => [String((c[0] as { id: string }).id).replace('n-', ''), c[1], c[2]])
    expect(digitCalls).toContainEqual(['5', 199, 77])
    expect(digitCalls).toContainEqual(['1', 178, 115])
    expect(digitCalls).toContainEqual(['0', 184, 115])
  })

  test('hidden-up 屏：名字 + 统计中文标签 + 增量', () => {
    const h = drawHost()
    stubDocumentCanvas(h)
    textCalls.mockClear()
    drawSettlementScreen(
      h.ctx,
      { kind: 'hidden-up', name: '李逍遥', statLabel: '吉运', delta: 2 },
      menuAssets(),
      glyphTable(),
    )
    const texts = textCalls.mock.calls.map(
      (c: unknown[]) => (c[1] as { text: string }[])[0]!.text,
    )
    expect(texts).toEqual(['李逍遥吉运提升'])
  })
})
