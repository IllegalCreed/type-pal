import { describe, expect, it } from 'vitest'
import { drawBattleUI } from '../../../packages/game/src/present/battle/draw-battle-ui.js'
import { createFramebuffer } from '../../../packages/game/src/present/framebuffer.js'
import {
  battleGs,
  battlePlayer,
  battleState,
  battleView,
  role,
  rolesOf,
} from './fixtures/battle.js'
import { at, cyanDigit, digitFrames, glyphsOf, image, yellowDigit } from './fixtures/images.js'

function uiFrames() {
  const frames = digitFrames()
  frames[40] = image(1, 1, 0x06)
  frames[42] = image(1, 1, 0x06)
  frames[68] = image(1, 1, 0x68)
  return frames
}

function paint(count: number, hp: number[], frames: ReturnType<typeof uiFrames>) {
  const players = hp.map((_, index) => battlePlayer(index))
  const cast = rolesOf(hp.map((value, index) => role(index, { hp: value, maxHP: 200 })))
  const state = battleState(players, [], {
    uiState: 'selectMove',
    menuState: 'main',
    selectingPlayerIdx: count - 1,
    selectedAction: 0,
  })
  const gs = battleGs()
  const fb = createFramebuffer()
  const before = battleView(state)
  const beforeFrames = frames.map((frame) => frame.indices[0])
  drawBattleUI(fb, state, cast, [], [], gs, undefined, frames)
  expect(battleView(state)).toEqual(before)
  expect(frames.map((frame) => frame.indices[0])).toEqual(beforeFrames)
  return fb
}

