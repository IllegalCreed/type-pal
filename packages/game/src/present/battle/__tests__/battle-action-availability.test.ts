import type { InputSnapshot } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { getBattleLiveRoles, startBattle, tickBattle } from '../../../core/battle/battle-system.js'
import { createCommandBus } from '../../../core/command-bus.js'
import { createInitialGameState, hydratePlayerRolesRuntime } from '../../../core/game-state.js'
import { enemy, role } from '../../__tests__/battle-render-fixtures.js'
import { at, solidIndexedImage as image } from '../../__tests__/raster-fixtures.js'
import { createFramebuffer } from '../../framebuffer.js'
import { drawBattleUI } from '../draw-battle-ui.js'

// Existing UI tests cover individual health/status thresholds. This checks that a
// real non-identity party uses the same live role for input rejection and icon color.
function host() {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = [2, 0]
  const roles = { roles: [role(0), role(1), role(2)] }
  hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, roles)
  const bus = createCommandBus()
  startBattle({
    gs,
    enemyTeamId: 1,
    battleFieldId: 0,
    isBoss: false,
    enemies: [enemy(1)],
    enemyTeams: [{ id: 1, enemies: [1, 0xffff, 0xffff, 0xffff, 0xffff] }],
    battleFields: [
      { id: 0, screenWave: 0, magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } },
    ],
    playerRoles: roles,
    items: [],
    spells: [],
    magics: [],
    commands: [],
    rngSeed: 1,
  })
  const tick = (pressed: InputSnapshot['pressed'] = new Set()) =>
    tickBattle(gs, { held: new Set(), pressed, frameNum: gs.frameNum }, bus)
  tick()
  tick()
  const state = gs.battleState!
  expect(state.players[0]?.roleId).toBe(2)
  expect(state.selectingPlayerIdx).toBe(0)
  expect(state.uiState).toBe('selectMove')
  const live = getBattleLiveRoles(gs)!
  const frames = Array.from({ length: 44 }, () => image(1, 1, 6))
  const paint = () => {
    const fb = createFramebuffer()
    drawBattleUI(fb, state, live, [], [], gs, undefined, frames)
    return fb
  }
  return { state, live, tick, paint }
}

describe('battle action input and rendering ownership', () => {
  it('uses the active role status, and resets an invalid selected magic to attack', () => {
    const h = host()
    h.tick(new Set(['Left']))
    expect(h.state.selectedAction).toBe(1)
    expect(at(h.paint(), 0, 155)).toBe(6) // selected, full color
    h.state.players[0]!.status.silence = 1
    h.tick()
    expect(h.state.selectedAction).toBe(0)
    expect(at(h.paint(), 0, 155)).toBe(0x12) // disabled band, brightness 6-4
  })

  it('counts live healthy companions by role ID for both cooperative input and icon', () => {
    const h = host()
    expect(at(h.paint(), 54, 155)).toBe(2) // available, not selected
    h.tick(new Set(['Right']))
    expect(h.state.selectedAction).toBe(2)
    // Party slot 1 is role 0; make that companion dying in the live battle view.
    h.live.roles[0]!.maxHP = 200
    h.live.roles[0]!.hp = 39
    h.tick()
    expect(h.state.selectedAction).toBe(0)
    expect(at(h.paint(), 54, 155)).toBe(0x12)
  })
})
