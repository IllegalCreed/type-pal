import { describe, expect, it } from 'vitest'
import {
  makeBattleFieldRecord,
  makeEnemyRecord,
  makeRoleRecord,
} from '../../../__tests__/battle-records.js'
import {
  createInitialGameState,
  hydratePlayerRolesRuntime,
  projectRuntimeToBattleRoles,
} from '../../game-state.js'
import { createSeedableRng } from '../../rng.js'
import { createBattleState } from '../battle-state.js'
import { calcMagicDamage } from '../formulas.js'
import { applyEnemyMagicDamage, applyMagicDamage } from '../magic-damage.js'

const zeroElements = { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 }

describe('approved magic strength intermediate assignment', () => {
  it('real hydrated damage caller rounds the FLOAT product before WORD assignment, without extra RNG draws', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    const baseline = { roles: [makeRoleRecord(0, { magicStrength: 240 })] }
    hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, baseline)
    const roles = projectRuntimeToBattleRoles(gs.PlayerRolesRuntime, baseline, gs.rgEquipmentEffect)
    const rng = createSeedableRng(244049)
    const state = createBattleState({
      gs,
      playerRoles: roles,
      enemies: [makeEnemyRecord({ level: 1, defense: 2 })],
      field: makeBattleFieldRecord(),
      isBoss: false,
      rng,
    })
    const result = applyMagicDamage({
      state,
      target: 0,
      magStr: roles.roles[0]!.magicStrength,
      magicData: { baseDamage: 50, elemental: 0 },
      minDamage: 1,
    })
    // Native PAL_CalcMagicDamage O0/O2: 240*10.25 -> WORD2460 ->246;
    // base(246,30)=444; /4+50=161. The seed's first normalized sample is just below 1/4.
    expect(result).toEqual([{ enemyIdx: 0, damage: 161, hpBefore: 9000, hpAfter: 8839 }])
    expect(state.enemies[0]!.e.health).toBe(8839)
    expect(rng.getState()).toBe(1831809862)
  })

  it('the exact quarter multiplier uses C FLOAT precision rather than truncating a double just below an integer', () => {
    expect(
      calcMagicDamage({
        magStr: 240,
        def: 30,
        elemRes: zeroElements,
        poisonRes: 0,
        resistMult: 1,
        magicData: { baseDamage: 50, elemental: 0 },
        fieldEffect: zeroElements,
        rngFactor: 1.025,
      }),
    ).toBe(161)
  })

  it('an out-of-WORD intermediate keeps the existing TS growth result instead of adding integer wraparound', () => {
    // 6000*10.99 exceeds WORD. That C float-to-WORD conversion is outside this fix's defined domain.
    expect(
      calcMagicDamage({
        magStr: 6000,
        def: 0,
        elemRes: zeroElements,
        poisonRes: 0,
        resistMult: 1,
        magicData: { baseDamage: 0, elemental: 0 },
        fieldEffect: zeroElements,
        rngFactor: 1.099,
      }),
    ).toBe(3297)
  })
  it.each([
    6, 8,
  ])('real player resistance %i follows FLOAT division/product assignment before integer damage division', (windResistance) => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    const baseline = {
      roles: [
        makeRoleRecord(0, {
          hp: 100,
          defense: 80,
          elemResistance: { ...zeroElements, wind: windResistance },
        }),
      ],
    }
    hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, baseline)
    const playerRoles = projectRuntimeToBattleRoles(
      gs.PlayerRolesRuntime,
      baseline,
      gs.rgEquipmentEffect,
    )
    const state = createBattleState({
      gs,
      playerRoles,
      enemies: [makeEnemyRecord({ magicStrength: 0, level: 1 })],
      field: makeBattleFieldRecord(),
      isBoss: false,
      rng: createSeedableRng(7),
    })
    const result = applyEnemyMagicDamage({
      state,
      playerRoles,
      casterEnemyIdx: 0,
      target: 0,
      magicData: { baseDamage: 50, elemental: 1 },
      preRolledAutoDefend: new Map([[0, false]]),
    })
    // Original C bodies: the caster strength42..46 has base damage0 at defense80.
    // FLOAT resistance106/20 -> product234.9999847 -> SHORT234 ->46;
    // resistance108/20 -> product230 -> SHORT230 ->46. Double arithmetic gives47/45.
    expect(result).toEqual([
      { playerIdx: 0, damage: 46, hpBefore: 100, hpAfter: 54, autoDefend: false },
    ])
    expect(playerRoles.roles[0]!.hp).toBe(54)
  })
})