describe('P15 战斗 UI 多态', () => {
  it('P15 一人二人三人的当前行动箭头和HP个位落在各自锚点', () => {
    const frames = uiFrames()
    // HP 个位：框 x=91+77*i，右对齐 4 位，pos.x+26 的个位再 +18，y=170。
    const hpAt = [
      [135, 11],
      [212, 22],
      [289, 33],
    ] as const
    // 箭头 = 锚点 + (-8,-74)。一人 (240,170)、二人第二人 (256,152)、三人第三人 (270,146)。
    const arrows = [
      [232, 96],
      [248, 78],
      [262, 72],
    ] as const

    for (let count = 1; count <= 3; count++) {
      const fb = paint(count, [11, 22, 33].slice(0, count), frames)
      for (let slot = 0; slot < 3; slot++) {
        const [x, hp] = hpAt[slot]!
        const expected = slot < count ? yellowDigit(hp % 10) : 0
        expect(at(fb, x, 170)).toBe(expected)
      }
      const [ax, ay] = arrows[count - 1]!
      expect(at(fb, ax, ay)).toBe(0x68)
      for (const [otherX, otherY] of arrows) {
        if (otherX !== ax || otherY !== ay) expect(at(fb, otherX, otherY)).not.toBe(0x68)
      }
    }
  })

  it('P15 现行MP为8时需求9与需求8的选中色和数字不同，静态MP10不参与', () => {
    const frames = uiFrames()
    const cast = rolesOf([role(0, { mp: 10 })])
    const gs = battleGs()
    gs.PlayerRolesRuntime.rgwMP[0] = 8
    const menu = {
      items: [
        { id: 1, label: '甲', rightText: 'MP 9', disabled: true },
        { id: 2, label: '乙', rightText: 'MP 8', disabled: false },
      ],
      cursor: 0,
      pageSize: 15,
      pageOffset: 0,
    }
    const state = battleState([battlePlayer(0)], [], {
      uiState: 'selectMove',
      menuState: 'magicSelect',
      selectingPlayerIdx: 0,
      magicSelect: menu,
    })
    const glyphs = glyphsOf(['甲', '乙'])
    const fb = createFramebuffer()
    const beforeRoleMp = cast.roles[0]!.mp
    const beforeRuntime = gs.PlayerRolesRuntime.rgwMP[0]
    const beforeMenu = structuredClone(menu)
    drawBattleUI(fb, state, cast, [], [], gs, glyphs, frames)
    expect(cast.roles[0]!.mp).toBe(beforeRoleMp)
    expect(gs.PlayerRolesRuntime.rgwMP[0]).toBe(beforeRuntime)
    expect(menu).toEqual(beforeMenu)
    // 需求个位 (33,14)，现行个位 (68,14)。选中但 MP 不够是 0x1C。
    expect(at(fb, 33, 14)).toBe(yellowDigit(9))
    expect(at(fb, 68, 14)).toBe(cyanDigit(8))
    expect(at(fb, 35, 54)).toBe(0x1c)

    menu.cursor = 1
    const fbOn = createFramebuffer()
    drawBattleUI(fbOn, state, cast, [], [], gs, glyphs, frames)
    expect(gs.PlayerRolesRuntime.rgwMP[0]).toBe(8)
    expect(cast.roles[0]!.mp).toBe(10)
    expect(at(fbOn, 33, 14)).toBe(yellowDigit(8))
    expect(at(fbOn, 68, 14)).toBe(cyanDigit(8))
    // 三项一列宽 87。光标在第二项时，第一项退回未选暗色 0x18，第二项是 0xF9。
    expect(at(fbOn, 35, 54)).toBe(0x18)
    expect(at(fbOn, 122, 54)).toBe(0xf9)
  })

  it('P15 缺角色的状态栏空位不画HP，数量2画青字数量1不画', () => {
    const frames = uiFrames()
    const gs = battleGs()
    const cast = rolesOf([role(0, { hp: 11 })])
    const missing = battleState([battlePlayer(0), battlePlayer(99)], [], {
      uiState: 'selectMove',
      menuState: 'main',
    })
    const fb = createFramebuffer()
    const before = battleView(missing)
    drawBattleUI(fb, missing, cast, [], [], gs, undefined, frames)
    expect(battleView(missing)).toEqual(before)
    expect(at(fb, 135, 170)).toBe(yellowDigit(1))
    expect(at(fb, 212, 170)).toBe(0)

    const itemMenu = {
      items: [{ id: 1, label: '甲', rightText: '×2', disabled: false }],
      cursor: 0,
      pageSize: 21,
      pageOffset: 0,
    }
    const items: import('../../../packages/shared/src/index.js').Item[] = []
    const withAmount = battleState([battlePlayer(0)], [], {
      uiState: 'selectMove',
      menuState: 'useItemSelect',
      itemSelect: itemMenu,
    })
    const amountFb = createFramebuffer()
    const beforeItems = [...items]
    drawBattleUI(amountFb, withAmount, cast, [], items, gs, glyphsOf(['甲']), frames)
    expect([...items]).toEqual(beforeItems)
    expect(at(amountFb, 102, 17)).toBe(cyanDigit(2))

    itemMenu.items[0]!.rightText = '×1'
    const oneFb = createFramebuffer()
    drawBattleUI(oneFb, withAmount, cast, [], items, gs, glyphsOf(['甲']), frames)
    expect(at(oneFb, 102, 17)).toBe(0)
  })

  it('P15 单人合击图标更暗，两人健康时合击图标较亮', () => {
    const frames = uiFrames()
    const gs = battleGs()
    const one = battleState([battlePlayer(0)], [], {
      uiState: 'selectMove',
      menuState: 'main',
      selectedAction: 0,
      selectingPlayerIdx: 0,
    })
    const fbOne = createFramebuffer()
    drawBattleUI(fbOne, one, rolesOf([role(0)]), [], [], gs, undefined, frames)
    // 图标低位 6 再减 4。不可用色带 0x10 → 0x12；可用色带 0 → 0x02。攻击选中仍是原色 0x06。
    expect(at(fbOne, 54, 155)).toBe(0x12)
    expect(at(fbOne, 27, 140)).toBe(0x06)

    const two = battleState([battlePlayer(0), battlePlayer(1)], [], {
      uiState: 'selectMove',
      menuState: 'main',
      selectedAction: 0,
      selectingPlayerIdx: 0,
    })
    const fbTwo = createFramebuffer()
    const before = battleView(two)
    drawBattleUI(fbTwo, two, rolesOf([role(0), role(1)]), [], [], gs, undefined, frames)
    expect(battleView(two)).toEqual(before)
    expect(at(fbTwo, 54, 155)).toBe(0x02)
    expect(at(fbTwo, 27, 140)).toBe(0x06)
  })
})
