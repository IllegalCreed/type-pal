/** Battle dispatch: damage, HP/MP recovery, revival and magic costs. Real dispatcher; phase scheduling stays in battle-system. */
import type { Magic, ObjectMagicView, ObjectPoisonView } from '@type-pal/shared'
import { afterEach, describe, expect, it } from 'vitest'
import {
  makeEnemyRecord as makeEnemy,
  makeRoleRecord as makeRole,
} from '../../__tests__/battle-records.js'
import { makeBattle, seqRng } from '../../__tests__/coverage85-glm-game/harness.js'
import type { BattleCtx } from '../event-system.js'
import { hydratePlayerRolesRuntime } from '../game-state.js'
import { setObjectPoisons } from '../player-poison-state.js'
import { damageNums } from './battle-opcode.test-fixtures.js'
import { dispatchBattleOpcode } from './battle-opcodes.js'

function makeMagic(id: number, overrides: Partial<Magic> = {}): Magic {
  return {
    id,
    effect: 1,
    type: 'normal',
    xOffset: 0,
    yOffset: 0,
    special: 0,
    speed: 5,
    keepEffect: 0,
    fireDelay: 0,
    effectTimes: 1,
    shake: 0,
    wave: 0,
    unknown: 0,
    costMP: 0,
    baseDamage: 0,
    elemental: 0,
    sound: 0,
    ...overrides,
  }
}

function makeObjectMagic(
  id: number,
  magicNumber: number,
  overrides: Partial<ObjectMagicView> = {},
): ObjectMagicView {
  return {
    id,
    magicNumber,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    flags: {
      usableOutsideBattle: false,
      usableInBattle: true,
      usableToEnemy: true,
      applyToAll: false,
    },
    ...overrides,
  }
}

