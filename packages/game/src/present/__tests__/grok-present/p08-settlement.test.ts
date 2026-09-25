import { afterEach, describe, expect, it } from 'vitest'
import type { LevelUpScreenData } from '../../../core/battle/battle-settlement.js'
import { setWordTable } from '../../../core/word-lookup.js'
import { drawBattleSettlement } from '../../battle/draw-battle-settlement.js'
import { createFramebuffer } from '../../framebuffer.js'
import { fixtureGlyphs, textDot } from './font.js'
import {
  ARROW_ID,
  fillSentinel,
  makeUiFrames,
  midOnesX,
  pixel,
  rightDigitX,
  SENTINEL,
  yellowDigit,
} from './images.js'
import { cloneInputs, resetHostSingletons } from './world.js'

const glyphs = fixtureGlyphs()

afterEach(() => {
  resetHostSingletons()
})

function levelUp(): LevelUpScreenData {
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

describe('P08 结算呈现', () => {
  it('P08 经验金钱、升级旧新值、隐藏涨点和练成名称可区分', () => {
    const frames = makeUiFrames()
    const words = Array<string>(56).fill('')
    words[51] = '武术'
    setWordTable(words)
    const expFb = createFramebuffer()
    fillSentinel(expFb)
    const expScreen = { kind: 'exp-cash' as const, expGained: 12, cashGained: 34, isBoss: false }
    const beforeExp = cloneInputs({ frames, screen: expScreen })
    drawBattleSettlement({
      fb: expFb,
      screen: expScreen,
      uiSpriteFrames: frames,
      glyphs,
    })
    expect(cloneInputs({ frames, screen: expScreen })).toEqual(beforeExp)
    expect(pixel(expFb, textDot('获', 0, 95, 70).x, textDot('获', 0, 95, 70).y)).toBe(0)
    expect(pixel(expFb, textDot('获', 0, 95, 70).x + 3, textDot('获', 0, 95, 70).y)).not.toBe(0)
    expect(pixel(expFb, rightDigitX(182, 5, 0), 74)).toBe(yellowDigit(2))
    expect(pixel(expFb, rightDigitX(182, 5, 1), 74)).toBe(yellowDigit(1))
    expect(pixel(expFb, midOnesX(162, 5, 2), 119)).toBe(yellowDigit(4))
    expect(pixel(expFb, midOnesX(162, 5, 2) - 6, 119)).toBe(yellowDigit(3))

    const data = levelUp()
    const levelScreen = { kind: 'level-up' as const, data }
    const levelFb = createFramebuffer()
    fillSentinel(levelFb)
    const beforeLevel = cloneInputs({ frames, screen: levelScreen })
    drawBattleSettlement({
      fb: levelFb,
      screen: levelScreen,
      uiSpriteFrames: frames,
      glyphs,
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
      glyphs,
    })
    expect(cloneInputs({ frames, screen: hiddenScreen })).toEqual(beforeHidden)
    expect(pixel(hiddenFb, textDot('戊', 0, 90, 70).x, textDot('戊', 0, 90, 70).y)).toBe(0)
    expect(pixel(hiddenFb, textDot('武', 0, 106, 70).x, textDot('武', 0, 106, 70).y)).toBe(0)
    expect(pixel(hiddenFb, rightDigitX(175, 5, 0), 74)).toBe(yellowDigit(5))

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
      glyphs,
    })
    expect(cloneInputs({ frames, screen: learnScreen })).toEqual(beforeLearn)
    expect(pixel(learnFb, textDot('戊', 0, 75, 115).x, textDot('戊', 0, 75, 115).y)).toBe(0)
    expect(pixel(learnFb, textDot('雷', 0, 155, 115).x, textDot('雷', 0, 155, 115).y)).toBe(0x1b)
    expect(pixel(learnFb, textDot('雷', 0, 155, 115).x + 3, textDot('雷', 0, 155, 115).y)).not.toBe(
      0x1b,
    )
    expect(pixel(learnFb, 300, 190)).toBe(SENTINEL)
  })
})
