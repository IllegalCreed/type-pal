import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { beginChineseMenuText } from '../../../__tests__/menu-text-fixture.js'
import type { IndexedImage } from '../../../assets/png.js'
import type { LevelUpScreenData } from '../../../core/battle/battle-settlement.js'
import { setWordTable } from '../../../core/word-lookup.js'
import { fixtureGlyphs, glyphsOf, textDot } from '../../__tests__/glyph-fixtures.js'
import {
  ARROW_ID,
  makeUiFrames,
  midOnesX,
  rightDigitX,
  yellowDigit,
} from '../../__tests__/menu-ui-fixtures.js'
import {
  fillSentinel,
  pixel,
  SENTINEL,
  sentinelFramebuffer,
} from '../../__tests__/raster-fixtures.js'
import { cloneInputs } from '../../__tests__/render-input-snapshots.js'
import { uniformDotGlyphs, uniformTextDot } from '../../__tests__/uniform-glyphs.js'
import { createFramebuffer } from '../../framebuffer.js'
import { drawBattleSettlement } from '../draw-battle-settlement.js'

const uniformGlyphs = uniformDotGlyphs()

const positionGlyphs = fixtureGlyphs()

function roleFourLevelUpData(): LevelUpScreenData {
  return {
    roleId: 4,
    name: '戊',
    level: { old: 2, cur: 3 },
    hp: { old: 11, oldMax: 20, cur: 22, curMax: 40 },
    mp: { old: 5, oldMax: 8, cur: 6, curMax: 9 },
    attack: { old: 11, cur: 22 },
    magic: { old: 4, cur: 5 },
    defense: { old: 6, cur: 7 },
    dexterity: { old: 8, cur: 9 },
    flee: { old: 1, cur: 2 },
  }
}

