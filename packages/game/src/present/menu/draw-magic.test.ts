import type { Command, Magic, PlayerRole, PlayerRoles, Spell } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { setGlobalEvents } from '../../core/event-system.js'
import { createInitialGameState } from '../../core/game-state.js'
import type { InGameMagicMenuState } from '../../core/menu/in-game-magic-menu.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawInGameMagicMenu } from './draw-magic.js'

function fakeUiFrames(): Array<{
  width: number
  height: number
  indices: Uint8Array
  opaque: Uint8Array
}> {
  return Array.from({ length: 80 }, () => ({
    width: 4,
    height: 4,
    indices: new Uint8Array(16).fill(15),
    opaque: new Uint8Array(16).fill(1),
  }))
}

function role(id: number): PlayerRole {
  return {
    id,
    _name: `Role${id}`,
    avatar: 0,
    spriteNumInBattle: id,
    spriteNum: 0,
    name: 0,
    attackAll: 0,
    level: 10,
    maxHP: 200,
    maxMP: 30,
    hp: 200,
    mp: 30,
    attackStrength: 0,
    magicStrength: 0,
    defense: 0,
    dexterity: 30,
    fleeRate: 5,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    walkFrames: 0,
    attackSound: 0,
    weaponSound: 0,
    criticalSound: 0,
    magicSound: 0,
    deathSound: 0,
  }
}

describe('drawInGameMagicMenu', () => {
  it('pick-spell 画选中仙术 scriptDesc 说明(magicmenu.c:191)', () => {
    const fb = createFramebuffer()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.PlayerRolesRuntime.rgwHP[0] = 200
    gs.PlayerRolesRuntime.rgwMaxHP[0] = 200
    gs.PlayerRolesRuntime.rgwMP[0] = 30
    gs.PlayerRolesRuntime.rgwMaxMP[0] = 30

    const state: InGameMagicMenuState = {
      phase: 'pick-spell',
      casterMenu: {
        items: [{ id: 0, label: 'Role0', disabled: false }],
        cursor: 0,
        pageSize: 1,
        pageOffset: 0,
      },
      selectedCasterId: 0,
      spellMenu: {
        items: [{ id: 296, label: '气疗术', rightText: 'MP 6', disabled: false }],
        cursor: 0,
        pageSize: 15,
        pageOffset: 0,
      },
      targetCursor: 0,
      partyMembers: [0],
    }
    const playerRoles: PlayerRoles = { roles: [role(0)] }
    const spells: Spell[] = [
      {
        id: 296,
        _name: '气疗术',
        magicNumber: 33,
        scriptOnSuccess: 0,
        scriptOnUse: 0,
        scriptDesc: 43275,
        flags: {
          usableOutsideBattle: true,
          usableInBattle: true,
          usableToEnemy: false,
          applyToAll: false,
        },
      },
    ]
    const magics: Magic[] = [
      {
        id: 33,
        effect: 0,
        type: 'applyToPlayer',
        xOffset: 0,
        yOffset: 0,
        special: 0,
        speed: 0,
        keepEffect: 0,
        fireDelay: 0,
        effectTimes: 0,
        shake: 0,
        wave: 0,
        unknown: 0,
        costMP: 6,
        baseDamage: 0,
        elemental: 0,
        sound: 0,
      },
    ]
    const commands: Command[] = [
      { op: 'raw', opcode: 0xa7, operands: [0, 0, 0], label: 'L_43275' },
      { op: 'showDialog', messageIndex: 1, text: '回复少量体力。' },
      { op: 'end' },
    ]

    setGlobalEvents(commands)
    try {
      drawInGameMagicMenu({
        fb,
        state,
        gs,
        playerRoles,
        spells,
        magics,
        uiSpriteFrames: fakeUiFrames() as Parameters<
          typeof drawInGameMagicMenu
        >[0]['uiSpriteFrames'],
      })
    } finally {
      setGlobalEvents([])
    }

    let descriptionPixels = 0
    for (let y = 3; y < 19; y++) {
      for (let x = 102; x < 260; x++) {
        if (fb.indices[y * 320 + x] === 0x3c) descriptionPixels++
      }
    }
    expect(descriptionPixels).toBeGreaterThan(0)
  })

  // L8(magicmenu.c:208-215 WIN95 path):pick-spell 显示 scriptDesc 说明时,MP 框/数字应在【左侧】
  //   (slash 45,14 / needed 15,14 / current 50,14),且无金钱框、无右侧 MP(215~265)。否则
  //   说明文字(x≥102)会盖住右侧 MP(用户实测)。与战斗法术菜单共用 sdlpal 同一函数,布局一致。
  it('L8:pick-spell 用 WIN95 布局 —— MP 在左侧,右侧 MP 区(215~265)无 slash/MP sprite', () => {
    const fb = createFramebuffer()
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.PlayerRolesRuntime.rgwMP[0] = 30
    gs.PlayerRolesRuntime.rgwMaxMP[0] = 30
    const state: InGameMagicMenuState = {
      phase: 'pick-spell',
      casterMenu: {
        items: [{ id: 0, label: 'Role0', disabled: false }],
        cursor: 0,
        pageSize: 1,
        pageOffset: 0,
      },
      selectedCasterId: 0,
      spellMenu: {
        items: [{ id: 296, label: '气疗术', rightText: 'MP 6', disabled: false }],
        cursor: 0,
        pageSize: 15,
        pageOffset: 0,
      },
      targetCursor: 0,
      partyMembers: [0],
    }
    const playerRoles: PlayerRoles = { roles: [role(0)] }
    const spells: Spell[] = [
      {
        id: 296,
        _name: '气疗术',
        magicNumber: 33,
        scriptOnSuccess: 0,
        scriptOnUse: 0,
        scriptDesc: 0,
        flags: {
          usableOutsideBattle: true,
          usableInBattle: true,
          usableToEnemy: false,
          applyToAll: false,
        },
      },
    ]
    const magics: Magic[] = [
      {
        id: 33,
        effect: 0,
        type: 'applyToPlayer',
        xOffset: 0,
        yOffset: 0,
        special: 0,
        speed: 0,
        keepEffect: 0,
        fireDelay: 0,
        effectTimes: 0,
        shake: 0,
        wave: 0,
        unknown: 0,
        costMP: 6,
        baseDamage: 0,
        elemental: 0,
        sound: 0,
      },
    ]
    drawInGameMagicMenu({
      fb,
      state,
      gs,
      playerRoles,
      spells,
      magics,
      uiSpriteFrames: fakeUiFrames() as Parameters<typeof drawInGameMagicMenu>[0]['uiSpriteFrames'],
    })
    // SPRITENUM_SLASH(39)=4×4 index-15 块;UI 数字 sprite 同为 index-15。
    const count15 = (x0: number, x1: number, y0: number, y1: number): number => {
      let n = 0
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) if (fb.indices[y * 320 + x] === 15) n++
      return n
    }
    // 右侧 MP 区(buggy:slash@260 + current@265 + needed@230)WIN95 下应清空
    expect(count15(216, 272, 12, 19)).toBe(0)
    // 左侧 MP 区(WIN95:needed@15 + slash@45 + current@50)应有写入
    expect(count15(14, 55, 12, 19)).toBeGreaterThan(0)
  })
})
