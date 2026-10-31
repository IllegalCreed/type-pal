/** QUALITY-BATTLE-MAGIC-PARITY-1: real script dispatch, typed state, SDLPal control-flow oracles. */
import type { Command, Magic, ObjectMagicView, Spell } from '@type-pal/shared'
import { describe, expect, it, vi } from 'vitest'
import { makeBattleFixture } from '../../../__tests__/battle-fixture.js'
import { makeEnemyRecord, makeRoleRecord } from '../../../__tests__/battle-records.js'
import { runScript } from '../../event-system.js'
import { hydratePlayerRolesRuntime, projectRuntimeToBattleRoles } from '../../game-state.js'
import { createSeedableRng } from '../../rng.js'
import { performMagic } from '../actions/magic.js'
import { performThrowItem } from '../actions/throw-item.js'
import { advanceBattleAnimFrames } from '../battle-anim-driver.js'
import type { BattleState } from '../battle-state.js'
import { simulateMagic } from '../magic-damage.js'

function magic(baseDamage: number): Magic {
  return {
    id: 53,
    type: 'normal',
    effect: 7,
    xOffset: 0,
    yOffset: 0,
    special: 0,
    speed: 0,
    keepEffect: 0,
    fireDelay: 1,
    effectTimes: 0,
    shake: 0,
    wave: 0,
    unknown: 0,
    costMP: 0,
    baseDamage,
    elemental: 0,
    sound: 0,
  }
}

function objectMagic(applyToAll = false): ObjectMagicView {
  return {
    id: 344,
    magicNumber: 53,
    scriptOnUse: 0,
    scriptOnSuccess: 0,
    flags: {
      usableOutsideBattle: false,
      usableInBattle: true,
      usableToEnemy: true,
      applyToAll,
    },
  }
}

function battle() {
  const b = makeBattleFixture({
    roles: [makeRoleRecord(0), makeRoleRecord(1), makeRoleRecord(2, { attackStrength: 50 })],
    party: [2, 0],
    enemies: [makeEnemyRecord({ health: 1000, defense: 0, level: 0 }), makeEnemyRecord()],
  })
  b.gs.mode = 'battle'
  hydratePlayerRolesRuntime(b.gs.PlayerRolesRuntime, b.playerRoles)
  b.state.enemies[0]!.posOriginal = { x: 150, y: 100 }
  b.state.enemies[1]!.posOriginal = { x: 100, y: 80 }
  b.state.rng = { ...createSeedableRng(7), next: vi.fn(() => 0) }
  return b
}

function simulate(
  state: BattleState,
  targetIdx?: number,
  applyToAll = false,
  type: Magic['type'] = 'normal',
) {
  return simulateMagic({
    state,
    targetIdx,
    magicObjId: 344,
    magStr: 0,
    objectMagics: [objectMagic(applyToAll)],
    magics: [{ ...magic(198), type }],
  })
}

