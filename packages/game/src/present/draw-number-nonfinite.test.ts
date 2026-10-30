import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { makeHField } from '../__tests__/glm-next-wave/H/harness.js'
import { createBattleLifecycleFixture } from '../core/battle/battle-lifecycle.test-fixtures.js'
import { startBattle } from '../core/battle/battle-system.js'
import { updateAllEquipments } from '../core/equip-effect.js'
import { runScript } from '../core/event-system.js'
import {
  createInitialGameState,
  normalizePlayerRolesRuntime,
  projectRuntimeToBattleRoles,
} from '../core/game-state.js'
import { createPlayerStatus } from '../core/menu/player-status.js'
import { parseImportedSave, serializeSave } from '../tools/save-io.js'
import { createDigitFrames } from './__tests__/digit-frames.js'
import { drawNumber } from './draw-number.js'
import { createFramebuffer } from './framebuffer.js'
import { drawPlayerStatus } from './menu/draw-player-status.js'

/** Bounds synchronous nontermination without changing Vitest's timeout.
 * A hang becomes a business assertion failure; normal rendering completes in this call.
 */
function expectToFinish(draw: () => void): void {
  let failure: unknown
  try {
    runInNewContext('draw()', { draw }, { timeout: 1000 })
  } catch (error) {
    failure = error
  }
  expect(failure).toBeUndefined()
}

describe('drawNumber nonfinite failure isolation', () => {
  it.each([Infinity, -Infinity, NaN])('skips %s without changing any destination pixel', (num) => {
    const fb = createFramebuffer()
    fb.indices.fill(7)
    expectToFinish(() =>
      drawNumber(fb, num, 4, { x: 49, y: 14 }, 'yellow', 'right', createDigitFrames()),
    )
    expect(Buffer.compare(fb.indices, Buffer.alloc(320 * 200, 7))).toBe(0)
  })

  it('renders the rest of the status page after imported finite stats overflow in the real buff script', () => {
    const original = createBattleLifecycleFixture()
    original.gs.battleState = undefined
    original.gs.mode = 'explore'
    original.gs.PlayerRolesRuntime.rgwAttackStrength[0] = Number.MAX_VALUE
    const parsed = parseImportedSave(serializeSave(original.gs))
    const gs = Object.assign(createInitialGameState({ x: 0, y: 0, facing: 'down' }), parsed)
    // Relevant bootstrap load steps: base survives; saved derived equipment is rebuilt.
    gs.PlayerRolesRuntime = normalizePlayerRolesRuntime(gs.PlayerRolesRuntime)
    updateAllEquipments(gs, original.resources.items)
    expect(gs.PlayerRolesRuntime.rgwAttackStrength[0]).toBe(Number.MAX_VALUE)
    const playerRoles = projectRuntimeToBattleRoles(
      gs.PlayerRolesRuntime,
      original.playerRoles,
      gs.rgEquipmentEffect,
    )
    startBattle({
      gs,
      enemyTeamId: 0,
      battleFieldId: 0,
      isBoss: false,
      enemyTeams: [{ id: 0, enemies: [100, 0xffff, 0xffff, 0xffff, 0xffff] }],
      enemies: original.resources.enemies,
      enemyObjects: original.resources.enemyObjects,
      battleFields: [makeHField()],
      playerRoles,
      items: [],
      spells: [],
      magics: [],
      rngSeed: 7,
    })
    const state = gs.battleState
    if (!state) throw new Error('startBattle must install battle state')
    // Original extracted all.json[43028..43031]: dream-snake transformation and buffs.
    runScript({
      commands: [
        { op: 'raw', opcode: 0x31, operands: [5, 0, 0], label: 'L_43028' },
        { op: 'raw', opcode: 0x30, operands: [17, 100, 0] },
        { op: 'raw', opcode: 0x30, operands: [20, 100, 0] },
        { op: 'end' },
      ],
      ip: 0,
      bus: original.bus,
      runtimeMode: 'battle',
      battleCtx: { gs, state, playerRoles, caster: { type: 'player', idx: 0 } },
    })
    expect(playerRoles.roles[0]?.attackStrength).toBe(Infinity)
    const fb = createFramebuffer()
    expectToFinish(() =>
      drawPlayerStatus({
        fb,
        state: createPlayerStatus([0]),
        gs,
        playerRoles,
        items: [],
        uiSpriteFrames: createDigitFrames(),
      }),
    )
    // Fixed classic layout: attack is blank; the later dexterity still renders 30*2=60.
    for (let y = 102; y < 110; y++)
      expect(fb.indices.subarray(y * 320 + 42, y * 320 + 66)).toEqual(new Uint8Array(24))
    expect(fb.indices[162 * 320 + 60]).toBe(19)
    expect(fb.indices[162 * 320 + 54]).toBe(25)
  })
})
