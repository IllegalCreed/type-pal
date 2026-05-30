/**
 * magic-inline-damage.test.ts —— E1:performMagic 内联攻击法术伤害结算。
 *
 * 对照 sdlpal `fight.c:4245-4318`(PAL_BattleCommitAction kBattleActionMagic
 * offensive 分支):跑完 scriptOnUse 后,若 `(SHORT)magic.wBaseDamage > 0`,
 * 用 `str = PAL_GetPlayerMagicStrength(role)` 对目标 / 全体敌人内联结算伤害。
 *
 * 这是「战斗法术伤害结算」的真正 keystone —— 在此 slice 之前 performMagic 不算任何
 * 伤害(calcMagicDamage 零 caller),5 个元素咒打 0 血。inline path 是 player→enemy
 * only(enemy 施法是另一 sdlpal 函数),故只在 `!casterIsEnemy` 触发。
 */

import type { BattleField, Command, Enemy, Magic, PlayerRole, PlayerRoles, Spell } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { type CommandBus, createCommandBus } from '../../command-bus.js'
import { runScript } from '../../event-system.js'
import { createInitialGameState } from '../../game-state.js'
import { createSeedableRng } from '../../rng.js'
import { performMagic, type RunScriptFn } from '../actions/magic.js'
import type { BattleState } from '../battle-state.js'

const noopRunScript: RunScriptFn = () => {}

function makeRole(opts: Partial<PlayerRole> = {}): PlayerRole {
  return {
    id: 0,
    _name: 'TestRole',
    avatar: 0,
    spriteNumInBattle: 0,
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
    ...opts,
  }
}

function makeEnemy(opts: Partial<Enemy> = {}): Enemy {
  return {
    id: 100,
    _name: 'TestEnemy',
    idleFrames: 0,
    magicFrames: 0,
    attackFrames: 0,
    idleAnimSpeed: 0,
    actWaitFrames: 0,
    yPosOffset: 0,
    attackSound: 0,
    actionSound: 0,
    magicSound: 0,
    deathSound: 0,
    callSound: 0,
    health: 100,
    exp: 10,
    cash: 30,
    level: 5,
    magic: 0,
    magicRate: 0,
    attackEquivItem: 0,
    attackEquivItemRate: 0,
    stealItem: 0,
    stealItemCount: 0,
    attackStrength: 0,
    magicStrength: 0,
    defense: 30,
    dexterity: 20,
    fleeRate: 5,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    physicalResistance: 1,
    dualMove: 0,
    collectValue: 0,
    ...opts,
  }
}

function makeMagic(opts: Partial<Magic> = {}): Magic {
  return {
    id: 3,
    effect: 0,
    type: 'normal',
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
    costMP: 5,
    baseDamage: 45,
    elemental: 1,
    sound: 0,
    ...opts,
  }
}

function makeSpell(opts: Partial<Spell> = {}): Spell {
  return {
    id: 7,
    _name: 'TestSpell',
    magicNumber: 3,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    scriptDesc: 0,
    flags: { usableOutsideBattle: false, usableInBattle: true, usableToEnemy: true, applyToAll: false },
    ...opts,
  }
}

function makeState(role: Partial<PlayerRole>, enemies: Partial<Enemy>[], fieldEffect?: BattleField['magicEffect']): {
  state: BattleState
  playerRoles: PlayerRoles
  bus: CommandBus
} {
  const r = makeRole(role)
  const field: BattleField = { id: 0, screenWave: 0, magicEffect: fieldEffect ?? { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } }
  // 固定 rngFactor = 1.0(next()=0 → 1 + 0*0.1)
  const rng = { ...createSeedableRng(1), next: () => 0 }
  const state: BattleState = {
    players: [{ roleId: 0, prevHp: r.hp, prevMp: r.mp, defending: false, status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false } }],
    enemies: enemies.map((e) => {
      const en = makeEnemy(e)
      return { e: en, status: { sleep: 0, paralyzed: 0, confused: 0, haste: false, slow: false }, prevHp: en.health, scriptOnTurnStart: 0, scriptOnBattleEnd: 0, scriptOnReady: 0 }
    }),
    field,
    isBoss: false,
    phase: 'performAction',
    turn: 1,
    actionQueue: [],
    currentActionIndex: 0,
    pendingActions: new Map(),
    uiState: 'hidden',
    uiCursor: 0,
    expGained: 0,
    cashGained: 0,
    rng,
    phaseStallTicks: 0,
  }
  return { state, playerRoles: { roles: [r] }, bus: createCommandBus() }
}

