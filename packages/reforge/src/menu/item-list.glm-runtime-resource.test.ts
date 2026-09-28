/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R10（reforge/menu/item-list.ts）。
 * 该文件此前无任何测试。合同（录制 ctx + renderSpans 文本缝替身，九宫格/数字/光标走真实实现）：
 * 3 列网格坐标与三色（普通/选中闪烁/穿戴绿）、数量>1 右对齐青数字、选中光标 blit、
 * 描述 ≤3 行静态与 >3 行裁剪滚动（两个固定时间点窗口平移）、noDesc、空列表。
 */
import type { ItemData, WorldState } from '@type-pal/content'
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  drawHost,
  glyphTable,
  menuAssets,
  stubDocumentCanvas,
} from '../__tests__/glm-runtime-resource/menu-draw-fixtures.js'
import { drawItemGridList } from './item-list.js'

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

afterEach(() => vi.unstubAllGlobals())

const item = (id: string, name: string, desc: string[] = []): ItemData => ({
  id,
  name,
  desc,
  buyPrice: 0,
  sellPrice: 0,
  sellable: true,
})

function world(inventory: { itemId: string; count: number }[]): WorldState {
  return {
    party: [],
    learnedSkills: {},
    money: 0,
    inventory,
  }
}

/** 穿戴者：CharacterInstance 全字段（装备 = {槽: itemId}），供 equippedItemIds 消费。 */
function wearer(equipment: Record<string, string>): import('@type-pal/content').CharacterInstance {
  return {
    id: 'li-xiaoyao',
    template: 'li-xiaoyao',
    level: 1,
    exp: 0,
    hp: 100,
    maxHP: 150,
    mp: 30,
    maxMP: 100,
    attack: 33,
    defense: 32,
    magicAttack: 20,
    speed: 28,
    luck: 32,
    equipment,
    tags: [],
  }
}

/** 提取 renderSpans 记录：(text, x, y, forceRgba)。 */
function texts(): [string, number, number, readonly number[]][] {
  return textCalls.mock.calls.map((c: unknown[]) => {
    const spans = c[1] as { text: string }[]
    const opts = c[4] as { forceRgba?: readonly number[] }
    return [spans[0]!.text, c[2] as number, c[3] as number, opts.forceRgba!]
  })
}

describe('R10 drawItemGridList 网格与数量', () => {
  test('7 项 3 列网格：坐标 (15+100k, 12+18j)；普通色；count>1 画青数字、=1 不画', () => {
    const host = drawHost()
    stubDocumentCanvas(host)
    const assets = menuAssets()
    const items = Array.from({ length: 7 }, (_, i) => item(String(100 + i), `物${i}`))
    textCalls.mockClear()
    drawItemGridList(
      host.ctx,
      items,
      -1,
      world([{ itemId: '103', count: 3 }]),
      assets,
      glyphTable(),
      0,
    )
    expect(texts()).toHaveLength(7)
    // 行主序:(0→15,12) (1→115,12) (2→215,12) (3→15,30) … (6→15,48)
    expect(texts()[0]).toEqual(['物0', 15, 12, [199, 186, 174]])
    expect(texts()[1]).toEqual(['物1', 115, 12, [199, 186, 174]])
    expect(texts()[2]).toEqual(['物2', 215, 12, [199, 186, 174]])
    expect(texts()[3]).toEqual(['物3', 15, 30, [199, 186, 174]])
    expect(texts()[6]).toEqual(['物6', 15, 48, [199, 186, 174]])
    // count=3（id 103 在 k=0,j=1 → 数字右对齐 15+81+0=96, y=30+5=35）→ 青数字逐位
    const numberCalls = host.drawImage.mock.calls.filter((c: unknown[]) =>
      String((c[0] as { id: string }).id).startsWith('nc-'),
    )
    expect(numberCalls.map((c: unknown[]) => [(c[0] as { id: string }).id, c[1], c[2]])).toEqual([
      ['nc-3', 90, 35],
    ])
  })

  test('穿戴中物品绿（优先于选中闪烁）；选中黄闪 + 光标 blit (x+25,y+10)', () => {
    const host = drawHost()
    stubDocumentCanvas(host)
    const assets = menuAssets()
    const items = [item('249', '护腕'), item('61', '观音符')]
    // 249 起手穿戴（accessory），61 背包 ×2
    const w = world([{ itemId: '61', count: 2 }])
    w.party = [wearer({ accessory: '249' })]
    textCalls.mockClear()
    drawItemGridList(host.ctx, items, 1, w, assets, glyphTable(), 0)
    // 249 穿戴 → 橄榄绿（cursor=1 选中 61，不影响穿戴色）
    expect(texts()[0]).toEqual(['护腕', 15, 12, [81, 93, 44]])
    // 61 选中 → 6 色闪烁第 0 帧；光标 blit (115+25, 12+10)
    expect(texts()[1]).toEqual(['观音符', 115, 12, [247, 231, 109]])
    expect(host.drawImage).toHaveBeenCalledWith(assets.cursorGrid, 140, 22)
  })
})

describe('R10 drawItemGridList 描述区', () => {
  test('≤3 行静态：DESC_X=71、DESC_Y=151+i×16、浅黄', () => {
    const host = drawHost()
    stubDocumentCanvas(host)
    const items = [item('61', '观音符', ['行零', '行一'])]
    textCalls.mockClear()
    drawItemGridList(host.ctx, items, 0, world([]), menuAssets(), glyphTable(), 0)
    const desc = texts().filter((t) => t[3]![0] === 243)
    expect(desc).toEqual([
      ['行零', 71, 151, [243, 239, 93]],
      ['行一', 71, 167, [243, 239, 93]],
    ])
  })

  test('>3 行滚动：now=0 画首 3 行；now=800（scroll=16px）窗口平移到行 1..3；裁剪矩形固定', () => {
    const host = drawHost()
    stubDocumentCanvas(host)
    const lines = ['零', '一', '二', '三']
    const items = [item('61', '观音符', lines)]
    textCalls.mockClear()
    drawItemGridList(host.ctx, items, 0, world([]), menuAssets(), glyphTable(), 0)
    expect(
      texts()
        .filter((t) => t[3]![0] === 243)
        .map((t) => t[0]),
    ).toEqual(['零', '一', '二'])
    expect(host.rect).toHaveBeenCalledWith(69, 149, 247, 48)
    expect(host.save).toHaveBeenCalled()
    expect(host.restore).toHaveBeenCalled()

    textCalls.mockClear()
    drawItemGridList(host.ctx, items, 0, world([]), menuAssets(), glyphTable(), 800)
    expect(
      texts()
        .filter((t) => t[3]![0] === 243)
        .map((t) => t[0]),
    ).toEqual(['一', '二', '三'])
  })

  test('noDesc 不画描述；空列表零条目零描述', () => {
    const host = drawHost()
    stubDocumentCanvas(host)
    textCalls.mockClear()
    drawItemGridList(
      host.ctx,
      [item('61', '观音符', ['x'])],
      0,
      world([]),
      menuAssets(),
      glyphTable(),
      0,
      undefined,
      { noDesc: true },
    )
    expect(texts().filter((t) => t[3]![0] === 243)).toEqual([]) // 条目名仍画，描述不画
    expect(texts()).toHaveLength(1)
    stubDocumentCanvas(host)
    textCalls.mockClear()
    drawItemGridList(host.ctx, [], 0, world([]), menuAssets(), glyphTable(), 0)
    expect(texts()).toHaveLength(0)
  })
})
