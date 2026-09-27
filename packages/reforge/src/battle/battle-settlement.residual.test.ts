import type { HiddenUpReport, LevelUpReport, StatSnapshot } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import type { MenuAssets } from '../menu/menu-box.js'
import type { GlyphTable } from '../text/glyph.js'
import { buildSettlementScreens, drawSettlementScreen } from './settlement.js'

const textCalls = vi.hoisted(() => vi.fn())
const menuCalls = vi.hoisted(() => ({
  number: vi.fn(),
  scroll: vi.fn(),
  box: vi.fn(),
}))
vi.mock('../menu/menu-box.js', () => ({
  drawNumberLeft: (...args: unknown[]) => menuCalls.number(...args),
  drawScroll: (...args: unknown[]) => menuCalls.scroll(...args),
  drawSlicedBox: (...args: unknown[]) => menuCalls.box(...args),
}))
vi.mock('../text/text-render.js', () => ({
  measureSpans: (spans: Array<{ text: string }>) =>
    spans.reduce((width, span) => width + span.text.length * 8, 0),
  renderSpans: (
    ctx: unknown,
    spans: Array<{ text: string }>,
    x: number,
    y: number,
    opts: unknown,
  ) => {
    textCalls(ctx, spans, x, y, opts)
    return spans.reduce((width, span) => width + span.text.length * 8, 0)
  },
}))

const before: StatSnapshot = {
  level: 6,
  hp: 70,
  maxHP: 100,
  mp: 20,
  maxMP: 40,
  attack: 20,
  magicAttack: 18,
  defense: 16,
  speed: 14,
  luck: 10,
}
const after: StatSnapshot = {
  level: 7,
  hp: 110,
  maxHP: 110,
  mp: 48,
  maxMP: 48,
  attack: 25,
  magicAttack: 23,
  defense: 19,
  speed: 17,
  luck: 12,
}

function renderHost() {
  const bitmap = (width = 8, height = 8): ImageBitmap => ({ width, height }) as ImageBitmap
  const tile = bitmap()
  const tiles = { tiles: Array.from({ length: 9 }, () => tile) }
  const digits = Array.from({ length: 10 }, () => bitmap(6, 8))
  const slash = bitmap(3, 8)
  const arrow = bitmap(5, 8)
  const menu: MenuAssets = {
    box: tiles,
    statusBg: tile,
    equipSlot: tile,
    scroll: tiles,
    nums: digits,
    avatar: undefined,
    numsBlue: Array.from({ length: 10 }, () => bitmap(6, 8)),
    numsCyan: digits,
    slash,
    itemIcons: {},
    redBox: tiles,
    magicPlayerBox: tile,
    cursorGrid: tile,
    cursorUp: tile,
    cursorUpRed: tile,
    cursorDown: tile,
    settleArrow: arrow,
    battleIcons: [],
    itembox: tiles,
  }
  const drawImage = vi.fn()
  const ctx = {
    drawImage,
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
  } as unknown as CanvasRenderingContext2D
  const glyphs: GlyphTable = { has: () => false, get: () => undefined }
  textCalls.mockClear()
  menuCalls.number.mockClear()
  menuCalls.scroll.mockClear()
  menuCalls.box.mockClear()
  return { ctx, menu, glyphs, drawImage, slash, arrow }
}

function renderedTexts(): string[] {
  return textCalls.mock.calls.map((call) =>
    (call[1] as Array<{ text: string }>).map((span) => span.text).join(''),
  )
}