const poison = (id: number, enemyScript: number): ObjectPoisonView => ({
  id,
  level: 2,
  color: 0,
  playerScript: 0,
  enemyScript,
})
afterEach(() => setObjectPoisons([]))
describe('0x42 SimulateMagic 目标解析与特效音', () => {
  it('op2 显式目标(op2-1≥0)→ 只打指定敌;applyToAll → 全体活敌各中一发', () => {
    const { gs, state, playerRoles, bus } = makeBattle({
      enemies: [makeEnemy({ health: 9000 }), makeEnemy({ id: 101, health: 9000 }), null],
      rng: seqRng([3, 3, 3, 3, 3, 3, 3, 3]),
    })
    const magics = [makeMagic(0, { baseDamage: 200 })]
    const objectMagics = [makeObjectMagic(24, 0)]
    const ctx: BattleCtx = {
      state,
      gs,
      bus,
      playerRoles,
      magicTables: { magics, objectMagics },
    }
    const h0 = state.enemies[0]!.e.health
    const h1 = state.enemies[1]!.e.health
    // 显式目标 = op2-1 = 1
    expect(dispatchBattleOpcode(0x42, [24, 50, 2], ctx).consumed).toBe(true)
    expect(state.enemies[0]!.e.health).toBe(h0)
    expect(state.enemies[1]!.e.health).toBeLessThan(h1)
    // applyToAll → 两个活敌都掉血
    objectMagics[0] = makeObjectMagic(24, 0, {
      flags: {
        usableOutsideBattle: false,
        usableInBattle: true,
        usableToEnemy: true,
        applyToAll: true,
      },
    })
    const h0b = state.enemies[0]!.e.health
    const h1b = state.enemies[1]!.e.health
    expect(dispatchBattleOpcode(0x42, [24, 50, 0], ctx).consumed).toBe(true)
    expect(state.enemies[0]!.e.health).toBeLessThan(h0b)
    expect(state.enemies[1]!.e.health).toBeLessThan(h1b)
  })

  it('无 magicTables → consumed no-op,零变异(state.enemies 不动)', () => {
    const { state } = makeBattle()
    const ctx: BattleCtx = { state }
    const h = state.enemies[0]!.e.health
    expect(dispatchBattleOpcode(0x42, [24, 50, 0], ctx)).toEqual({ consumed: true })
    expect(state.enemies[0]!.e.health).toBe(h)
  })

  it('有表无特效上下文且 mg.sound>0 → magic.sound 即时进 gs.pendingSounds', () => {
    const { gs, state } = makeBattle()
    const ctx: BattleCtx = {
      state,
      gs,
      magicTables: {
        magics: [makeMagic(0, { baseDamage: 0, sound: 33 })],
        objectMagics: [makeObjectMagic(24, 0)],
      },
    }
    // baseDamage=0 且 magStr=0 → simulateMagic guard 不过(零伤害 sentinel),但 OffMagic 音仍即时
    dispatchBattleOpcode(0x42, [24, 0, 0], ctx)
    expect(gs.pendingSounds).toContain(33)
  })
})
describe('0x66 ThrowWeapon 攻击力系数', () => {
  it('player caster 使用已hydrate的裸武术60与roll2，精确造成313伤害', () => {
    const rng = seqRng([2])
    const { gs, state, playerRoles, bus } = makeBattle({ rng })
    hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, playerRoles)
    const ctx: BattleCtx = {
      state,
      gs,
      bus,
      playerRoles,
      caster: { type: 'player', idx: 0 },
      target: { type: 'enemy', idx: 0 },
      magicTables: {
        magics: [makeMagic(0, { baseDamage: 200 })],
        objectMagics: [makeObjectMagic(24, 0)],
      },
    }
    const h = state.enemies[0]!.e.health
    // w=30*5+60*2=270；敌防御10+(5+6)*4=54。
    // 无元素、倍率1：trunc(trunc(270*2-54*1.6+0.5)/4)+200=313。
    expect(dispatchBattleOpcode(0x66, [24, 30, 0], ctx).consumed).toBe(true)
    expect(state.enemies[0]!.e.health).toBe(h - 313)
    expect(damageNums(bus.drain())).toEqual([
      { op: 'showDamageNum', target: { kind: 'enemy', idx: 0 }, value: 313, color: 'blue' },
    ])
    expect(rng.calls[0]).toBe('rangeInclusive(0,3)')
  })

  it('enemy caster 无玩家武术项，操作数150仍造成53伤害', () => {
    const { gs, state, bus } = makeBattle({ rng: seqRng([1, 3, 3, 3, 3, 3, 3, 3]) })
    const ctx: BattleCtx = {
      state,
      gs,
      bus,
      caster: { type: 'enemy', idx: 0 },
      target: { type: 'enemy', idx: 0 },
      magicTables: {
        magics: [makeMagic(0, { baseDamage: 0 })],
        objectMagics: [makeObjectMagic(24, 0)],
      },
    }
    const h = state.enemies[0]!.e.health
    // w = 30*5 + 0*roll = 150
    expect(dispatchBattleOpcode(0x66, [24, 30, 0], ctx).consumed).toBe(true)
    expect(state.enemies[0]!.e.health).toBe(h - 53)
  })
})
describe('0x21 InflictDamage 全体/单体/超杀钳零', () => {
  it('op0≠0 全体:活敌各扣 op1,死敌(defeated)跳过', () => {
    const { state, bus } = makeBattle({
      enemies: [makeEnemy({ health: 100 }), makeEnemy({ id: 101, health: 100 }), null],
    })
    state.enemies[1]!.defeated = true
    const ctx: BattleCtx = { state, bus }
    expect(dispatchBattleOpcode(0x21, [1, 30, 0], ctx).consumed).toBe(true)
    expect(state.enemies[0]!.e.health).toBe(70)
    expect(state.enemies[1]!.e.health).toBe(100)
    const events = damageNums(bus.drain())
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      target: { kind: 'enemy', idx: 0 },
      value: 30,
      color: 'blue',
    })
  })

  it('op0=0 单体超杀:health 钳 0,显示完整算出伤害(fullDamage)', () => {
    const { state, bus } = makeBattle({ enemies: [makeEnemy({ health: 10 })] })
    const ctx: BattleCtx = { state, bus, target: { type: 'enemy', idx: 0 } }
    expect(dispatchBattleOpcode(0x21, [0, 999, 0], ctx).consumed).toBe(true)
    expect(state.enemies[0]!.e.health).toBe(0)
    const events = damageNums(bus.drain())
    expect(events[0]).toMatchObject({ value: 999, color: 'blue' })
  })

  it('op0=0 且无 ctx.target → 空操作零变异', () => {
    const { state } = makeBattle()
    const ctx: BattleCtx = { state }
    const h = state.enemies[0]!.e.health
    expect(dispatchBattleOpcode(0x21, [0, 30, 0], ctx).consumed).toBe(true)
    expect(state.enemies[0]!.e.health).toBe(h)
  })
})
describe('0x57/0x88 法术伤害改写(酒神/乾坤一掷)', () => {
  it('0x57:magic.baseDamage=caster.mp*i;op1=0 → i=8;caster.mp 清 0;无表/无 magic no-op', () => {
    const { state, playerRoles } = makeBattle({ roles: [makeRole(0, { mp: 20 })] })
    const magics = [makeMagic(3)]
    const ctx: BattleCtx = {
      state,
      playerRoles,
      caster: { type: 'player', idx: 0 },
      magicTables: { magics, objectMagics: [makeObjectMagic(300, 3)] },
    }
    dispatchBattleOpcode(0x57, [300, 0, 0], ctx)
    expect(magics[0]!.baseDamage).toBe(160)
    expect(playerRoles.roles[0]!.mp).toBe(0)
    // 无表 no-op
    expect(dispatchBattleOpcode(0x57, [300, 0, 0], { state })).toEqual({ consumed: true })
    // 有表无该 object → no-op
    const ctxNoObj: BattleCtx = {
      state,
      magicTables: { magics: [makeMagic(3)], objectMagics: [] },
    }
    expect(dispatchBattleOpcode(0x57, [999, 0, 0], ctxNoObj)).toEqual({ consumed: true })
  })

  it('0x88:cash>5000 → 扣 5000、baseDamage=2000;cash<5000 → 全扣;无 gs no-op', () => {
    const { state, gs } = makeBattle()
    gs.dwCash = 8000
    const magics = [makeMagic(5)]
    const ctx: BattleCtx = {
      state,
      gs,
      magicTables: { magics, objectMagics: [makeObjectMagic(310, 5)] },
    }
    dispatchBattleOpcode(0x88, [310, 0, 0], ctx)
    expect(gs.dwCash).toBe(3000)
    expect(magics[0]!.baseDamage).toBe(2000)
    gs.dwCash = 300
    dispatchBattleOpcode(0x88, [310, 0, 0], ctx)
    expect(gs.dwCash).toBe(0)
    expect(magics[0]!.baseDamage).toBe(120)
    expect(
      dispatchBattleOpcode(0x88, [310, 0, 0], { state, magicTables: ctx.magicTables }),
    ).toEqual({ consumed: true })
  })
})
describe('0x5B HalveEnemyHP', () => {
  it('w=health/2+1 超 cap → 钳 cap;无 target / 目标槽空 → no-op', () => {
    const { state, bus } = makeBattle({ enemies: [makeEnemy({ health: 101 })] })
    const ctx: BattleCtx = { state, bus, target: { type: 'enemy', idx: 0 } }
    dispatchBattleOpcode(0x5b, [10, 0, 0], ctx)
    expect(state.enemies[0]!.e.health).toBe(91) // 101-10(cap)
    dispatchBattleOpcode(0x5b, [10, 0, 0], { state })
    expect(
      dispatchBattleOpcode(0x5b, [10, 0, 0], { state, target: { type: 'enemy', idx: 5 } }),
    ).toEqual({ consumed: true })
    expect(state.enemies[0]!.e.health).toBe(91)
  })
})
describe('0x5F KillPlayer / 0x5A HalvePlayerHP', () => {
  it('0x5F:target player → hp=0 + blue 数字;无 player 上下文 → no-op', () => {
    const { state, playerRoles, bus } = makeBattle({ roles: [makeRole(0)] })
    const ctx: BattleCtx = { state, playerRoles, bus, target: { type: 'player', idx: 0 } }
    dispatchBattleOpcode(0x5f, [0, 0, 0], ctx)
    expect(playerRoles.roles[0]!.hp).toBe(0)
    expect(bus.drain().filter((e) => e.cmd.op === 'showDamageNum')[0]!.cmd).toMatchObject({
      target: { kind: 'player', idx: 0 },
      color: 'blue',
    })
    dispatchBattleOpcode(0x5f, [0, 0, 0], { state, playerRoles, target: { type: 'enemy', idx: 0 } })
  })

  it('0x5A:hp 减半(向下取整)+ blue 数字;无 player 上下文 no-op', () => {
    const { state, playerRoles, bus } = makeBattle({ roles: [makeRole(0, { hp: 101 })] })
    const ctx: BattleCtx = { state, playerRoles, bus, target: { type: 'player', idx: 0 } }
    dispatchBattleOpcode(0x5a, [0, 0, 0], ctx)
    expect(playerRoles.roles[0]!.hp).toBe(50)
    dispatchBattleOpcode(0x5a, [0, 0, 0], { state })
  })
})
describe('0x1B/0x1C/0x1D 战内 HP/MP delta', () => {
  it('0x1B applyAll:全队(死人跳过),fScriptSuccess=anyChanged;单体无改动 → false', () => {
    const { state, gs, playerRoles, bus } = makeBattle({
      roles: [makeRole(0, { hp: 50 }), makeRole(1, { hp: 0 })],
    })
    const ctx: BattleCtx = { state, gs, playerRoles, bus }
    dispatchBattleOpcode(0x1b, [1, 20, 0], ctx)
    expect(playerRoles.roles[0]!.hp).toBe(70)
    expect(playerRoles.roles[1]!.hp).toBe(0)
    expect(gs.fScriptSuccess).toBe(true)
    expect(damageNums(bus.drain()).map((c) => c.target)).toEqual([{ kind: 'player', idx: 0 }])
    // 单体(退 caster)满血零改 → false
    const ctx2: BattleCtx = {
      state,
      gs,
      playerRoles,
      caster: { type: 'player', idx: 0 },
    }
    playerRoles.roles[0]!.hp = playerRoles.roles[0]!.maxHP
    gs.fScriptSuccess = true
    dispatchBattleOpcode(0x1b, [0, 20, 0], ctx2)
    expect(gs.fScriptSuccess).toBe(false)
  })

  it('0x1C 单体 MP:回蓝发 cyan;掉蓝不发;0x1D 双回(HP yellow + MP cyan)', () => {
    const { state, gs, playerRoles, bus } = makeBattle({
      roles: [makeRole(0, { hp: 50, mp: 10 })],
    })
    const ctx: BattleCtx = {
      state,
      gs,
      playerRoles,
      bus,
      target: { type: 'player', idx: 0 },
    }
    dispatchBattleOpcode(0x1c, [0, 5, 0], ctx)
    expect(playerRoles.roles[0]!.mp).toBe(15)
    expect(damageNums(bus.drain())[0]).toMatchObject({
      color: 'cyan',
      value: 5,
    })
    // 掉蓝:不发 cyan
    dispatchBattleOpcode(0x1c, [0, 0xfffb, 0], ctx) // -5
    expect(playerRoles.roles[0]!.mp).toBe(10)
    expect(bus.drain().filter((e) => e.cmd.op === 'showDamageNum')).toEqual([])
    // 0x1D 双回
    dispatchBattleOpcode(0x1d, [0, 10, 0], ctx)
    expect([playerRoles.roles[0]!.hp, playerRoles.roles[0]!.mp]).toEqual([60, 20])
    const colors = damageNums(bus.drain())
      .map((c) => c.color)
      .sort()
    expect(colors).toEqual(['cyan', 'yellow'])
  })

  it('无 playerRoles / 无 player 上下文单目标 → 空集 no-op', () => {
    const { state, gs } = makeBattle()
    expect(dispatchBattleOpcode(0x1b, [0, 5, 0], { state, gs })).toEqual({ consumed: true })
    expect(dispatchBattleOpcode(0x1c, [0, 5, 0], { state, gs })).toEqual({ consumed: true })
  })
})
describe('0x22 战内 RevivePlayer', () => {
  it('applyAll:复活死人(比例+清临时状态但保留装备状态+currentFrame复位+清≤3级毒);fScriptSuccess=anyRevived', () => {
    const { state, gs, playerRoles } = makeBattle({
      roles: [makeRole(0, { hp: 0 }), makeRole(1, { hp: 80 })],
    })
    state.players[0]!.status.bravery = 999
    state.players[0]!.status.protect = 1000
    state.players[0]!.status.dualAttack = 32760
    state.players[0]!.currentFrame = 2
    setObjectPoisons([poison(77, 0), { ...poison(78, 0), level: 4 }])
    gs.rgPoisonStatus['0_0'] = { wPoisonID: 77, wPoisonScript: 0 }
    gs.rgPoisonStatus['1_0'] = { wPoisonID: 78, wPoisonScript: 0 }
    const ctx: BattleCtx = { state, gs, playerRoles }
    dispatchBattleOpcode(0x22, [1, 5, 0], ctx)
    expect(playerRoles.roles[0]!.hp).toBe(250)
    expect(state.players[0]!.status.bravery).toBe(0)
    expect(state.players[0]!.status.protect).toBe(1000)
    expect(state.players[0]!.status.dualAttack).toBe(32760)
    expect(state.players[0]!.currentFrame).not.toBe(2)
    expect(playerRoles.roles[1]!.hp).toBe(80)
    expect(gs.fScriptSuccess).toBe(true)
    expect(gs.rgPoisonStatus['0_0']!.wPoisonID).toBe(0)
    expect(gs.rgPoisonStatus['1_0']!.wPoisonID).toBe(78) // level4保留
    // 全员活着再跑 → false
    dispatchBattleOpcode(0x22, [1, 5, 0], ctx)
    expect(gs.fScriptSuccess).toBe(false)
  })

  it('单体复活按目标队伍位置选择角色：保留装备状态，不修改活队友状态', () => {
    const { state, gs, playerRoles } = makeBattle({
      roles: [makeRole(0, { hp: 0 }), makeRole(1, { hp: 80 })],
      party: [1, 0],
    })
    const dead = state.players[1]!
    dead.status.sleep = 999
    dead.status.protect = 1000
    dead.status.dualAttack = 32760
    state.players[0]!.status.bravery = 9
    const ctx: BattleCtx = {
      state,
      gs,
      playerRoles,
      target: { type: 'player', idx: 1 },
      caster: { type: 'player', idx: 0 },
    }
    dispatchBattleOpcode(0x22, [0, 5, 0], ctx)
    expect(playerRoles.roles[0]!.hp).toBe(250)
    expect(dead.status).toMatchObject({ sleep: 0, protect: 1000, dualAttack: 32760 })
    expect(playerRoles.roles[1]!.hp).toBe(80)
    expect(state.players[0]!.status.bravery).toBe(9)
  })

  it('单体复活活人 → fScriptSuccess=false;无 player 上下文 → 空目标 no-op', () => {
    const { state, gs, playerRoles } = makeBattle({ roles: [makeRole(0, { hp: 80 })] })
    const ctx: BattleCtx = {
      state,
      gs,
      playerRoles,
      target: { type: 'player', idx: 0 },
    }
    gs.fScriptSuccess = true
    dispatchBattleOpcode(0x22, [0, 5, 0], ctx)
    expect(gs.fScriptSuccess).toBe(false)
    dispatchBattleOpcode(0x22, [0, 5, 0], { state, gs, playerRoles })
    expect(playerRoles.roles[0]!.hp).toBe(80)
  })
})
describe('0x39 DrainHP', () => {
  it('0x39:敌扣血、caster 回血钳 maxHP;缺少 target 时敌方体力不变', () => {
    const { state, gs, playerRoles, bus } = makeBattle({
      roles: [makeRole(0, { hp: 90, maxHP: 100 })],
      enemies: [makeEnemy({ health: 500 })],
    })
    const ctx: BattleCtx = {
      state,
      gs,
      playerRoles,
      bus,
      target: { type: 'enemy', idx: 0 },
      caster: { type: 'player', idx: 0 },
    }
    dispatchBattleOpcode(0x39, [30, 0, 0], ctx)
    expect(state.enemies[0]!.e.health).toBe(470)
    expect(playerRoles.roles[0]!.hp).toBe(100) // 钳 max
    dispatchBattleOpcode(0x39, [30, 0, 0], {
      state,
      gs,
      playerRoles,
      caster: { type: 'player', idx: 0 },
    })
    expect(state.enemies[0]!.e.health).toBe(470)
  })
})
describe('0x60 EnemyImmediateKO', () => {
  it('0x60:target(enemy)KO 血 0 + blue;无 enemy 上下文 no-op', () => {
    const { state, bus } = makeBattle({ enemies: [makeEnemy({ health: 400 })] })
    dispatchBattleOpcode(0x60, [0, 0, 0], {
      state,
      bus,
      target: { type: 'enemy', idx: 0 },
    })
    expect(state.enemies[0]!.e.health).toBe(0)
    expect(damageNums(bus.drain()).map((c) => c.value)).toEqual([400])
    dispatchBattleOpcode(0x60, [0, 0, 0], { state })
    expect(
      dispatchBattleOpcode(0x60, [0, 0, 0], { state, target: { type: 'player', idx: 0 } }),
    ).toEqual({ consumed: true })
  })
})
