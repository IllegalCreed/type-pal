/**
 * TEST-GLM-PHASE1-LEAVES-3 L15（draw-battle-settlement.ts）— 去重表：
 *  - draw-battle-settlement.test（hiddenExpUpNumberX 公式 191/单行公式差）→ 不重复
 *  - present-battle.test 结算屏（box+数字"有写入"松断言、BattlePresent 端到端）→ 不重复
 *  - 新差异：drawBattleSettlement 直调的精确像素——exp-cash 双单行框+exp 右对齐/cash 中对齐
 *    数字、level-up 8 行 old→cur 数字+slash+箭头+0xBB 标签色+标题、hidden-exp-up 词表拼字+
 *    涨点数 x=191、learn-magic ww 偏移+magicName 0x1B 色。
 */
import { describe, expect, it } from 'vitest'
import {
  fixtureGlyphs,
  freezeNow,
  makeUiFrames,
  newFb,
  pixel,
  rightDigitX,
  textDot,
  yellowDigit,
} from '../../__tests__/glm-phase1-leaves/present-fixtures.js'
import type { LevelUpScreenData } from '../../core/battle/battle-settlement.js'
import { setWordTable } from '../../core/word-lookup.js'
import { drawBattleSettlement, hiddenExpUpNumberX } from './draw-battle-settlement.js'

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
    expect(pixel(fb, rightDigitX(182, 5, 0), 74)).toBe(yellowDigit(0))
    expect(pixel(fb, rightDigitX(182, 5, 1), 74)).toBe(yellowDigit(2))
    expect(pixel(fb, rightDigitX(182, 5, 2), 74)).toBe(yellowDigit(1))
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
    // Level old 4 → cur 5（y=47）
    expect(pixel(fb, rightDigitX(133, 4, 0), 47)).toBe(yellowDigit(4))
    expect(pixel(fb, rightDigitX(195, 4, 0), 47)).toBe(yellowDigit(5))
    // HP old 41（y=64）/ oldMax 58 蓝（154,68）/ cur 88（195,64）/ curMax 105 蓝（216,68）
    expect(pixel(fb, rightDigitX(133, 4, 0), 64)).toBe(yellowDigit(1))
    expect(pixel(fb, rightDigitX(154, 4, 1), 68)).toBe(0xd5)
    expect(pixel(fb, rightDigitX(195, 4, 0), 64)).toBe(yellowDigit(8))
    expect(pixel(fb, rightDigitX(216, 4, 2), 68)).toBe(0xd1)
    // slash 精灵 39 at (156,66)/(218,66)
    expect(pixel(fb, 156, 66)).toBe(0x39)
    expect(pixel(fb, 218, 66)).toBe(0x39)
    // flee cur 9（195,173）
    expect(pixel(fb, rightDigitX(195, 4, 0), 173)).toBe(yellowDigit(9))
    // 8 个箭头 sprite 47 at (180, 48+18j)
    expect(pixel(fb, 180, 48)).toBe(0x47)
    expect(pixel(fb, 180, 48 + 18 * 7)).toBe(0x47)
    // 标签 tofu 顶行首像素 = 0xBB（100,44+18j）
    expect(pixel(fb, 100, 44)).toBe(0xbb)
    // 标题「甲修行提升」第 1 字 = fixture 甲（色 0 无影）at (110+16+4, 10+4)
    expect(pixel(fb, textDot('甲修行提升', 0, 110, 10).x, 14)).toBe(0)
  })

  it('hidden-exp-up：词表拼 名字+属性+提升，涨点数 x=191（仙剑 maxName=3/maxProp=1）', () => {
    const flat: string[] = []
    for (let id = 36; id <= 41; id++) flat[id] = '甲' // 6 角色名各 1 全宽 → maxName=1
    for (let id = 48; id <= 55; id++) flat[id] = '乙' // 8 标签各 1 → maxProp=1-1=0
    setWordTable(flat)
    try {
      // 公式交叉验证：183 + (1+0-3)*8 = 167
      expect(hiddenExpUpNumberX(1, 0)).toBe(167)
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
      expect(pixel(fb, rightDigitX(167, 5, 0), 74)).toBe(yellowDigit(2))
      expect(pixel(fb, rightDigitX(167, 5, 1), 74)).toBe(yellowDigit(1))
      // 名字「甲」at (90,70) 色 0；属性标签「乙」紧贴 nameW=1 → x=106
      expect(pixel(fb, textDot('甲', 0, 90, 70).x, 74)).toBe(0)
      expect(pixel(fb, textDot('乙', 0, 106, 70).x, 74)).toBe(0)
    } finally {
      setWordTable([])
    }
  })

  it('learn-magic：ww 偏移随字宽收窄框，magicName 色 0x1B', () => {
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
