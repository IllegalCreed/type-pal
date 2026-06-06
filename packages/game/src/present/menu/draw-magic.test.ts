import type { Command, Magic, PlayerRole, PlayerRoles, Spell } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../../core/game-state.js'
import type { InGameMagicMenuState } from '../../core/menu/in-game-magic-menu.js'
import { setGlobalEvents } from '../../core/event-system.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawInGameMagicMenu } from './draw-magic.js'

function fakeUiFrames(): Array<{ width: number; height: number; indices: Uint8Array; opaque: Uint8Array }> {
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
      casterMenu: { items: [{ id: 0, label: 'Role0', disabled: false }], cursor: 0, pageSize: 1, pageOffset: 0 },
      selectedCasterId: 0,
      spellMenu: { items: [{ id: 296, label: '气疗术', rightText: 'MP 6', disabled: false }], cursor: 0, pageSize: 15, pageOffset: 0 },
      targetCursor: 0,
      partyMembers: [0],
    }
    const playerRoles: PlayerRoles = { roles: [role(0)] }
    const spells: Spell[] = [{
      id: 296,
      _name: '气疗术',
      magicNumber: 33,
      scriptOnSuccess: 0,
      scriptOnUse: 0,
      scriptDesc: 43275,
      flags: { usableOutsideBattle: true, usableInBattle: true, usableToEnemy: false, applyToAll: false },
    }]
    const magics: Magic[] = [{
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
    }]
    const commands: Command[] = [
      { op: 'raw', opcode: 0xA7, operands: [0, 0, 0], label: 'L_43275' },
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
        uiSpriteFrames: fakeUiFrames() as Parameters<typeof drawInGameMagicMenu>[0]['uiSpriteFrames'],
      })
    } finally {
      setGlobalEvents([])
    }

    let descriptionPixels = 0
    for (let y = 3; y < 19; y++) {
      for (let x = 102; x < 260; x++) {
        if (fb.indices[y * 320 + x] === 0x3C) descriptionPixels++
      }
    }
    expect(descriptionPixels).toBeGreaterThan(0)
  })
})