function roleZeroLevelUpData(): LevelUpScreenData {
  const pair = (oldV: number, cur: number) => ({ old: oldV, cur })
  return {
    roleId: 0,
    name: '甲',
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

function transparentPixelFrame(): IndexedImage {
  return { width: 1, height: 1, indices: new Uint8Array([0]), opaque: new Uint8Array([0]) }
}

function opaquePixelFrame(index: number): IndexedImage {
  return { width: 1, height: 1, indices: new Uint8Array([index]), opaque: new Uint8Array([1]) }
}

function lineBoxFrames(): IndexedImage[] {
  const frames = Array.from({ length: 47 }, () => transparentPixelFrame())
  frames[44] = opaquePixelFrame(0x44)
  frames[45] = opaquePixelFrame(0x45)
  frames[46] = opaquePixelFrame(0x46)
  return frames
}

let restoreMenuText: () => void

beforeEach(() => {
  restoreMenuText = beginChineseMenuText()
})

afterEach(() => {
  restoreMenuText()
})

describe('Settlement screen pixels and resources', () => {
  it('P08 经验和金钱分别显示本场结果', () => {
    const frames = makeUiFrames()
    const expFb = createFramebuffer()
    fillSentinel(expFb)
    const expScreen = { kind: 'exp-cash' as const, expGained: 12, cashGained: 34, isBoss: false }
    const beforeExp = cloneInputs({ frames, screen: expScreen })
    drawBattleSettlement({
      fb: expFb,
      screen: expScreen,
      uiSpriteFrames: frames,
      glyphs: positionGlyphs,
    })
    expect(cloneInputs({ frames, screen: expScreen })).toEqual(beforeExp)
    expect(pixel(expFb, textDot('获', 0, 95, 70).x, textDot('获', 0, 95, 70).y)).toBe(0)
    expect(pixel(expFb, textDot('获', 0, 95, 70).x + 3, textDot('获', 0, 95, 70).y)).not.toBe(0)
    expect(pixel(expFb, rightDigitX(182, 5, 0), 74)).toBe(yellowDigit(2))
    expect(pixel(expFb, rightDigitX(182, 5, 1), 74)).toBe(yellowDigit(1))
    expect(pixel(expFb, midOnesX(162, 5, 2), 119)).toBe(yellowDigit(4))
    expect(pixel(expFb, midOnesX(162, 5, 2) - 6, 119)).toBe(yellowDigit(3))
  })

  it('P08 升级画面保留旧新等级与武术', () => {
    const frames = makeUiFrames()
    const data = roleFourLevelUpData()
    const levelScreen = { kind: 'level-up' as const, data }
    const levelFb = createFramebuffer()
    fillSentinel(levelFb)
    const beforeLevel = cloneInputs({ frames, screen: levelScreen })
    drawBattleSettlement({
      fb: levelFb,
      screen: levelScreen,
      uiSpriteFrames: frames,
      glyphs: positionGlyphs,
    })
    expect(cloneInputs({ frames, screen: levelScreen })).toEqual(beforeLevel)
    expect(pixel(levelFb, textDot('戊', 0, 110, 10).x, textDot('戊', 0, 110, 10).y)).toBe(0)
    expect(pixel(levelFb, 180, 48)).toBe(ARROW_ID)
    expect(pixel(levelFb, rightDigitX(133, 4, 0), 47)).toBe(yellowDigit(2))
    expect(pixel(levelFb, rightDigitX(195, 4, 0), 47)).toBe(yellowDigit(3))
    expect(pixel(levelFb, rightDigitX(133, 4, 0), 101)).toBe(yellowDigit(1))
    expect(pixel(levelFb, rightDigitX(195, 4, 0), 101)).toBe(yellowDigit(2))
    expect(pixel(levelFb, rightDigitX(133, 4, 1), 101)).toBe(yellowDigit(1))
    expect(pixel(levelFb, rightDigitX(195, 4, 1), 101)).toBe(yellowDigit(2))
  })

  it('P08 隐藏成长显示角色、词表属性和增量', () => {
    const frames = makeUiFrames()
    const words = Array<string>(56).fill('')
    words[51] = '武术'
    setWordTable(words)
    const hiddenFb = createFramebuffer()
    fillSentinel(hiddenFb)
    const hiddenScreen = {
      kind: 'hidden-exp-up' as const,
      data: { roleId: 4, name: '戊', statLabelWord: 51, delta: 5 },
    }
    const beforeHidden = cloneInputs({ frames, screen: hiddenScreen })
    drawBattleSettlement({
      fb: hiddenFb,
      screen: hiddenScreen,
      uiSpriteFrames: frames,
      glyphs: positionGlyphs,
    })
    expect(cloneInputs({ frames, screen: hiddenScreen })).toEqual(beforeHidden)
    expect(pixel(hiddenFb, textDot('戊', 0, 90, 70).x, textDot('戊', 0, 90, 70).y)).toBe(0)
    expect(pixel(hiddenFb, textDot('武', 0, 106, 70).x, textDot('武', 0, 106, 70).y)).toBe(0)
    expect(pixel(hiddenFb, rightDigitX(175, 5, 0), 74)).toBe(yellowDigit(5))
  })

  it('P08 练成法术名称与角色颜色不同', () => {
    const frames = makeUiFrames()
    const learnFb = createFramebuffer()
    fillSentinel(learnFb)
    const learnScreen = {
      kind: 'learn-magic' as const,
      data: { roleId: 4, name: '戊', magicName: '雷' },
    }
    const beforeLearn = cloneInputs({ frames, screen: learnScreen })
    drawBattleSettlement({
      fb: learnFb,
      screen: learnScreen,
      uiSpriteFrames: frames,
      glyphs: positionGlyphs,
    })
    expect(cloneInputs({ frames, screen: learnScreen })).toEqual(beforeLearn)
    expect(pixel(learnFb, textDot('戊', 0, 75, 115).x, textDot('戊', 0, 75, 115).y)).toBe(0)
    expect(pixel(learnFb, textDot('雷', 0, 155, 115).x, textDot('雷', 0, 155, 115).y)).toBe(0x1b)
    expect(pixel(learnFb, textDot('雷', 0, 155, 115).x + 3, textDot('雷', 0, 155, 115).y)).not.toBe(
      0x1b,
    )
    expect(pixel(learnFb, 300, 190)).toBe(SENTINEL)
  })

  it('没有界面帧时经验屏不写像素，屏数据保持原样', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    const screen = { kind: 'exp-cash' as const, expGained: 12, cashGained: 4, isBoss: false }
    const before = { ...screen }
    drawBattleSettlement({ fb, screen })
    expect(fb.indices.every((value) => value === SENTINEL)).toBe(true)
    expect(screen).toEqual(before)
  })

  it('缺少箭头帧时标签仍是 0xBB，箭头锚点保持哨兵', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawBattleSettlement({
      fb,
      screen: { kind: 'level-up', data: roleZeroLevelUpData() },
      uiSpriteFrames: lineBoxFrames(),
      glyphs: glyphsOf(['修', '行']),
    })
    expect(pixel(fb, 100, 44)).toBe(0xbb)
    expect(pixel(fb, 180, 48)).toBe(SENTINEL)
  })

  it('缺少斜杠帧时体力个位仍画出，斜杠点保持哨兵', () => {
    const frames = lineBoxFrames()
    delete frames[39]
    frames[20] = opaquePixelFrame(0xb1)
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawBattleSettlement({
      fb,
      screen: { kind: 'level-up', data: roleZeroLevelUpData() },
      uiSpriteFrames: frames,
      glyphs: glyphsOf(['修']),
    })
    expect(pixel(fb, 151, 64)).toBe(0xb1)
    expect(pixel(fb, 156, 66)).toBe(SENTINEL)
  })

  it('二字名的文字按实际字宽贴上，框右缘仍按钳到 3 的长度', () => {
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
        uiSpriteFrames: lineBoxFrames(),
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

  it('名字四字、法术六字时 ww=16，单行框和名字一起左移', () => {
    const fb = createFramebuffer()
    fillSentinel(fb)
    drawBattleSettlement({
      fb,
      screen: {
        kind: 'learn-magic',
        data: { roleId: 0, name: '甲乙丙丁', magicName: '甲乙丙丁戊己' },
      },
      uiSpriteFrames: lineBoxFrames(),
      glyphs: glyphsOf(['甲', '乙', '丙', '丁', '戊', '己', '练', '成']),
    })
    expect(pixel(fb, 49, 105)).toBe(0x44)
    expect(pixel(fb, 59, 115)).toBe(0)
    expect(pixel(fb, 65, 105)).toBe(SENTINEL)
  })

  it('exp-cash：exp 右对齐 5 位 at (182,74)、cash 中对齐 at y=119、两单行框', () => {
    const fb = sentinelFramebuffer()

    drawBattleSettlement({
      fb,
      screen: { kind: 'exp-cash', expGained: 120, cashGained: 7, isBoss: false },
      uiSpriteFrames: makeUiFrames(),
      glyphs: uniformGlyphs,
    })

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
    const fb = sentinelFramebuffer()

    drawBattleSettlement({
      fb,
      screen: { kind: 'level-up', data: roleZeroLevelUpData() },
      uiSpriteFrames: makeUiFrames(),
      glyphs: uniformGlyphs,
    })

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
    // 标题首字甲的点位是 (114,14)，前景色 0，无阴影。
    expect(pixel(fb, uniformTextDot(0, 110, 10).x, 14)).toBe(0)
  })

  it('hidden-exp-up：单字词表的涨点数 x=167，名字与属性相贴', () => {
    const flat: string[] = []
    for (let id = 36; id <= 41; id++) flat[id] = '甲' // 6 角色名各 1 全宽 → maxName=1
    for (let id = 48; id <= 55; id++) flat[id] = '乙' // 8 标签各 1 → maxProp=1-1=0
    setWordTable(flat)
    try {
      const fb = sentinelFramebuffer()

      drawBattleSettlement({
        fb,
        screen: {
          kind: 'hidden-exp-up',
          data: { roleId: 0, name: '甲', statLabelWord: 49, delta: 12 },
        },
        uiSpriteFrames: makeUiFrames(),
        glyphs: uniformGlyphs,
      })

      // delta 12 → 个位 2/十位 1 at rightDigitX(167,5,·), y=74
      expect(pixel(fb, 191, 74)).toBe(yellowDigit(2))
      expect(pixel(fb, 185, 74)).toBe(yellowDigit(1))
      // 名字「甲」at (90,70) 色 0；属性标签「乙」紧贴 nameW=1 → x=106
      expect(pixel(fb, uniformTextDot(0, 90, 70).x, 74)).toBe(0)
      expect(pixel(fb, uniformTextDot(0, 106, 70).x, 74)).toBe(0)
    } finally {
      setWordTable([])
    }
  })

  it('learn-magic：短名字 ww=0，magicName 色 0x1B', () => {
    const fb = sentinelFramebuffer()

    drawBattleSettlement({
      fb,
      screen: { kind: 'learn-magic', data: { roleId: 0, name: '甲', magicName: '乙乙' } },
      uiSpriteFrames: makeUiFrames(),
      glyphs: uniformGlyphs,
    })

    // w1=max(1,3)=3, w2=2(练成 tofu 2 全宽), w3=max(2,5)=5 → ww=(3+2+5-10)<<3=0
    // name at (75,115) 色 0；magicName at (75+16*5,115)=(155,115) 色 0x1B
    expect(pixel(fb, uniformTextDot(0, 75, 115).x, 119)).toBe(0)
    expect(pixel(fb, uniformTextDot(1, 155, 115).x, 119)).toBe(0x1b)
    // 单行框 (65,105) 内部
    expect(pixel(fb, 80, 109)).toBe(0x11)
  })
})