describe('SDLPal simulated magic target (fight.c:87-128, 5330-5400)', () => {
  it.each([
    { base: 198, health: 9000 },
    { base: 0, health: 9000 },
    { base: 198, health: 100 },
  ])('0x42 uses the previous living target for damage and FIRE landing (base=$base, hp=$health)', ({
    base,
    health,
  }) => {
    const b = battle()
    b.state.iPrevEnemyTarget = 1
    b.state.enemies[1]!.e.health = health
    const pendingAnimFrames: NonNullable<BattleState['battleAnim']>['frames'] = []
    const commands: Command[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x42, operands: [344, 0, 0] },
      { op: 'end' },
    ]
    runScript({
      commands,
      ip: 1,
      bus: b.bus,
      runtimeMode: 'battle',
      battleCtx: {
        state: b.state,
        gs: b.gs,
        magicTables: { magics: [magic(base)], objectMagics: [objectMagic()] },
        pendingAnimFrames,
        magicSpriteFrameCounts: new Map([[7, 1]]),
      },
    })
    expect(b.state.enemies.map((e) => e.e.health)).toEqual([1000, Math.max(0, health - base)])
    // Normal FIRE lands at the selected enemy's anchor, including zero-damage sentinels.
    expect(pendingAnimFrames.flatMap((f) => f.overlays ?? []).map((o) => [o.x, o.y])).toEqual([
      [100, 80],
    ])
  })

  it.each(['dead', 'cleared', 'out-of-range'] as const)('ignores a %s previous target', (kind) => {
    const { state } = battle()
    state.iPrevEnemyTarget = kind === 'out-of-range' ? 5 : 1
    if (kind === 'dead') state.enemies[1]!.e.health = 0
    if (kind === 'cleared') state.enemies[1]!.defeated = true
    expect(simulate(state).map((r) => r.enemyIdx)).toEqual([0])
  })

  it('explicit target wins over previous; applyToAll wins over explicit', () => {
    const { state } = battle()
    state.iPrevEnemyTarget = 1
    expect(simulate(state, 0).map((r) => r.enemyIdx)).toEqual([0])
    expect(simulate(state, 0, true).map((r) => r.enemyIdx)).toEqual([0, 1])
  })

  it('all dead but uncleared: selector -1 continues through all occupied slots', () => {
    const { state } = battle()
    state.enemies.forEach((e) => {
      e.e.health = 0
    })
    // C normal animation asserts target!=-1 (fight.c:2744); use a whole-field magic
    // whose object flag does not force all, so the auto-selection failure is legal.
    expect(
      simulate(state, undefined, false, 'attackWhole').map((r) => [
        r.enemyIdx,
        r.hpBefore,
        r.hpAfter,
      ]),
    ).toEqual([
      [0, 0, 0],
      [1, 0, 0],
    ])
    expect(state.rng.next).toHaveBeenCalledTimes(2)
  })
})

describe('SDLPal 0x66 raw runtime attack (script.c:2007-2014)', () => {
  it.each([
    50, 0,
  ])('changing equipment/Extra leaves the throw unchanged (raw attack=%i)', (rawAttack) => {
    const throwWithBonus = (bonus: number): number => {
      const b = battle()
      b.gs.PlayerRolesRuntime.rgwAttackStrength[2] = rawAttack
      b.gs.rgEquipmentEffect[0]!.rgwAttackStrength[2] = bonus
      b.gs.rgEquipmentEffect[6]!.rgwAttackStrength[2] = bonus
      const playerRoles = projectRuntimeToBattleRoles(
        b.gs.PlayerRolesRuntime,
        b.playerRoles,
        b.gs.rgEquipmentEffect,
      )
      b.state.rng.rangeInclusive = vi.fn(() => 2) // legal K in [0,3]; multiplier next()=0 → 1.0
      b.gs.inventory = [{ itemId: 163, count: 1 }]
      performThrowItem({
        ...b,
        playerRoles,
        casterIsEnemy: false,
        casterIdx: 0, // party [2,0]: role 2, not array slot 0
        itemId: 163,
        targetIdx: 0,
        items: [
          {
            id: 163,
            _name: '长鞭',
            bitmap: 0,
            price: 0,
            scriptOnUse: 0,
            scriptOnEquip: 0,
            scriptOnThrow: 1,
            scriptDesc: 0,
            flags: {
              usable: false,
              equipable: true,
              throwable: true,
              consuming: true,
              applyToAll: false,
              sellable: true,
              equipableBy: [true, false, false, false, false, false],
            },
          },
        ],
        commands: [
          { op: 'end' },
          { op: 'raw', opcode: 0x66, operands: [344, 10, 0] },
          { op: 'end' },
        ],
        magics: [magic(198)],
        objectMagics: [objectMagic()],
        objectPoisons: [],
        runScript,
      })
      expect(b.gs.inventory[0]!.count).toBe(0)
      expect(b.state.rng.rangeInclusive).toHaveBeenCalledExactlyOnceWith(0, 3)
      return 1000 - b.state.enemies[0]!.e.health
    }
    // M=50+A*2; D=(0+6)*4=24; damage=trunc((2*M-1.6*24+.5)/4)+198.
    const expected = rawAttack === 50 ? 263 : 213
    expect([throwWithBonus(0), throwWithBonus(100)]).toEqual([expected, expected])
  })
})

