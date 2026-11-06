/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R16（reforge/battle/settlement.ts）。
 * 该文件此前无任何测试（presentation 类已有测试，不重复）。合同：buildSettlementScreens
 * 原版屏序（exp-cash → 升级者[升级屏→隐藏提升→习得]→未升级者隐藏提升收尾）、空报告空屏、
 * drawSettlementScreen 的 exp-cash 居中双卷轴逐字段（文字/数字/坐标手算）与 hidden-up 文本。
 */

import type { HiddenUpReport, LevelUpReport } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import {
  drawHost,
  glyphTable,
  image,
  menuAssets,
  stubDocumentCanvas,
} from '../__tests__/glm-runtime-resource/menu-draw-fixtures.js'
import { buildSettlementScreens, drawSettlementScreen } from './settlement.js'

const textCalls = vi.hoisted(() =>
  vi.fn<typeof import('../text/text-render.js').renderSpans>(() => 0),
)
vi.mock('../text/text-render.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../text/text-render.js')>()),
  renderSpans: textCalls,
}))

const lu = (over: Partial<LevelUpReport>): LevelUpReport => ({
  characterId: 'li-xiaoyao',
  from: 1,
  to: 2,
  learned: [],
  before: {
    level: 1,
    hp: 100,
    maxHP: 100,
    mp: 30,
    maxMP: 30,
    attack: 33,
    magicAttack: 20,
    defense: 32,
    speed: 28,
    luck: 32,
  },
  after: {
    level: 2,
    hp: 120,
    maxHP: 120,
    mp: 36,
    maxMP: 36,
    attack: 36,
    magicAttack: 22,
    defense: 34,
    speed: 30,
    luck: 33,
  },
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
    expect(
      buildSettlementScreens(
        0,
        0,
        [],
        [],
        (id) => id,
        (id) => id,
      ),
    ).toEqual([])
    const screens = buildSettlementScreens(
      0,
      0,
      [],
      [hu('b', 'speed', 3)],
      (id) => id,
      (id) => id,
    )
    expect(screens).toEqual([{ kind: 'hidden-up', name: 'b', statLabel: '身法', delta: 3 }])
  })
})

function drawReward(exp: number, cash: number) {
  const host = drawHost()
  stubDocumentCanvas(host)
  textCalls.mockClear()
  const menu = menuAssets()
  // 与引擎卷轴的实际尺寸一致。黄色 1 比其余数字窄一像素。
  const columns = [8, 16, 8]
  const rows = [4, 26, 4]
  menu.scroll.tiles = rows.flatMap((height, row) =>
    columns.map((width, col) => image(`scroll-${row}-${col}`, width, height)),
  )
  menu.nums[1] = image('n-1', 5, 8)

  drawSettlementScreen(host.ctx, { kind: 'exp-cash', exp, cash }, menu, glyphTable())

  const labels = textCalls.mock.calls.map(([, spans, x, y, opts]) => ({
    text: spans.map((span) => span.text).join(''),
    x,
    y,
    color: opts.forceRgba,
    shadow: opts.shadow,
  }))
  const digits = host.drawImage.mock.calls.flatMap(([sprite, x, y]) => {
    const digit = menu.nums.indexOf(sprite)
    return digit < 0 ? [] : [[digit, x, y]]
  })
  const topLeft = menu.scroll.tiles[0]
  const topRight = menu.scroll.tiles[2]
  const corners = host.drawImage.mock.calls
    .filter(([sprite]) => sprite === topLeft || sprite === topRight)
    .map(([, x, y]) => [x, y])
  return { labels, digits, corners }
}

describe('R16 drawSettlementScreen 居中卷轴', () => {
  test('奖励标签深色无影，经验右对齐、钱数居中，六位数保留间距', () => {
    const single = drawReward(2, 0)
    expect(single.digits).toEqual([
      [2, 212, 73],
      [0, 181, 119],
    ])
    expect(single.labels).toEqual([
      { text: '获得经验值', x: 102, y: 69, color: [0, 0, 0], shadow: false },
      { text: '打败敌人得', x: 83, y: 115, color: [0, 0, 0], shadow: false },
      { text: '文钱', x: 205, y: 115, color: [0, 0, 0], shadow: false },
    ])
    expect(single.corners).toEqual([
      [88, 60],
      [224, 60],
      [64, 106],
      [248, 106],
    ])

    // 原盘每个敌人的奖励是 WORD。一场五敌可达到 327675。
    const large = drawReward(327_675, 123_456)
    expect(large.digits).toEqual([
      [3, 185, 73],
      [2, 191, 73],
      [7, 197, 73],
      [6, 203, 73],
      [7, 209, 73],
      [5, 215, 73],
      [1, 167, 119],
      [2, 172, 119],
      [3, 178, 119],
      [4, 184, 119],
      [5, 190, 119],
      [6, 196, 119],
    ])
    expect(large.labels.map(({ x }) => x)).toEqual([99, 81, 208])
    expect(large.corners).toEqual([
      [80, 60],
      [232, 60],
      [64, 106],
      [248, 106],
    ])
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
    const texts = textCalls.mock.calls.map((c: unknown[]) => (c[1] as { text: string }[])[0]!.text)
    expect(texts).toEqual(['李逍遥吉运提升'])
  })
})
