/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R12（reforge/menu/magic-box.ts）。
 * 该文件此前无任何测试。合同（renderSpans 文本缝替身 + 录制 ctx + 真实数字/卷轴）：
 * pick-caster 竖列布局与死人灰红/选中色、选人阶段早退不画网格、pick-spell 网格坐标、
 * MP 不足禁用色、光标 blit、MP 框 needed(黄)/current(青)、选中术描述浅黄。
 * world/skills 复用既有 test-fixtures（仓库公开夹具，非他队文件）。
 */
import type { WorldState } from '@type-pal/content'
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  drawHost,
  glyphTable,
  menuAssets,
  stubDocumentCanvas,
} from '../__tests__/glm-runtime-resource/menu-draw-fixtures.js'
import type { MagicMenuState } from '../magic-menu-state.js'
import type { SkillData } from '../test-fixtures.js'
import { makeTestSkills, makeTestWorld } from '../test-fixtures.js'
import { drawMagicMenu } from './magic-box.js'

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

const host = () => {
  const h = drawHost()
  stubDocumentCanvas(h)
  return h
}

function texts(): [string, number, number, readonly number[]][] {
  return textCalls.mock.calls.map((c: unknown[]) => {
    const spans = c[1] as { text: string }[]
    const opts = c[4] as { forceRgba?: readonly number[] }
    return [spans[0]!.text, c[2] as number, c[3] as number, opts.forceRgba!]
  })
}

const twoPartyWorld = (): WorldState => {
  const w = makeTestWorld()
  w.party.push({ ...w.party[0]!, id: 'zhao-linger', template: 'zhao-linger', hp: 0 })
  return w
}

const state = (over: Partial<MagicMenuState>): MagicMenuState => ({
  active: true,
  phase: 'pick-spell',
  casterIdx: 0,
  spells: [],
  cursor: 0,
  targetIdx: 0,
  ...over,
})

describe('R12 drawMagicMenu pick-caster', () => {
  test('竖列 (48,75+18i)；死人灰红、选中黄闪；早退不画术网格与 MP 框', () => {
    const h = host()
    const w = twoPartyWorld()
    textCalls.mockClear()
    drawMagicMenu(
      h.ctx,
      state({ phase: 'pick-caster', casterIdx: 1 }),
      w,
      menuAssets(),
      glyphTable(),
      0,
    )
    const rows = texts()
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual(['li-xiaoyao', 48, 75, [199, 186, 174]])
    expect(rows[1]).toEqual(['zhao-linger', 48, 93, [215, 109, 93]]) // 死人 + 选中
    // 早退：无术网格名（仅 2 条选人 span）且无 MP 框数字（y=14；底部队伍框数字在 y≥170）
    const mpDigits = h.drawImage.mock.calls.filter(
      (c: unknown[]) => c[2] === 14 && String((c[0] as { id: string }).id).startsWith('n'),
    )
    expect(mpDigits).toEqual([])
  })

  test('alive + 非选中：普通米白', () => {
    const h = host()
    const w = twoPartyWorld()
    w.party[1]!.hp = 50
    textCalls.mockClear()
    drawMagicMenu(
      h.ctx,
      state({ phase: 'pick-caster', casterIdx: 0 }),
      w,
      menuAssets(),
      glyphTable(),
      0,
    )
    expect(texts()[1]).toEqual(['zhao-linger', 48, 93, [199, 186, 174]])
  })
})

describe('R12 drawMagicMenu pick-spell', () => {
  const skills = makeTestSkills()
  const spells: SkillData[] = [
    { ...skills['296']!, desc: '疗伤术' },
    { ...skills['299']!, desc: '大疗伤术' },
  ] // cost 6 / cost 40；施法者 mp=30
  const spellState = state({ spells, cursor: 0 })

  test('网格 (35+87k, 54+18j)；MP 不足禁用红；选中闪烁；光标 blit (x+25,y+10)', () => {
    const h = host()
    const assets = menuAssets()
    textCalls.mockClear()
    drawMagicMenu(h.ctx, spellState, makeTestWorld(), assets, glyphTable(), 0)
    const rows = texts()
    expect(rows[0]).toEqual(['气疗术', 35, 54, [247, 231, 109]]) // 选中
    expect(rows[1]).toEqual(['元灵归心术', 122, 54, [166, 40, 32]]) // cost 40 > mp 30
    expect(h.drawImage).toHaveBeenCalledWith(assets.cursorGrid, 60, 64)
  })

  test('MP 框：needed 黄右对齐字段锚 15、current 青锚 50、斜杠', () => {
    const h = host()
    drawMagicMenu(h.ctx, spellState, makeTestWorld(), menuAssets(), glyphTable(), 0)
    const isDigit = (c: unknown[]): boolean => {
      const id = String((c[0] as { id: string }).id)
      return id.startsWith('n-') || id.startsWith('nb-') || id.startsWith('nc-')
    }
    const digits = h.drawImage.mock.calls
      .filter(isDigit)
      .map((c: unknown[]) => [(c[0] as { id: string }).id, c[1], c[2]])
    // needed = 6（黄，字段锚 15 → x = 15-6+24 = 33）；current = 30（青，锚 50 → 68/62）
    expect(digits).toContainEqual(['n-6', 33, 14])
    expect(digits).toContainEqual(['nc-0', 68, 14])
    expect(digits).toContainEqual(['nc-3', 62, 14])
  })

  test('选中术描述浅黄 (102,3)', () => {
    const h = host()
    textCalls.mockClear()
    drawMagicMenu(h.ctx, spellState, makeTestWorld(), menuAssets(), glyphTable(), 0)
    const desc = texts().filter((t) => t[3]![0] === 243 && t[1] === 102)
    expect(desc).toEqual([['疗伤术', 102, 3, [243, 239, 93]]])
  })
})