describe('SDLPal non-damaging enemy magic auto-defend (fight.c:4719-4768)', () => {
  it.each([
    'normal',
    'attackAll',
  ] as const)('%s pre-roll precedes real sleep script and reaches frame3 without damage', (type) => {
    const b = battle()
    const trace: string[] = []
    b.state.rng.range = vi.fn((lo, hi) => {
      trace.push(`range(${lo},${hi})`)
      return lo
    })
    const spell: Spell = { ...objectMagic(), _name: '睡眠', scriptDesc: 0, scriptOnUse: 1 }
    const m = { ...magic(0), type }
    performMagic({
      ...b,
      casterIsEnemy: true,
      casterIdx: 0,
      spellId: 344,
      targetIsEnemy: false,
      targetIdx: 0,
      spells: [spell],
      magics: [m],
      objectMagics: [objectMagic()],
      commands: [{ op: 'end' }, { op: 'raw', opcode: 0x2d, operands: [2, 2, 0] }, { op: 'end' }],
      runScript: (opts) => {
        trace.push('script')
        return runScript(opts)
      },
      magicSpriteFrameCounts: new Map([[7, 1]]),
    })
    expect(trace).toEqual(
      type === 'normal' ? ['range(0,3)', 'script'] : ['range(0,3)', 'range(0,3)', 'script'],
    )
    expect(b.state.players[0]!.status.sleep).toBe(2)
    expect(b.playerRoles.roles.map((r) => r.hp)).toEqual([500, 500, 500])
    const defended = b.state.battleAnim?.frames
      .flatMap((f) => f.fighters ?? [])
      .filter((f) => f.side === 'player' && f.currentFrame === 3)
      .map((f) => f.idx)
    expect(defended).toEqual(type === 'normal' ? [0] : [0, 1])
    const frames = b.state.battleAnim!.frames
    const guardIdx = frames.findIndex((f) =>
      f.fighters?.some((d) => d.side === 'player' && d.currentFrame === 3),
    )
    const effectIdx = frames.findIndex((f) => (f.overlays?.length ?? 0) > 0)
    expect(guardIdx).toBeLessThan(effectIdx)
    advanceBattleAnimFrames(
      b.state,
      b.bus,
      frames.slice(0, guardIdx).reduce((ms, f) => ms + f.durationMs, 0),
    )
    expect(b.state.players.map((p) => p.currentFrame)).toEqual(type === 'normal' ? [3, 0] : [3, 3])
    expect(b.state.rng.next).not.toHaveBeenCalled() // no inline damage RNG
  })

  it.each([
    'sleep',
    'miss',
    'player',
  ] as const)('%s does not acquire an auto-defend pose', (reason) => {
    const b = battle()
    if (reason === 'sleep') b.state.players[0]!.status.sleep = 2
    b.state.rng.range = vi.fn(() => 1) // legal non-winning roll
    const spell: Spell = { ...objectMagic(), _name: '辅助', scriptDesc: 0 }
    performMagic({
      ...b,
      casterIsEnemy: reason !== 'player',
      casterIdx: 0,
      spellId: 344,
      targetIsEnemy: reason === 'player',
      targetIdx: 0,
      spells: [spell],
      magics: [magic(0)],
      commands: [{ op: 'end' }],
      runScript,
      magicSpriteFrameCounts: new Map([[7, 1]]),
    })
    expect(b.state.rng.range).toHaveBeenCalledTimes(reason === 'miss' ? 1 : 0)
    expect(
      b.state
        .battleAnim!.frames.flatMap((f) => f.fighters ?? [])
        .filter((f) => f.side === 'player' && f.currentFrame === 3),
    ).toEqual([])
  })
})