const commands: Command[] = [{ op: 'end' }]

describe('performMagic E1: inline 攻击法术伤害(player→enemy)', () => {
  it('单体攻击法术 → enemy 落血(手算 50)+ emit showDamageNum', () => {
    const { state, playerRoles, bus } = makeState(
      { mp: 30, magicStrength: 64 },
      [{ health: 100, defense: 30, level: 5, elemResistance: { wind: 5, thunder: 0, water: 0, fire: 0, earth: 0 } }],
    )
    performMagic({
      state, casterIsEnemy: false, casterIdx: 0, spellId: 7,
      targetIsEnemy: true, targetIdx: 0,
      spells: [makeSpell()], magics: [makeMagic({ baseDamage: 45, elemental: 1 })],
      playerRoles, bus, commands, runScript: noopRunScript,
    })
    // def=30+44=74; calcBase(64,74)=20; /4=5; +45=50; elem1 windRes5: *5 /5=50; field0: *10/10=50
    expect(state.enemies[0]!.e.health).toBe(50)
    const ops = bus.drain().map(c => c.cmd.op)
    expect(ops).toContain('showDamageNum')
  })

  it('applyToAll 法术 → 全体敌人落血', () => {
    const { state, playerRoles, bus } = makeState(
      { mp: 30, magicStrength: 64 },
      [
        { health: 100, defense: 30, level: 5, elemResistance: { wind: 5, thunder: 0, water: 0, fire: 0, earth: 0 } },
        { health: 100, defense: 30, level: 5, elemResistance: { wind: 5, thunder: 0, water: 0, fire: 0, earth: 0 } },
      ],
    )
    performMagic({
      state, casterIsEnemy: false, casterIdx: 0, spellId: 7,
      targetIsEnemy: true, targetIdx: 0,
      // AoE 判定按 magic.type(sdlpal FIGHT_DetectMagicTargetChange),非 flags.applyToAll
      spells: [makeSpell()],
      magics: [makeMagic({ baseDamage: 45, elemental: 1, type: 'attackAll' })],
      playerRoles, bus, commands, runScript: noopRunScript,
    })
    expect(state.enemies[0]!.e.health).toBe(50)
    expect(state.enemies[1]!.e.health).toBe(50)
  })

  it('血魔神功式(attackWhole + applyToAll=False)+ 单体 targetIdx → 仍打全体(修 bug)', () => {
    const { state, playerRoles, bus } = makeState(
      { mp: 30, magicStrength: 64 },
      [
        { health: 100, defense: 30, level: 5, elemResistance: { wind: 5, thunder: 0, water: 0, fire: 0, earth: 0 } },
        { health: 100, defense: 30, level: 5, elemResistance: { wind: 5, thunder: 0, water: 0, fire: 0, earth: 0 } },
      ],
    )
    performMagic({
      state, casterIsEnemy: false, casterIdx: 0, spellId: 7,
      targetIsEnemy: true, targetIdx: 0, // 给单体目标,但 type=attackWhole → 应全体
      spells: [makeSpell({ flags: { usableOutsideBattle: false, usableInBattle: true, usableToEnemy: true, applyToAll: false } })],
      magics: [makeMagic({ baseDamage: 45, elemental: 1, type: 'attackWhole' })],
      playerRoles, bus, commands, runScript: noopRunScript,
    })
    expect(state.enemies[0]!.e.health).toBe(50)
    expect(state.enemies[1]!.e.health).toBe(50) // 第二个也被打(type-based AoE)
  })

  it('防御类法术(applyToPlayer)→ 不对敌人结算伤害', () => {
    const { state, playerRoles, bus } = makeState(
      { mp: 30, magicStrength: 64 },
      [{ health: 100, defense: 30, level: 5 }],
    )
    performMagic({
      state, casterIsEnemy: false, casterIdx: 0, spellId: 7,
      targetIsEnemy: false, targetIdx: 0,
      spells: [makeSpell()], magics: [makeMagic({ type: 'applyToPlayer', baseDamage: 45 })],
      playerRoles, bus, commands, runScript: noopRunScript,
    })
    expect(state.enemies[0]!.e.health).toBe(100)
  })

  it('负 baseDamage 法术((SHORT)≤0)→ inline guard 不触发,不结算', () => {
    const { state, playerRoles, bus } = makeState(
      { mp: 30, magicStrength: 64 },
      [{ health: 100, defense: 30, level: 5 }],
    )
    performMagic({
      state, casterIsEnemy: false, casterIdx: 0, spellId: 7,
      targetIsEnemy: true, targetIdx: 0,
      spells: [makeSpell()], magics: [makeMagic({ baseDamage: 64537, elemental: 0 })], // SHORT −999
      playerRoles, bus, commands, runScript: noopRunScript,
    })
    expect(state.enemies[0]!.e.health).toBe(100)
  })

  it('乾坤一掷:scriptOnUse 0x88 set baseDamage by cash → E1 全体伤害(全链)', () => {
    const { state, playerRoles, bus } = makeState(
      { mp: 30, magicStrength: 0 },
      [{ health: 500, defense: 30, level: 5 }, { health: 500, defense: 30, level: 5 }],
    )
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.dwCash = 1000
    // ip1 = 0x88[394,0,0]
    const cmds: Command[] = [{ op: 'end' }, { op: 'raw', opcode: 0x88, operands: [394, 0, 0] }, { op: 'end' }]
    const spell = makeSpell({ id: 394, magicNumber: 100, scriptOnUse: 1, flags: { usableOutsideBattle: false, usableInBattle: true, usableToEnemy: true, applyToAll: true } })
    const magic = makeMagic({ id: 100, baseDamage: 0, elemental: 0, type: 'attackAll', costMP: 0 })
    performMagic({
      state, casterIsEnemy: false, casterIdx: 0, spellId: 394,
      targetIsEnemy: true, targetIdx: 'all',
      spells: [spell], magics: [magic],
      playerRoles, bus, commands: cmds, runScript,
      objectMagics: [{ id: 394, magicNumber: 100, scriptOnSuccess: 0, scriptOnUse: 0, flags: { usableOutsideBattle: false, usableInBattle: true, usableToEnemy: true, applyToAll: true } }],
      gs,
    })
    // 0x88:cash 1000 → baseDamage floor(1000*2/5)=400,cash 0;
    // E1:magStr0 → calcBase(0,74)=0 /4=0 +400=400(applyToAll → 全体)
    expect(state.enemies[0]!.e.health).toBe(100) // 500-400
    expect(state.enemies[1]!.e.health).toBe(100)
    expect(gs.dwCash).toBe(0)
  })

  it('敌人施法 → 不走 inline path(player-only),enemy 不被自己打', () => {
    const { state, playerRoles, bus } = makeState(
      { mp: 30, magicStrength: 64 },
      [{ health: 100, defense: 30, level: 5 }],
    )
    performMagic({
      state, casterIsEnemy: true, casterIdx: 0, spellId: 7,
      targetIsEnemy: false, targetIdx: 0,
      spells: [makeSpell()], magics: [makeMagic({ baseDamage: 45, elemental: 1 })],
      playerRoles, bus, commands, runScript: noopRunScript,
    })
    expect(state.enemies[0]!.e.health).toBe(100)
  })
})
