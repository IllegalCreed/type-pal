import { afterEach, describe, expect, it } from 'vitest'
import type { LevelUpScreenData } from '../../../../packages/game/src/core/battle/battle-settlement.js'
import { setWordTable } from '../../../../packages/game/src/core/word-lookup.js'
import { drawBattleSettlement } from '../../../../packages/game/src/present/battle/draw-battle-settlement.js'
import { createFramebuffer } from '../../../../packages/game/src/present/framebuffer.js'
import { fixtureGlyphs, textDot } from '../fixtures/font.js'
import {
  ARROW_ID,
  fillSentinel,
  makeUiFrames,
  midOnesX,
  pixel,
  rightDigitX,
  SENTINEL,
  yellowDigit,
} from '../fixtures/images.js'
import { resetHostSingletons } from '../fixtures/world.js'

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
    drawBattleSettlement({
      fb: expFb,
      screen: { kind: 'exp-cash', expGained: 12, cashGained: 34, isBoss: false },
      uiSpriteFrames: frames,
      glyphs,
    })
    expect(pixel(expFb, textDot('获', 0, 95, 70).x, textDot('获', 0, 95, 70).y)).toBe(0)
    expect(pixel(expFb, textDot('获', 0, 95, 70).x + 3, textDot('获', 0, 95, 70).y)).not.toBe(0)
    expect(pixel(expFb, rightDigitX(182, 5, 0), 74)).toBe(yellowDigit(2))
    expect(pixel(expFb, rightDigitX(182, 5, 1), 74)).toBe(yellowDigit(1))
    expect(pixel(expFb, midOnesX(162, 5, 2), 119)).toBe(yellowDigit(4))
    expect(pixel(expFb, midOnesX(162, 5, 2) - 6, 119)).toBe(yellowDigit(3))

    const data = levelUp()
    const levelFb = createFramebuffer()
    fillSentinel(levelFb)
    const before = structuredClone(data)
    drawBattleSettlement({
      fb: levelFb,
      screen: { kind: 'level-up', data },
      uiSpriteFrames: frames,
      glyphs,
    })
    expect(data).toEqual(before)
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
    drawBattleSettlement({
      fb: hiddenFb,
      screen: {
        kind: 'hidden-exp-up',
        data: { roleId: 4, name: '戊', statLabelWord: 51, delta: 5 },
      },
      uiSpriteFrames: frames,
      glyphs,
    })
    expect(pixel(hiddenFb, textDot('戊', 0, 90, 70).x, textDot('戊', 0, 90, 70).y)).toBe(0)
    expect(pixel(hiddenFb, textDot('武', 0, 106, 70).x, textDot('武', 0, 106, 70).y)).toBe(0)
    expect(pixel(hiddenFb, rightDigitX(175, 5, 0), 74)).toBe(yellowDigit(5))

    const learnFb = createFramebuffer()
    fillSentinel(learnFb)
    drawBattleSettlement({
      fb: learnFb,
      screen: { kind: 'learn-magic', data: { roleId: 4, name: '戊', magicName: '雷' } },
      uiSpriteFrames: frames,
      glyphs,
    })
    expect(pixel(learnFb, textDot('戊', 0, 75, 115).x, textDot('戊', 0, 75, 115).y)).toBe(0)
    expect(pixel(learnFb, textDot('雷', 0, 155, 115).x, textDot('雷', 0, 155, 115).y)).toBe(0x1b)
    expect(pixel(learnFb, textDot('雷', 0, 155, 115).x + 3, textDot('雷', 0, 155, 115).y)).not.toBe(
      0x1b,
    )
    expect(pixel(learnFb, 300, 190)).toBe(SENTINEL)
  })
})
