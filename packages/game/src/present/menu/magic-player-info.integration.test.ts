import type { Spell } from '@type-pal/shared'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { hydratePlayerRolesRuntime } from '../../core/game-state.js'
import { magicWithCost } from '../../core/menu/__tests__/magic-cost-fixture.js'
import {
  confirmCaster,
  confirmSpell,
  createInGameMagicMenu,
  inGameMagicMoveDown,
} from '../../core/menu/in-game-magic-menu.js'
import { openMenu } from '../../core/menu/menu-stack.js'
import { fixtureGlyphs } from '../__tests__/glyph-fixtures.js'
import { makeGs, makeRoles, resetHostSingletons } from '../__tests__/menu-state-fixtures.js'
import { makeUiFrames } from '../__tests__/menu-ui-fixtures.js'
import { fillSentinel, pixel, SENTINEL, sparseImage } from '../__tests__/raster-fixtures.js'
import type { Glyph, GlyphTable } from '../font.js'
import { createFramebuffer } from '../framebuffer.js'
import { drawMenuStack } from './draw-menu.js'

beforeEach(resetHostSingletons)
afterEach(resetHostSingletons)

function scene() {
  const gs = makeGs()
  const roles = makeRoles()
  for (const role of roles.roles) role.mp = 20
  roles.roles[1]!.magic = [300]
  gs.partyMembers = [4, 1]
  hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, roles)
  const frames = makeUiFrames()
  frames[52] = sparseImage(3, 1, [
    { x: 0, y: 0, index: 0xa4 },
    { x: 2, y: 0, index: 0xab },
  ])
  const fb = createFramebuffer()
  fillSentinel(fb)
  return { gs, roles, frames, fb }
}

function drawEachPhase(
  s: ReturnType<typeof scene>,
  poisons: Map<number, { level: number; color: number }>,
  glyphs: GlyphTable,
  checkPixels: () => void,
) {
  const spells: Spell[] = [
    {
      id: 300,
      magicNumber: 1,
      scriptOnUse: 0,
      scriptOnSuccess: 0,
      scriptDesc: 0,
      _name: '甲',
      flags: {
        usableOutsideBattle: true,
        usableInBattle: true,
        usableToEnemy: false,
        applyToAll: false,
      },
    },
  ]
  const magics = [magicWithCost(1, 0)]
  const state = createInGameMagicMenu(s.roles, s.gs.partyMembers, spells, magics)
  openMenu(s.gs, { kind: 'in-game-magic', state })
  const paint = (phase: typeof state.phase) => {
    expect(state.phase).toBe(phase)
    fillSentinel(s.fb)
    drawMenuStack(s.fb, s.gs, s.frames, glyphs, {
      playerRoles: s.roles,
      spells,
      magics,
      objectPoisons: poisons,
    })
    checkPixels()
  }
  paint('pick-caster')
  inGameMagicMoveDown(state)
  confirmCaster(state, s.roles, spells, magics)
  paint('pick-spell')
  confirmSpell(state, spells, magics)
  paint('pick-target')
}

function statusGlyphs(): GlyphTable {
  const masks = new Map<number, Glyph>()
  for (const spec of [
    { char: '乱', row: 0, col: 0 },
    { char: '定', row: 2, col: 3 },
    { char: '眠', row: 4, col: 6 },
    { char: '封', row: 6, col: 9 },
  ]) {
    const bitmap = new Uint8Array(32)
    bitmap[spec.row * 2 + Math.floor(spec.col / 8)] = 0x80 >> (spec.col % 8)
    masks.set(spec.char.charCodeAt(0), { width: 16, height: 16, bitmap })
  }
  const base = fixtureGlyphs()
  return {
    has: (cp) => masks.has(cp) || base.has(cp),
    get: (cp) => masks.get(cp) ?? base.get(cp),
  }
}

it('menu-stack 接线：队序[4,1]按队伍位置取毒，保留头像色阶与透明孔，四级毒不染色', () => {
  const s = scene()
  s.gs.rgPoisonStatus = {
    '0_0': { wPoisonID: 9, wPoisonScript: 0 },
    '1_0': { wPoisonID: 10, wPoisonScript: 0 },
  }
  drawEachPhase(
    s,
    new Map([
      [9, { level: 2, color: 0x3a }],
      [10, { level: 4, color: 0xd0 }],
    ]),
    fixtureGlyphs(),
    () => {
      expect([
        pixel(s.fb, 43, 161),
        pixel(s.fb, 45, 161),
        pixel(s.fb, 44, 161),
        pixel(s.fb, 121, 161),
      ]).toEqual([0x34, 0x3b, SENTINEL, 0xa1])
    },
  )
})

it('真实runtime角色4的四状态字使用SDLPal独立坐标与颜色', () => {
  const s = scene()
  s.gs.rgPlayerStatus[4] = [1, 2, 3, 4, 0, 0, 0, 0, 0]
  drawEachPhase(s, new Map(), statusGlyphs(), () => {
    expect([
      pixel(s.fb, 80, 184),
      pixel(s.fb, 92, 179),
      pixel(s.fb, 105, 170),
      pixel(s.fb, 109, 191),
    ]).toEqual([0x5f, 0xbf, 0x0e, 0x3c])
  })
})

it('已批准的HP0防御显示：死亡黑白覆盖毒色，保留色阶和透明孔', () => {
  const s = scene()
  s.roles.roles[4]!.hp = 0
  s.gs.PlayerRolesRuntime.rgwHP[4] = 0
  s.gs.rgPoisonStatus = { '0_0': { wPoisonID: 9, wPoisonScript: 0 } }
  drawEachPhase(s, new Map([[9, { level: 2, color: 0x3a }]]), fixtureGlyphs(), () => {
    expect([pixel(s.fb, 43, 161), pixel(s.fb, 45, 161), pixel(s.fb, 44, 161)]).toEqual([
      0x04,
      0x0b,
      SENTINEL,
    ])
  })
})
