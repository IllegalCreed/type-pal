import type { InputSnapshot } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { finalizeBattleCleanup } from '../../../core/battle/battle-finalization.js'
import { startBattle, tickBattle } from '../../../core/battle/battle-system.js'
import { createCommandBus } from '../../../core/command-bus.js'
import { createInitialGameState, hydratePlayerRolesRuntime } from '../../../core/game-state.js'
import { closeTopMenu, resumeAfterMenusClosed } from '../../../core/menu/menu-stack.js'
import { enemy, role, solidBg } from '../../__tests__/grok-composition/fixtures/battle.js'
import {
  at,
  BG,
  digitFrames,
  glyphsOf,
  MESSAGE,
  WORLD,
  yellowDigit,
} from '../../__tests__/grok-composition/fixtures/images.js'
import { createFramebuffer } from '../../framebuffer.js'
import { presentBattleFrame } from '../../present.js'
import { type BattleAssets, BattlePresent } from '../present-battle.js'

// P13/P14 cover direct draw; these use core start/finalize and the production wrapper.
function host() {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = [0]
  const roles = { roles: [role(0)] }
  hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, roles)
  const field = {
    id: 0,
    screenWave: 0,
    magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
  }
  const assets: BattleAssets = {
    battleSprites: new Map(),
    battleBgs: new Map([[0, solidBg(BG)]]),
    playerRoles: roles,
    spells: [],
    items: [],
    uiSpriteFrames: digitFrames(),
    glyphs: glyphsOf(['甲']),
  }
  const fb = createFramebuffer()
  const present = new BattlePresent()
  const bus = createCommandBus()
  const start = (introFadeTicks?: number) =>
    startBattle({
      gs,
      enemyTeamId: 1,
      battleFieldId: 0,
      isBoss: false,
      enemies: [enemy(1)],
      enemyTeams: [{ id: 1, enemies: [1, 0xffff, 0xffff, 0xffff, 0xffff] }],
      battleFields: [field],
      playerRoles: roles,
      items: [],
      spells: [],
      magics: [],
      commands: [],
      rngSeed: 1,
      introFadeTicks,
    })
  const draw = () => presentBattleFrame(fb, gs, present, assets, bus.drain())
  const tick = (pressed: InputSnapshot['pressed'] = new Set()) =>
    tickBattle(gs, { held: new Set(), pressed, frameNum: gs.frameNum }, bus)
  return { gs, fb, bus, assets, start, draw, tick }
}

describe('BattlePresent production frame lifecycle', () => {
  it('captures the previous screen through the production wrapper on the first intro frame', () => {
    const h = host()
    h.fb.indices.fill(WORLD)
    h.start(6)
    expect(h.gs.battleState?.introFade).toEqual({ step: 0, total: 6 })
    expect(h.draw()).toBe(true)
    // SDLPal PAL_BattleMain backs up gpScreen before drawing the battle scene.
    expect(at(h.fb, 0, 0)).toBe(WORLD)
  })

  it('a new battle does not display the previous battle message before its timeout', () => {
    const h = host()
    h.start()
    h.bus.emit({ op: 'showBattleMessage', text: '甲', durationMs: 800 })
    h.draw()
    expect(at(h.fb, 130, 75)).toBe(MESSAGE)
    finalizeBattleCleanup(h.gs, 'fled')
    expect(h.draw()).toBe(false)
    h.gs.frameNum++
    h.start()
    h.draw()
    // PAL_StartBattle clears szMsg and dwMsgShowTime for every battle.
    expect(at(h.fb, 130, 75)).toBe(BG)
  })

  it('a new battle does not display the previous battle number before its timeout', () => {
    const h = host()
    h.start()
    h.bus.emit({
      op: 'showDamageNum',
      target: { kind: 'enemy', idx: 0 },
      value: 7,
      color: 'yellow',
    })
    h.draw()
    expect(at(h.fb, 160, 10)).toBe(yellowDigit(7))
    finalizeBattleCleanup(h.gs, 'fled')
    expect(h.draw()).toBe(false)
    h.gs.frameNum++
    h.start()
    h.draw()
    // PAL_StartBattle clears rgShowNum; the old glyph would move to y=9.
    expect(at(h.fb, 160, 9)).toBe(BG)
  })

  it('replaces an interrupted intro even without an intervening non-battle frame', () => {
    const h = host()
    h.fb.indices.fill(WORLD)
    h.start(6)
    h.draw()
    // A script can continue after finalize before the next render. Specific story reachability is unknown.
    finalizeBattleCleanup(h.gs, 'fled')
    h.fb.indices.fill(0x35)
    h.start(6)
    h.draw()
    expect(at(h.fb, 0, 0)).toBe(0x35)
  })

  it('does not borrow a previous battle summon snapshot on a new identity', () => {
    const h = host()
    h.start()
    h.gs.battleState!.battleAnim = {
      frames: [],
      idx: 0,
      frameElapsedMs: 0,
      hasSummonFade: true,
    }
    h.draw() // records the first battle scene as a summon source
    finalizeBattleCleanup(h.gs, 'fled')
    h.assets.battleBgs.set(0, solidBg(0x5a))
    h.start()
    h.gs.battleState!.battleAnim = {
      frames: [],
      idx: 0,
      frameElapsedMs: 0,
      hasSummonFade: true,
      summon: {
        spriteKey: 'god',
        frame: 0,
        pos: { x: 300, y: 190 },
        bgColorShift: 0,
        fadeDir: 'in',
        fadeStep: 0,
      },
    }
    h.draw()
    // A resumed fade without a preceding scene uses this battle's scene, never the previous battle.
    expect(at(h.fb, 1, 0)).toBe(0x5a)
  })

  it('preserves a live battle message while its status menu temporarily owns the screen', () => {
    const h = host()
    h.start()
    h.tick()
    h.tick()
    expect(h.gs.battleState?.uiState).toBe('selectMove')
    h.bus.emit({ op: 'showBattleMessage', text: '甲', durationMs: 800 })
    h.draw()
    expect(at(h.fb, 130, 75)).toBe(MESSAGE)
    const battle = h.gs.battleState
    h.tick(new Set(['Status']))
    expect(h.gs.mode).toBe('menu')
    expect(h.gs.menuStack.at(-1)?.kind).toBe('player-status')
    expect(h.draw()).toBe(false)
    closeTopMenu(h.gs)
    resumeAfterMenusClosed(h.gs)
    expect(h.gs.battleState).toBe(battle)
    expect(h.gs.mode).toBe('battle')
    h.draw()
    expect(at(h.fb, 130, 75)).toBe(MESSAGE)
  })

  it('keeps a default-duration message through temporary missing glyphs and expires at frame 20', () => {
    const h = host()
    h.start()
    const glyphs = h.assets.glyphs
    h.assets.glyphs = undefined
    h.bus.emit({ op: 'showBattleMessage', text: '甲' })
    h.draw()
    expect(at(h.fb, 130, 75)).toBe(BG)
    h.assets.glyphs = glyphs
    h.gs.frameNum = 19
    h.draw()
    expect(at(h.fb, 130, 75)).toBe(MESSAGE)
    h.gs.frameNum = 20
    h.draw()
    expect(at(h.fb, 130, 75)).toBe(BG)
  })
})
