/**
 * TEST-GROK-RENDER-HOST-LARGE-1 G08-C。
 * 缺帧、二字名的框长钳制，以及练成屏 ww 左移。不重领 191、右对齐经验和 glm 的 ww=0。
 */
import { describe, expect, it } from 'vitest'
import type { IndexedImage } from '../../assets/png.js'
import type { LevelUpScreenData } from '../../core/battle/battle-settlement.js'
import { setWordTable } from '../../core/word-lookup.js'
import { fillSentinel, pixel, SENTINEL } from '../__tests__/grok-present/images.js'
import type { Glyph, GlyphTable } from '../font.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawBattleSettlement } from './draw-battle-settlement.js'

function blankFrame(): IndexedImage {
  return { width: 1, height: 1, indices: new Uint8Array([0]), opaque: new Uint8Array([0]) }
}

function solidFrame(index: number): IndexedImage {
  return { width: 1, height: 1, indices: new Uint8Array([index]), opaque: new Uint8Array([1]) }
}

function lineFrames(): IndexedImage[] {
  const frames = Array.from({ length: 47 }, () => blankFrame())
  frames[44] = solidFrame(0x44)
  frames[45] = solidFrame(0x45)
  frames[46] = solidFrame(0x46)
  return frames
}

function glyphsOf(chars: readonly string[]): GlyphTable {
  const map = new Map<number, Glyph>()
  for (const ch of chars) {
    const cp = ch.codePointAt(0)
    if (cp === undefined) continue
    const bitmap = new Uint8Array(32)
    bitmap[0] = 0x80
    map.set(cp, { width: 16, height: 16, bitmap })
  }
  return { has: (cp) => map.has(cp), get: (cp) => map.get(cp) }
}

function levelUp(hpOld: number): LevelUpScreenData {
  const pair = (oldV: number, cur: number) => ({ old: oldV, cur })
  return {
    roleId: 0,
    name: '甲',
    level: pair(4, 5),
    hp: { old: hpOld, oldMax: 58, cur: 88, curMax: 105 },
    mp: { old: 12, oldMax: 34, cur: 25, curMax: 66 },
    attack: pair(30, 33),
    magic: pair(20, 24),
    defense: pair(10, 12),
    dexterity: pair(18, 21),
    flee: pair(7, 9),
  }
}

describe('G08-C 战斗结算像素', () => {
  it('G08-C01 没有界面帧时经验屏不写像素，屏数据保持原样', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    const screen = { kind: 'exp-cash' as const, expGained: 12, cashGained: 4, isBoss: false }
    const before = { ...screen }
    drawBattleSettlement({ fb, screen })
    expect(pixel(fb, 83, 60)).toBe(SENTINEL)
    expect(screen).toEqual(before)
  })

  it('G08-C02 缺少箭头帧时标签仍是 0xBB，箭头锚点保持哨兵', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawBattleSettlement({
      fb,
      screen: { kind: 'level-up', data: levelUp(41) },
      uiSpriteFrames: lineFrames(),
      glyphs: glyphsOf(['修', '行']),
    })
    expect(pixel(fb, 100, 44)).toBe(0xbb)
    expect(pixel(fb, 180, 48)).toBe(SENTINEL)
  })

  it('G08-C03 缺少斜杠帧时体力个位仍画出，斜杠点保持哨兵', () => {
    const frames = lineFrames()
    delete frames[39]
    frames[20] = solidFrame(0xb1)
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawBattleSettlement({
      fb,
      screen: { kind: 'level-up', data: levelUp(41) },
      uiSpriteFrames: frames,
      glyphs: glyphsOf(['修']),
    })
    expect(pixel(fb, 151, 64)).toBe(0xb1)
    expect(pixel(fb, 156, 66)).toBe(SENTINEL)
  })

  it('G08-C04 二字名的文字按实际字宽贴上，框右缘仍按钳到 3 的长度', () => {
    const flat: string[] = []
    flat[49] = '体'
    setWordTable(flat)
    try {
      const fb = createFramebuffer()
      fillSentinel(fb)
      drawBattleSettlement({
        fb,
        screen: {
          kind: 'hidden-exp-up',
          data: { roleId: 0, name: '甲乙', statLabelWord: 49, delta: 3 },
        },
        uiSpriteFrames: lineFrames(),
        glyphs: glyphsOf(['甲', '乙', '体', '提', '升']),
      })
      // w1=max(2,3)=3，w2=2，w3=2，len=9 → 右缘在 78+1+9=88。属性文字在 90+16*2=122。
      expect(pixel(fb, 88, 60)).toBe(0x46)
      expect(pixel(fb, 122, 70)).toBe(0)
      expect(pixel(fb, 123, 70)).toBe(SENTINEL)
    } finally {
      setWordTable([])
    }
  })

  it('G08-C05 名字四字、法术六字时 ww=16，单行框和名字一起左移', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawBattleSettlement({
      fb,
      screen: {
        kind: 'learn-magic',
        data: { roleId: 0, name: '甲乙丙丁', magicName: '甲乙丙丁戊己' },
      },
      uiSpriteFrames: lineFrames(),
      glyphs: glyphsOf(['甲', '乙', '丙', '丁', '戊', '己', '练', '成']),
    })
    expect(pixel(fb, 49, 105)).toBe(0x44)
    expect(pixel(fb, 59, 115)).toBe(0)
    expect(pixel(fb, 65, 105)).toBe(SENTINEL)
  })
})
