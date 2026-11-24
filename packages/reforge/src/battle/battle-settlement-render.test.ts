import type { LevelUpReport } from '@type-pal/content'
import { afterEach, expect, test, vi } from 'vitest'
import {
  drawHost,
  glyphTable,
  image,
  menuAssets,
  stubDocumentCanvas,
} from '../__tests__/glm-runtime-resource/menu-draw-fixtures.js'
import { drawSettlementScreen, type SettlementScreen } from './settlement.js'

const renderText = vi.hoisted(() => vi.fn<typeof import('../text/text-render.js').renderSpans>())
vi.mock('../text/text-render.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../text/text-render.js')>()),
  renderSpans: renderText,
}))

afterEach(() => vi.unstubAllGlobals())

function render(screen: SettlementScreen) {
  const host = drawHost()
  stubDocumentCanvas(host)
  renderText.mockClear()
  const menu = menuAssets()
  const columns = [8, 16, 8]
  menu.scroll.tiles = [4, 26, 4].flatMap((height, row) =>
    columns.map((width, column) => image(`scroll-${row}-${column}`, width, height)),
  )
  menu.nums[1] = image('number-1', 5, 8)
  drawSettlementScreen(host.ctx, screen, menu, glyphTable())

  const labels = renderText.mock.calls.map(([, spans, x, y, options]) => ({
    text: spans.map(({ text }) => text).join(''),
    x,
    y,
    color: options.forceRgba,
    shadow: options.shadow,
  }))
  const positions = (sprites: readonly (ImageBitmap | undefined)[]) =>
    host.drawImage.mock.calls.flatMap(([sprite, x, y]) => {
      const index = sprites.indexOf(sprite)
      return index < 0 ? [] : [[index, x, y]]
    })
  return { labels, positions, menu }
}

test('奖励页右对齐经验、居中金钱，六位数扩展列宽', () => {
  const single = render({ kind: 'exp-cash', exp: 2, cash: 0 })
  expect(single.positions(single.menu.nums)).toEqual([
    [2, 212, 73],
    [0, 181, 119],
  ])
  expect(single.labels).toEqual([
    { text: '获得经验值', x: 102, y: 69, color: [0, 0, 0], shadow: false },
    { text: '打败敌人得', x: 83, y: 115, color: [0, 0, 0], shadow: false },
    { text: '文钱', x: 205, y: 115, color: [0, 0, 0], shadow: false },
  ])
  expect(single.positions([single.menu.scroll.tiles[0], single.menu.scroll.tiles[2]])).toEqual([
    [0, 88, 60],
    [1, 224, 60],
    [0, 64, 106],
    [1, 248, 106],
  ])

  const large = render({ kind: 'exp-cash', exp: 327_675, cash: 123_456 })
  expect(large.positions(large.menu.nums)).toEqual([
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
  expect(large.positions([large.menu.scroll.tiles[0], large.menu.scroll.tiles[2]])).toEqual([
    [0, 80, 60],
    [1, 232, 60],
    [0, 64, 106],
    [1, 248, 106],
  ])
})

test('升级页绘制八项对照，体力与真气以不同数字图集区分当前值和上限', () => {
  const before = {
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
  const report: LevelUpReport = {
    characterId: 'hero',
    from: 6,
    to: 7,
    before,
    after: { ...before, level: 7, hp: 110, maxHP: 110, mp: 48, maxMP: 48, attack: 25 },
  }
  const { labels, positions, menu } = render({ kind: 'level-up', name: '逍遥', report })
  const [title, ...table] = labels
  expect(title).toEqual({ text: '逍遥修行提升', x: 112, y: 14, color: [0, 0, 0], shadow: false })
  expect(table.map(({ text }) => text)).toEqual([
    '修行',
    '体力',
    '真气',
    '武术',
    '灵力',
    '防御',
    '身法',
    '吉运',
  ])
  expect(table.map(({ color, shadow }) => [color, shadow])).toEqual(
    Array.from({ length: 8 }, () => [[214, 198, 140], true]),
  )
  expect(positions([menu.redBox.tiles[0]])).toEqual([[0, 72, 41]])
  expect(positions([menu.settleArrow])).toHaveLength(8)
  expect(positions([menu.slash])).toHaveLength(4)
  expect(positions(menu.nums).filter(([, , y]) => y === 69)).toEqual([
    [7, 138, 69],
    [0, 144, 69],
    [1, 198, 69],
    [1, 203, 69],
    [0, 208, 69],
  ])
  expect(positions(menu.numsBlue).filter(([, , y]) => y === 72)).toEqual([
    [1, 155, 72],
    [0, 161, 72],
    [0, 167, 72],
    [1, 219, 72],
    [1, 225, 72],
    [0, 231, 72],
  ])
})

test('隐藏成长页显示字样与数值，文字使用浅底样式', () => {
  const { labels, positions, menu } = render({
    kind: 'hidden-up',
    name: '逍遥',
    statLabel: '防御',
    delta: 2,
  })
  expect(labels).toEqual([{ text: '逍遥防御提升', x: 107, y: 92, color: [0, 0, 0], shadow: false }])
  expect(positions(menu.nums)).toEqual([[2, 207, 96]])
})

test('习得页按字宽连排角色、提示和着色术名', () => {
  const { labels, positions, menu } = render({
    kind: 'learn-magic',
    name: '逍遥',
    magicName: '气疗术',
  })
  expect(labels).toEqual([
    { text: '逍遥', x: 104, y: 92, color: [0, 0, 0], shadow: false },
    { text: '练成', x: 136, y: 92, color: [0, 0, 0], shadow: false },
    { text: '气疗术', x: 168, y: 92, color: [203, 89, 77], shadow: false },
  ])
  expect(positions([menu.scroll.tiles[0], menu.scroll.tiles[2]])).toEqual([
    [0, 88, 83],
    [1, 224, 83],
  ])
})
