import { describe, expect, it } from 'vitest'
import { BattlePresent } from '../../battle/present-battle.js'
import { startDialogLine } from '../../dialog-box.js'
import { createFramebuffer } from '../../framebuffer.js'
import {
  battleEnemy,
  battleGs,
  battleState,
  battleView,
  enemy,
  solidBg,
} from './fixtures/battle.js'
import {
  at,
  BG,
  DIALOG,
  digitFrames,
  glyphsOf,
  image,
  MESSAGE,
  yellowDigit,
} from './fixtures/images.js'
import { bitmapView } from './fixtures/world.js'

function assets() {
  const bg = solidBg(BG)
  const frames = digitFrames()
  frames[44] = image(4, 16, 0, 0)
  frames[44]!.indices[0] = 0xb1
  frames[44]!.opaque[0] = 1
  frames[45] = image(8, 16, 0, 0)
  frames[46] = image(4, 16, 0, 0)
  return {
    bg,
    frames,
    pack: {
      battleSprites: new Map(),
      battleBgs: new Map([[0, bg]]),
      playerRoles: { roles: [] },
      spells: [],
      items: [],
      glyphs: glyphsOf(['甲', '乙']),
      uiSpriteFrames: frames,
    },
  }
}

describe('P13 战斗命令与提示寿命', () => {
  it('P13 后一条战斗消息替换前一条，对话盖住消息且到期后数字仍在上移', () => {
    const { bg, frames, pack } = assets()
    const present = new BattlePresent()
    const gs = battleGs()
    const foe = battleEnemy(enemy(9))
    const state = battleState([], [foe])
    gs.dialogBox = startDialogLine('甲', { style: 'bottom', fontColor: DIALOG })
    gs.dialogBox.charsRevealed = 1
    const commands = [
      {
        cmdId: 1,
        cmd: {
          op: 'showDamageNum' as const,
          target: { kind: 'enemy' as const, idx: 0 },
          value: 7,
          color: 'yellow' as const,
        },
      },
      {
        cmdId: 2,
        cmd: { op: 'showBattleMessage' as const, text: '甲', durationMs: 80, pos: { x: 8, y: 30 } },
      },
      {
        cmdId: 3,
        cmd: {
          op: 'showBattleMessage' as const,
          text: '乙',
          durationMs: 80,
          pos: { x: 44, y: 126 },
        },
      },
    ]
    const fb = createFramebuffer()

    const draw = (frame: number, withDialog: boolean) => {
      if (!withDialog) gs.dialogBox = undefined
      fb.indices.fill(0)
      const beforeBg = bitmapView(bg)
      const beforeFrames = bitmapView(frames[26]!)
      const beforeState = battleView(state)
      const beforeCmds = structuredClone(commands)
      present.draw(fb, gs, state, frame === 0 && withDialog ? commands : [], pack, frame)
      expect(bitmapView(bg)).toEqual(beforeBg)
      expect(bitmapView(frames[26]!)).toEqual(beforeFrames)
      expect(battleView(state)).toEqual(beforeState)
      expect(commands).toEqual(beforeCmds)
    }

    draw(0, true)
    // 单敌锚 (160,80)，伤害 x=136、y=10。5 位右对齐个位在 (160,10)，黄 7。
    expect(at(fb, 160, 10)).toBe(yellowDigit(7))
    // 第一条消息被第二条替换，(8,30) 没有消息色。
    expect(at(fb, 8, 30)).toBe(BG)
    // 对话画在消息之后，(44,126) 是正文 0x4F 而不是消息色 15。
    expect(at(fb, 44, 126)).toBe(DIALOG)

    draw(0, false)
    expect(at(fb, 44, 126)).toBe(MESSAGE)
    expect(at(fb, 160, 10)).toBe(yellowDigit(7))
    expect(at(fb, 8, 30)).toBe(BG)

    draw(2, false)
    // 80ms → 2 帧，frame 2 到期。伤害 age 2，个位上移到 y=8。
    expect(at(fb, 44, 126)).toBe(BG)
    expect(at(fb, 160, 8)).toBe(yellowDigit(7))
    expect(at(fb, 160, 10)).toBe(BG)

    present.clearFloatingNums()
    draw(2, false)
    expect(at(fb, 160, 8)).toBe(BG)
    expect(at(fb, 44, 126)).toBe(BG)
  })

  it('P13 结算框盖住消息点，演出结束后该点回到消息色', () => {
    const { bg, frames, pack } = assets()
    const present = new BattlePresent()
    const gs = battleGs()
    const state = battleState([], [])
    state.settlement = {
      screens: [{ kind: 'exp-cash', expGained: 0, cashGained: 0, isBoss: false }],
      index: 0,
      shownMs: 0,
    }
    const commands = [
      {
        cmdId: 1,
        cmd: {
          op: 'showBattleMessage' as const,
          text: '乙',
          durationMs: 800,
          pos: { x: 83, y: 60 },
        },
      },
    ]
    const fb = createFramebuffer()
    fb.indices.fill(0)
    const before = battleView(state)
    present.draw(fb, gs, state, commands, pack, 0)
    expect(battleView(state)).toEqual(before)
    expect(bitmapView(bg)).toEqual(bitmapView(solidBg(BG)))
    // 单行框左帧点在 (83,60)，盖住同坐标的消息色。
    expect(at(fb, 83, 60)).toBe(0xb1)
    expect(at(fb, 83, 60)).not.toBe(MESSAGE)

    state.settlement.index = 1
    fb.indices.fill(0)
    const afterIndex = battleView(state)
    present.draw(fb, gs, state, [], pack, 0)
    expect(battleView(state)).toEqual(afterIndex)
    expect(at(fb, 83, 60)).toBe(MESSAGE)

    present.clearFloatingNums()
    fb.indices.fill(0)
    present.draw(fb, gs, state, [], pack, 0)
    expect(at(fb, 83, 60)).toBe(BG)
    expect(bitmapView(frames[44]!)?.indices[0]).toBe(0xb1)
  })
})
