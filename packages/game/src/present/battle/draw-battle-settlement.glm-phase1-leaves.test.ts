/**
 * 结算四类屏的直接像素合同；宿主接线另见 present-battle.test。
 * 长名字 ww=16 和缺帧策略见 G08-C；本文件短名字 ww=0。
 * 微型字体/图块仅验证布局与颜色协议，不代替原盘视觉验收。
 */
import { describe, expect, it } from 'vitest'
import {
  fixtureGlyphs,
  freezeNow,
  makeUiFrames,
  newFb,
  pixel,
  textDot,
  yellowDigit,
} from '../../__tests__/glm-phase1-leaves/present-fixtures.js'
import type { LevelUpScreenData } from '../../core/battle/battle-settlement.js'
import { setWordTable } from '../../core/word-lookup.js'
import { drawBattleSettlement } from './draw-battle-settlement.js'

const glyphs = fixtureGlyphs

function levelUpData(name: string): LevelUpScreenData {
  const pair = (oldV: number, cur: number) => ({ old: oldV, cur })
  return {
    roleId: 0,
    name,
    level: pair(4, 5),
    hp: { old: 41, oldMax: 58, cur: 88, curMax: 105 },
    mp: { old: 12, oldMax: 34, cur: 25, curMax: 66 },
    attack: pair(30, 33),
    magic: pair(20, 24),
    defense: pair(10, 12),
    dexterity: pair(18, 21),
    flee: pair(7, 9),
  }
}

describe('L15 drawBattleSettlement 精确像素', () => {
  it('exp-cash：exp 右对齐 5 位 at (182,74)、cash 中对齐 at y=119、两单行框', () => {
    const fb = newFb()
    const restore = freezeNow(0)
    try {
      drawBattleSettlement({
        fb,
        screen: { kind: 'exp-cash', expGained: 120, cashGained: 7, isBoss: false },
        uiSpriteFrames: makeUiFrames(),
        glyphs,
      })
    } finally {
      restore()
    }
    // exp 120 → 个位 0/十位 2/百位 1（右对齐）
    expect(pixel(fb, 206, 74)).toBe(yellowDigit(0))
    expect(pixel(fb, 200, 74)).toBe(yellowDigit(2))
    expect(pixel(fb, 194, 74)).toBe(yellowDigit(1))
    // cash 7 中对齐：midOnesX(162,5,1)=162-6+3*(5+1)=174
    expect(pixel(fb, 174, 119)).toBe(yellowDigit(7))
    // 两个单行框内部 style0
    expect(pixel(fb, 95, 64)).toBe(0x11)
    expect(pixel(fb, 80, 109)).toBe(0x11)
  })

  it('level-up：8 行 old→cur + slash + 箭头 + 0xBB 标签 + 标题', () => {
    const fb = newFb()
    const restore = freezeNow(0)
    try {
      drawBattleSettlement({
        fb,
        screen: { kind: 'level-up', data: levelUpData('甲') },
        uiSpriteFrames: makeUiFrames(),
        glyphs,
      })
    } finally {
      restore()
    }
    // 固定期望来自本例输入和已核 SDLPal 行位；不调用产品数字/行表计算 oracle。
    for (const [y, oldOnes, curOnes] of [
      [47, 4, 5],
      [64, 1, 8],
      [82, 2, 5],
      [101, 0, 3],
      [119, 0, 4],
      [137, 0, 2],
      [155, 8, 1],
      [173, 7, 9],
    ]) {
      expect(pixel(fb, 151, y!)).toBe(yellowDigit(oldOnes!))
      expect(pixel(fb, 213, y!)).toBe(yellowDigit(curOnes!))
    }
    // HP 最大值58/105，MP最大值34/66，各位与两对斜杠独立辨识。
    for (const [x, y, color] of [
      [166, 68, 0xd5],
      [172, 68, 0xd8],
      [222, 68, 0xd1],
      [228, 68, 0xd0],
      [234, 68, 0xd5],
      [166, 86, 0xd3],
      [172, 86, 0xd4],
      [228, 86, 0xd6],
      [234, 86, 0xd6],
      [156, 66, 0x39],
      [218, 66, 0x39],
      [156, 84, 0x39],
      [218, 84, 0x39],
    ])
      expect(pixel(fb, x!, y!)).toBe(color)
    for (const y of [48, 66, 84, 102, 120, 138, 156, 174]) expect(pixel(fb, 180, y)).toBe(0x47)
    for (const y of [44, 62, 80, 98, 116, 134, 152, 170]) expect(pixel(fb, 100, y)).toBe(0xbb)
    // 标题「甲修行提升」第 1 字 = fixture 甲（色 0 无影）at (110+16+4, 10+4)
    expect(pixel(fb, textDot('甲修行提升', 0, 110, 10).x, 14)).toBe(0)
  })

  it('hidden-exp-up：单字词表的涨点数 x=167，名字与属性相贴', () => {
    const flat: string[] = []
    for (let id = 36; id <= 41; id++) flat[id] = '甲' // 6 角色名各 1 全宽 → maxName=1
    for (let id = 48; id <= 55; id++) flat[id] = '乙' // 8 标签各 1 → maxProp=1-1=0
    setWordTable(flat)
    try {
      const fb = newFb()
      const restore = freezeNow(0)
      try {
        drawBattleSettlement({
          fb,
          screen: {
            kind: 'hidden-exp-up',
            data: { roleId: 0, name: '甲', statLabelWord: 49, delta: 12 },
          },
          uiSpriteFrames: makeUiFrames(),
          glyphs,
        })
      } finally {
        restore()
      }
      // delta 12 → 个位 2/十位 1 at rightDigitX(167,5,·), y=74
      expect(pixel(fb, 191, 74)).toBe(yellowDigit(2))
      expect(pixel(fb, 185, 74)).toBe(yellowDigit(1))
      // 名字「甲」at (90,70) 色 0；属性标签「乙」紧贴 nameW=1 → x=106
      expect(pixel(fb, textDot('甲', 0, 90, 70).x, 74)).toBe(0)
      expect(pixel(fb, textDot('乙', 0, 106, 70).x, 74)).toBe(0)
    } finally {
      setWordTable([])
    }
  })

  it('learn-magic：短名字 ww=0，magicName 色 0x1B', () => {
    const fb = newFb()
    const restore = freezeNow(0)
    try {
      drawBattleSettlement({
        fb,
        screen: { kind: 'learn-magic', data: { roleId: 0, name: '甲', magicName: '乙乙' } },
        uiSpriteFrames: makeUiFrames(),
        glyphs,
      })
    } finally {
      restore()
    }
    // w1=max(1,3)=3, w2=2(练成 tofu 2 全宽), w3=max(2,5)=5 → ww=(3+2+5-10)<<3=0
    // name at (75,115) 色 0；magicName at (75+16*5,115)=(155,115) 色 0x1B
    expect(pixel(fb, textDot('甲', 0, 75, 115).x, 119)).toBe(0)
    expect(pixel(fb, textDot('乙乙', 1, 155, 115).x, 119)).toBe(0x1b)
    // 单行框 (65,105) 内部
    expect(pixel(fb, 80, 109)).toBe(0x11)
  })
})