describe('当前战斗奖励的正式结算屏序列', () => {
  test('升级角色先显示属性与自己的隐藏成长，再显示习得；未升级者隐藏成长排在最后', () => {
    const levelUps: LevelUpReport[] = [
      {
        characterId: 'hero',
        from: 6,
        to: 7,
        learned: ['skill.heal', 'skill.guard'],
        before,
        after,
      },
      {
        characterId: 'ally',
        from: 9,
        to: 10,
        learned: [],
        before: { ...before, level: 9 },
        after: { ...after, level: 10 },
      },
    ]
    const hiddenUps: HiddenUpReport[] = [
      { characterId: 'reserve', stat: 'speed', delta: 1 },
      { characterId: 'hero', stat: 'defense', delta: 2 },
      { characterId: 'ally', stat: 'luck', delta: 1 },
    ]
    const levelBefore = structuredClone(levelUps)
    const hiddenBefore = structuredClone(hiddenUps)
    const names = new Map([
      ['hero', '逍遥'],
      ['ally', '灵儿'],
      ['reserve', '月如'],
    ])
    const skillNames = new Map([
      ['skill.heal', '气疗术'],
      ['skill.guard', '护体术'],
    ])
    const nameOf = vi.fn((id: string) => names.get(id) ?? `未知:${id}`)
    const skillNameOf = vi.fn((id: string) => skillNames.get(id) ?? `未知:${id}`)
    const screens = buildSettlementScreens(120, 35, levelUps, hiddenUps, nameOf, skillNameOf)
    expect(screens).toEqual([
      { kind: 'exp-cash', exp: 120, cash: 35 },
      { kind: 'level-up', name: '逍遥', report: levelUps[0] },
      { kind: 'hidden-up', name: '逍遥', statLabel: '防御', delta: 2 },
      { kind: 'learn-magic', name: '逍遥', magicName: '气疗术' },
      { kind: 'learn-magic', name: '逍遥', magicName: '护体术' },
      { kind: 'level-up', name: '灵儿', report: levelUps[1] },
      { kind: 'hidden-up', name: '灵儿', statLabel: '吉运', delta: 1 },
      { kind: 'hidden-up', name: '月如', statLabel: '身法', delta: 1 },
    ])
    const firstLevelScreen = screens[1]
    if (firstLevelScreen?.kind !== 'level-up') throw new Error('missing first level-up screen')
    expect(firstLevelScreen.report).toBe(levelUps[0])
    expect(levelUps).toEqual(levelBefore)
    expect(hiddenUps).toEqual(hiddenBefore)
  })

  test('只有未升级角色的隐藏成长时，仍逐项保留标签和名字；无经验不添空屏', () => {
    const hiddenUps: HiddenUpReport[] = [
      { characterId: 'hero', stat: 'maxHP', delta: 3 },
      { characterId: 'ally', stat: 'attack', delta: 1 },
    ]
    expect(
      buildSettlementScreens(
        0,
        0,
        [],
        hiddenUps,
        (id) => id,
        (id) => id,
      ),
    ).toEqual([
      { kind: 'hidden-up', name: 'hero', statLabel: '体力', delta: 3 },
      { kind: 'hidden-up', name: 'ally', statLabel: '武术', delta: 1 },
    ])
    expect(hiddenUps).toEqual([
      { characterId: 'hero', stat: 'maxHP', delta: 3 },
      { characterId: 'ally', stat: 'attack', delta: 1 },
    ])
  })

  test('四种真实结算屏按各自业务内容发出画框、数字与文字绘制命令', () => {
    const host = renderHost()
    const rep: LevelUpReport = {
      characterId: 'hero',
      from: 6,
      to: 7,
      learned: ['skill.heal'],
      before,
      after,
    }
    drawSettlementScreen(host.ctx, { kind: 'exp-cash', exp: 120, cash: 35 }, host.menu, host.glyphs)
    expect(renderedTexts()).toEqual(['获得经验值', '打败敌人得', '文钱'])
    expect(menuCalls.scroll).toHaveBeenCalledTimes(2)
    expect(menuCalls.number.mock.calls.map((call) => call[1])).toEqual([120, 35])

    textCalls.mockClear()
    host.drawImage.mockClear()
    drawSettlementScreen(
      host.ctx,
      { kind: 'level-up', name: '逍遥', report: rep },
      host.menu,
      host.glyphs,
    )
    expect(renderedTexts()).toEqual([
      '逍遥修行提升',
      '修行',
      '体力',
      '真气',
      '武术',
      '灵力',
      '防御',
      '身法',
      '吉运',
    ])
    expect(host.drawImage.mock.calls.filter(([image]) => image === host.arrow)).toHaveLength(8)
    expect(host.drawImage.mock.calls.filter(([image]) => image === host.slash)).toHaveLength(4)
    expect(menuCalls.box).toHaveBeenCalledOnce()

    textCalls.mockClear()
    host.drawImage.mockClear()
    drawSettlementScreen(
      host.ctx,
      { kind: 'hidden-up', name: '逍遥', statLabel: '防御', delta: 2 },
      host.menu,
      host.glyphs,
    )
    expect(renderedTexts()).toEqual(['逍遥防御提升'])
    expect(menuCalls.number.mock.calls.at(-1)?.[1]).toBe(2)

    textCalls.mockClear()
    host.drawImage.mockClear()
    drawSettlementScreen(
      host.ctx,
      { kind: 'learn-magic', name: '逍遥', magicName: '气疗术' },
      host.menu,
      host.glyphs,
    )
    expect(renderedTexts()).toEqual(['逍遥', '练成', '气疗术'])
    expect(menuCalls.scroll).toHaveBeenCalledTimes(5)
  })
})
