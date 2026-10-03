/**
 * TEST-COVERAGE85-GLM-GAME-1 — battle-opcodes.ts dispatchBattleOpcode 分支合同。
 *
 * 公开 caller:dispatchBattleOpcode(生产由 runScript runtimeMode='battle' 逐 case 调用)。
 * 输入一律由 createBattleState 公开工厂构造真实 typed BattleState;表(objectMagics/magics/
 * summonTables/poisons)是公开注入的 ctx 依赖,按注入 API 传值,不 mock 业务核心。
 * 旧证去重:不重复 battle-opcodes.test.ts 已证的 0x64 三态 / 0x67 默认 10 / 0x61 两态,
 * glm-next-wave 已证的 0x05/0x8E/0x6B,actions.test / throw-item.test 已证的 0x42 主链。
 */
import type {
  Command,
  EnemyObject,
  Item,
  Magic,
  ObjectMagicView,
  ObjectPoisonView,
} from '@type-pal/shared'
import type { BusEntry } from '../command-bus.js'

/** 从 bus 条目提取 showDamageNum 命令(判别式收窄,免断言)。 */
function damageNums(entries: BusEntry[]): Array<{
  target: { kind: 'enemy' | 'player'; idx: number }
  value: number
  color: 'yellow' | 'blue' | 'cyan'
}> {
  const out: Array<{
    target: { kind: 'enemy' | 'player'; idx: number }
    value: number
    color: 'yellow' | 'blue' | 'cyan'
  }> = []
  for (const e of entries) {
    if (e.cmd.op === 'showDamageNum') out.push(e.cmd)
  }
  return out
}

import { afterEach, describe, expect, it } from 'vitest'
import {
  makeBattle,
  makeEnemy,
  makeRole,
  seqRng,
} from '../../__tests__/coverage85-glm-game/harness.js'
import type { BattleCtx } from '../event-system.js'
import { addPoisonForPlayer, setObjectPoisons } from '../player-poison-state.js'
import { dispatchBattleOpcode } from './battle-opcodes.js'

afterEach(() => {
  setObjectPoisons([]) // 清 densePoisons 注册的毒对象表(单测隔离)
})

function makeItem(id: number, name: string): Item {
  return {
    id,
    _name: name,
    bitmap: 0,
    price: 10,
    scriptOnUse: 0,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 0,
    flags: {
      usable: false,
      equipable: false,
      throwable: false,
      consuming: false,
      applyToAll: false,
      sellable: false,
      equipableBy: [false, false, false, false, false, false],
    },
  }
}

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

function makeEnemyObject(objectIndex: number, enemyId: number): EnemyObject {
  return {
    objectIndex,
    enemyId,
    resistanceToSorcery: 0,
    scriptOnTurnStart: 0,
    scriptOnBattleEnd: 0,
    scriptOnReady: 0,
  }
}

/** 0x28 读 objectPoisons[id](数组下标即对象号)→ 造 id 稠密索引数组。 */
function densePoisons(entries: ObjectPoisonView[]): ObjectPoisonView[] {
  const arr: ObjectPoisonView[] = []
  for (const e of entries) arr[e.id] = e
  return arr
}

const poison = (id: number, enemyScript: number): ObjectPoisonView => ({
  id,
  level: 2,
  color: 0,
  playerScript: 0,
  enemyScript,
})

describe('cov85 0x42 SimulateMagic 目标解析与特效音', () => {
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

describe('cov85 0x66 ThrowWeapon 攻击力系数', () => {
  it('caster=player + playerRoles → w=op1*5+attackStrength*roll(0),模拟 magic 落到目标敌', () => {
    const rng = seqRng([0, 3, 3, 3, 3, 3, 3, 3])
    const { gs, state, playerRoles, bus } = makeBattle({ rng })
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
    // attackStrength=60, roll=0 → w = 30*5+60*0 = 150
    expect(dispatchBattleOpcode(0x66, [24, 30, 0], ctx).consumed).toBe(true)
    expect(state.enemies[0]!.e.health).toBeLessThan(h)
    expect(rng.calls[0]).toBe('rangeInclusive(0,3)')
  })

  it('无 playerRoles / 非 player caster → attackStr=0 仍结算', () => {
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
    expect(state.enemies[0]!.e.health).toBeLessThan(h)
  })
})

describe('cov85 0x21 InflictDamage 全体/单体/超杀钳零', () => {
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

describe('cov85 0x28 ApplyPoison 抗性/去重/槽满/入口脚本', () => {
  it('抗性 9(rng=0 抵抗)→ 不落毒;抗性 0 → 落毒且带入口脚本返回值', () => {
    const { state, gs, bus } = makeBattle({
      enemies: [makeEnemy(), makeEnemy({ id: 101 })],
      rng: seqRng([0, 0]),
    })
    state.enemies[0]!.resistanceToSorcery = 9
    const commands: Command[] = [{ op: 'end' }, { op: 'raw', opcode: 0x21, operands: [0, 5, 0] }]
    const runScriptCalls: number[] = []
    const ctx: BattleCtx = {
      state,
      gs,
      bus,
      target: { type: 'enemy', idx: 1 },
      objectPoisons: densePoisons([poison(77, 1)]),
      commands: [...commands],
      runScript: (opts) => {
        runScriptCalls.push(opts.ip)
        return opts.ip + 1
      },
    }
    expect(dispatchBattleOpcode(0x28, [0, 77, 0], ctx).consumed).toBe(true)
    expect(state.enemies[0]!.poisons).toEqual([]) // 非 target 不落
    const p1 = state.enemies[1]!.poisons
    expect(p1).toHaveLength(1)
    expect(p1![0]).toMatchObject({ poisonId: 77, scriptEntry: 2 }) // runScript 返回 ip+1
    expect(runScriptCalls).toEqual([1])
  })

  it('rng < 抗性 → 抵抗不落毒;同毒去重;缺 commands → fallback 存原始 enemyScript', () => {
    const { state } = makeBattle({
      enemies: [makeEnemy()],
      rng: seqRng([0]),
    })
    state.enemies[0]!.resistanceToSorcery = 5
    const ctx: BattleCtx = {
      state,
      target: { type: 'enemy', idx: 0 },
      objectPoisons: densePoisons([poison(77, 3)]),
    }
    dispatchBattleOpcode(0x28, [0, 77, 0], ctx)
    expect(state.enemies[0]!.poisons).toEqual([]) // roll 0 < 5 → 抵抗
    // 抗性 0 落毒,无 commands → scriptEntry 原始值
    const fx2 = makeBattle({ enemies: [makeEnemy({})], rng: seqRng([9]) })
    const ctx2: BattleCtx = {
      state: fx2.state,
      gs: fx2.gs,
      target: { type: 'enemy', idx: 0 },
      objectPoisons: densePoisons([poison(88, 4)]),
    }
    dispatchBattleOpcode(0x28, [0, 88, 0], ctx2)
    expect(fx2.state.enemies[0]!.poisons![0]).toMatchObject({ poisonId: 88, scriptEntry: 4 })
    // 再上同毒 → 去重
    dispatchBattleOpcode(0x28, [0, 88, 0], ctx2)
    expect(fx2.state.enemies[0]!.poisons).toHaveLength(1)
  })

  it('毒槽满 16 → 不再落;全体模式(op0≠0)selfIdx 恒为投掷目标', () => {
    const { state } = makeBattle({
      enemies: [makeEnemy({}), makeEnemy({ id: 101 })],
      rng: seqRng([9, 9, 9, 9]),
    })
    state.enemies[0]!.poisons = Array.from({ length: 16 }, (_, i) => ({
      poisonId: 500 + i,
      scriptEntry: 0,
    }))
    const ctx: BattleCtx = {
      state,
      objectPoisons: densePoisons([poison(77, 0)]),
      target: { type: 'enemy', idx: 1 },
    }
    dispatchBattleOpcode(0x28, [1, 77, 0], ctx)
    expect(state.enemies[0]!.poisons).toHaveLength(16) // 槽满不加
    expect(state.enemies[1]!.poisons![0]!.poisonId).toBe(77) // 全体另一敌照落
  })

  it('op0=0 且无 target → 空操作', () => {
    const { state } = makeBattle()
    const ctx: BattleCtx = { state, objectPoisons: densePoisons([poison(77, 0)]) }
    dispatchBattleOpcode(0x28, [0, 77, 0], ctx)
    expect(state.enemies[0]!.poisons).toEqual([])
  })
})

describe('cov85 0x2A CureEnemyPoisonKind 全体/单体/无 target', () => {
  it('op0≠0 → 全体活敌清指定毒,死敌不动;op0=0 → 只清 target', () => {
    const { state } = makeBattle({
      enemies: [makeEnemy({}), makeEnemy({ id: 101 }), makeEnemy({ id: 102 })],
    })
    state.enemies[0]!.poisons = [
      { poisonId: 77, scriptEntry: 0 },
      { poisonId: 88, scriptEntry: 0 },
    ]
    state.enemies[1]!.poisons = [{ poisonId: 77, scriptEntry: 0 }]
    state.enemies[2]!.defeated = true
    state.enemies[2]!.poisons = [{ poisonId: 77, scriptEntry: 0 }]
    const ctx: BattleCtx = { state, target: { type: 'enemy', idx: 0 } }
    expect(dispatchBattleOpcode(0x2a, [1, 77, 0], ctx).consumed).toBe(true)
    expect(state.enemies[0]!.poisons).toEqual([{ poisonId: 88, scriptEntry: 0 }])
    expect(state.enemies[1]!.poisons).toEqual([])
    expect(state.enemies[2]!.poisons).toEqual([{ poisonId: 77, scriptEntry: 0 }]) // 死敌跳过
    // 单体:target 0 清 88
    expect(dispatchBattleOpcode(0x2a, [0, 88, 0], ctx).consumed).toBe(true)
    expect(state.enemies[0]!.poisons).toEqual([])
    expect(state.enemies[1]!.poisons).toEqual([])
  })

  it('op0=0 无 target → 空操作不炸', () => {
    const { state } = makeBattle()
    state.enemies[0]!.poisons = [{ poisonId: 77, scriptEntry: 0 }]
    dispatchBattleOpcode(0x2a, [0, 77, 0], { state })
    expect(state.enemies[0]!.poisons).toHaveLength(1)
  })
})

describe('cov85 resolvePlayerPoisonTargets(0x2B/0x2C/0x29 目标解析)', () => {
  it('op0≠0 → 全队;op0=0 target(player)优先;无 target 退 caster;都无 → 空;无 gs no-op', () => {
    const { gs, state, playerRoles } = makeBattle({
      roles: [makeRole(0), makeRole(1)],
    })
    setObjectPoisons([poison(77, 0)])
    addPoisonForPlayer(gs, 0, 77)
    addPoisonForPlayer(gs, 1, 77)
    const cured = (): number[] => [
      gs.rgPoisonStatus['0_0']!.wPoisonID,
      gs.rgPoisonStatus['0_1']!.wPoisonID,
    ]
    const mk = (
      target?: { type: 'player' | 'enemy'; idx: number },
      caster?: { type: 'player' | 'enemy'; idx: number },
    ): BattleCtx => ({
      state,
      gs,
      playerRoles,
      target,
      caster,
      objectPoisons: densePoisons([poison(77, 0)]),
    })
    // 全队:两 role 的 77 都清
    dispatchBattleOpcode(0x2b, [1, 77, 0], mk())
    expect(cured()).toEqual([0, 0])
    // 重新上毒:单目标只清 target
    addPoisonForPlayer(gs, 0, 77)
    addPoisonForPlayer(gs, 1, 77)
    dispatchBattleOpcode(0x2b, [0, 77, 0], mk({ type: 'player', idx: 1 }))
    expect(cured()).toEqual([77, 0])
    // 退 caster
    dispatchBattleOpcode(0x2b, [0, 77, 0], mk(undefined, { type: 'player', idx: 0 }))
    expect(cured()).toEqual([0, 0])
    // 都无(仅 enemy target)→ 空目标
    addPoisonForPlayer(gs, 0, 77)
    dispatchBattleOpcode(0x2b, [0, 77, 0], mk({ type: 'enemy', idx: 0 }))
    expect(cured()[0]).toBe(77)
    // 0x2C 按等级:全队清 ≤3 级毒
    dispatchBattleOpcode(0x2c, [1, 3, 0], mk())
    expect(cured()[0]).toBe(0)
    // 无 gs → no-op 不炸
    expect(dispatchBattleOpcode(0x2b, [1, 77, 0], { state }).consumed).toBe(true)
    expect(dispatchBattleOpcode(0x2c, [1, 3, 0], { state }).consumed).toBe(true)
  })
})

describe('cov85 0x2D SetPlayerStatus 战内状态三族', () => {
  it('坏状态 current=0 才写;已有不刷新;无 player target → no-op', () => {
    const { state, playerRoles } = makeBattle({ roles: [makeRole(0)] })
    const ctx: BattleCtx = {
      state,
      playerRoles,
      target: { type: 'player', idx: 0 },
    }
    dispatchBattleOpcode(0x2d, [1, 4, 0], ctx) // paralyzed
    expect(state.players[0]!.status.paralyzed).toBe(4)
    dispatchBattleOpcode(0x2d, [1, 9, 0], ctx)
    expect(state.players[0]!.status.paralyzed).toBe(4) // 不刷新
    dispatchBattleOpcode(0x2d, [99, 9, 0], { state, playerRoles }) // 未知 statusId
    dispatchBattleOpcode(0x2d, [1, 9, 0], { state, playerRoles }) // 无 player target
    expect(state.players[0]!.status.paralyzed).toBe(4)
  })

  it('puppet:死人可设更久;活人 → fScriptSuccess=false', () => {
    const { state, gs, playerRoles } = makeBattle({ roles: [makeRole(0, { hp: 0 })] })
    const ctx: BattleCtx = { state, gs, playerRoles, target: { type: 'player', idx: 0 } }
    dispatchBattleOpcode(0x2d, [4, 5, 0], ctx)
    expect(state.players[0]!.status.puppet).toBe(5)
    playerRoles.roles[0]!.hp = 100
    gs.fScriptSuccess = true
    dispatchBattleOpcode(0x2d, [4, 9, 0], ctx)
    expect(gs.fScriptSuccess).toBe(false)
    expect(state.players[0]!.status.puppet).toBe(5) // 活人不刷新
  })

  it('好状态:活人更久才写;死人不动;无 gs 活人失败不炸', () => {
    const { state, playerRoles } = makeBattle({ roles: [makeRole(0)] })
    const ctx: BattleCtx = { state, playerRoles, target: { type: 'player', idx: 0 } }
    dispatchBattleOpcode(0x2d, [5, 3, 0], ctx) // bravery
    expect(state.players[0]!.status.bravery).toBe(3)
    dispatchBattleOpcode(0x2d, [5, 2, 0], ctx)
    expect(state.players[0]!.status.bravery).toBe(3)
    playerRoles.roles[0]!.hp = 0
    dispatchBattleOpcode(0x2d, [5, 8, 0], ctx)
    expect(state.players[0]!.status.bravery).toBe(3) // 死人不动
  })
})

describe('cov85 0x2E SetEnemyStatus 命中/抵抗/非法', () => {
  it('rng≥抗性 → 命中写状态;rng<抗性 → newIp=op2;未知 statusId / 无敌 target → no-op', () => {
    const hit = makeBattle({ enemies: [makeEnemy()], rng: seqRng([9]) })
    const hitCtx: BattleCtx = { state: hit.state, target: { type: 'enemy', idx: 0 } }
    expect(dispatchBattleOpcode(0x2e, [2, 6, 55], hitCtx)).toEqual({ consumed: true })
    expect(hit.state.enemies[0]!.status.sleep).toBe(6)
    const resist = makeBattle({ enemies: [makeEnemy()], rng: seqRng([0]) })
    resist.state.enemies[0]!.resistanceToSorcery = 5
    const resistCtx: BattleCtx = { state: resist.state, target: { type: 'enemy', idx: 0 } }
    expect(dispatchBattleOpcode(0x2e, [2, 6, 55], resistCtx)).toEqual({
      consumed: true,
      newIp: 55,
    })
    expect(resist.state.enemies[0]!.status.sleep).toBe(0)
    expect(dispatchBattleOpcode(0x2e, [42, 6, 55], hitCtx)).toEqual({ consumed: true })
    expect(dispatchBattleOpcode(0x2e, [2, 6, 55], { state: hit.state })).toEqual({ consumed: true })
  })
})

describe('cov85 0x2F RemovePlayerStatus', () => {
  it('清 target player 的普通状态;>999 装备态不清;无敌 target → no-op', () => {
    const { state } = makeBattle({ roles: [makeRole(0)] })
    state.players[0]!.status.bravery = 9
    state.players[0]!.status.dualAttack = 32760
    const ctx: BattleCtx = { state, target: { type: 'player', idx: 0 } }
    dispatchBattleOpcode(0x2f, [5, 0, 0], ctx)
    expect(state.players[0]!.status.bravery).toBe(0)
    dispatchBattleOpcode(0x2f, [8, 0, 0], ctx)
    expect(state.players[0]!.status.dualAttack).toBe(32760)
    dispatchBattleOpcode(0x2f, [99, 0, 0], ctx)
    dispatchBattleOpcode(0x2f, [5, 0, 0], { state })
  })
})

describe('cov85 0x5E JumpIfNoPoison', () => {
  it('无敌无该毒 → newIp=op1;有该毒 → 不跳;caster(enemy) 退路', () => {
    const { state } = makeBattle({ enemies: [makeEnemy({})] })
    const ctx: BattleCtx = { state, target: { type: 'enemy', idx: 0 } }
    expect(dispatchBattleOpcode(0x5e, [77, 300, 0], ctx)).toEqual({
      consumed: true,
      newIp: 300,
    })
    state.enemies[0]!.poisons = [{ poisonId: 77, scriptEntry: 0 }]
    expect(dispatchBattleOpcode(0x5e, [77, 300, 0], ctx)).toEqual({ consumed: true })
    expect(
      dispatchBattleOpcode(0x5e, [77, 300, 0], {
        state,
        caster: { type: 'enemy', idx: 0 },
      }),
    ).toEqual({ consumed: true })
  })
})

describe('cov85 0x57/0x88 法术伤害改写(酒神/乾坤一掷)', () => {
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

describe('cov85 0x5B HalveEnemyHP', () => {
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

describe('cov85 0x5F KillPlayer / 0x5A HalvePlayerHP', () => {
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

describe('cov85 0x5C HideParty / 0x89 SetBattleResult / 0x8A AutoBattle', () => {
  it('0x5C → iHidingTime=-op0', () => {
    const { state } = makeBattle()
    dispatchBattleOpcode(0x5c, [7, 0, 0], { state })
    expect(state.iHidingTime).toBe(-7)
  })

  it('0x89:3→won、1→lost、0→terminated 标记+fleed、0xFFFF→fleed、1000+不改', () => {
    const mk = (): ReturnType<typeof makeBattle>['state'] => makeBattle().state
    const s1 = mk()
    dispatchBattleOpcode(0x89, [3, 0, 0], { state: s1 })
    expect(s1.phase).toBe('won')
    const s2 = mk()
    dispatchBattleOpcode(0x89, [1, 0, 0], { state: s2 })
    expect(s2.phase).toBe('lost')
    const s3 = mk()
    dispatchBattleOpcode(0x89, [0, 0, 0], { state: s3 })
    expect(s3.phase).toBe('fleed')
    expect(s3.terminatedByEnemyEscape).toBe(true)
    const s4 = mk()
    dispatchBattleOpcode(0x89, [0xffff, 0, 0], { state: s4 })
    expect(s4.phase).toBe('fleed')
    expect(s4.terminatedByEnemyEscape).toBeUndefined()
    const s5 = mk()
    s5.phase = 'performAction'
    dispatchBattleOpcode(0x89, [1500, 0, 0], { state: s5 })
    expect(s5.phase).toBe('performAction')
  })

  it('0x8A:有 gs → fAutoBattle=true;无 gs no-op', () => {
    const { state, gs } = makeBattle()
    dispatchBattleOpcode(0x8a, [0, 0, 0], { state, gs })
    expect(gs.fAutoBattle).toBe(true)
    expect(dispatchBattleOpcode(0x8a, [0, 0, 0], { state })).toEqual({ consumed: true })
  })
})

describe('cov85 0x33 CollectEnemy / 0x3A PlayerFlee', () => {
  it('0x33:collectValue≠0 → wCollectValue 累加;=0 → newIp=op0;无 target → newIp', () => {
    const { state, gs } = makeBattle({
      enemies: [makeEnemy({ collectValue: 5 })],
    })
    const ctx: BattleCtx = { state, gs, target: { type: 'enemy', idx: 0 } }
    expect(dispatchBattleOpcode(0x33, [99, 0, 0], ctx)).toEqual({ consumed: true })
    expect(gs.wCollectValue).toBe(5)
    state.enemies[0]!.e.collectValue = 0
    expect(dispatchBattleOpcode(0x33, [88, 0, 0], ctx)).toEqual({ consumed: true, newIp: 88 })
    expect(dispatchBattleOpcode(0x33, [88, 0, 0], { state })).toEqual({ consumed: true, newIp: 88 })
  })

  it('0x3A:boss → newIp=op0;非 boss → fleeAnim 起 + 音 45', () => {
    const bossFx = makeBattle({ isBoss: true })
    expect(
      dispatchBattleOpcode(0x3a, [77, 0, 0], {
        state: bossFx.state,
        target: { type: 'player', idx: 0 },
      }),
    ).toEqual({ consumed: true, newIp: 77 })
    const fx = makeBattle()
    dispatchBattleOpcode(0x3a, [77, 0, 0], {
      state: fx.state,
      gs: fx.gs,
      target: { type: 'player', idx: 0 },
    })
    expect(fx.state.fleeAnim).toEqual({ step: 0 })
    expect(fx.gs.pendingSounds).toContain(45)
  })
})

describe('cov85 0x30 BuffPlayerStatPct', () => {
  it('gs 路径:bonus=trunc(base*op1/100) 写 Extra 槽并 recompute snapshot', () => {
    const { state, gs, playerRoles } = makeBattle({
      roles: [makeRole(0, { attackStrength: 60 })],
    })
    gs.PlayerRolesRuntime.rgwAttackStrength[0] = 60
    const ctx: BattleCtx = {
      state,
      gs,
      playerRoles,
      caster: { type: 'player', idx: 0 },
    }
    dispatchBattleOpcode(0x30, [17, 50, 0], ctx)
    expect(gs.rgEquipmentEffect[6]!.rgwAttackStrength[0]).toBe(30)
    expect(playerRoles.roles[0]!.attackStrength).toBe(90)
  })

  it('op2>0 显式 role;未知 row / 无 player 上下文 → no-op;负 % 缩围', () => {
    const { state, gs, playerRoles } = makeBattle({
      roles: [makeRole(0, { defense: 40 }), makeRole(1, { defense: 40 })],
    })
    gs.PlayerRolesRuntime.rgwDefense[1] = 40
    const ctx: BattleCtx = { state, gs, playerRoles, target: { type: 'enemy', idx: 0 } }
    dispatchBattleOpcode(0x30, [19, 50, 2], ctx) // 显式 role 1
    expect(gs.rgEquipmentEffect[6]!.rgwDefense[1]).toBe(20)
    expect(playerRoles.roles[1]!.defense).toBe(60)
    expect(dispatchBattleOpcode(0x30, [99, 50, 0], ctx)).toEqual({ consumed: true })
    expect(dispatchBattleOpcode(0x30, [17, 50, 0], ctx)).toEqual({ consumed: true })
    // 负 %
    dispatchBattleOpcode(0x30, [19, 0xff9c, 2], ctx)
    expect(gs.rgEquipmentEffect[6]!.rgwDefense[1]).toBe(-40) // trunc(40*-100/100)
    expect(playerRoles.roles[1]!.defense).toBe(0)
  })

  it('无 gs 退化路径:直接 mutate snapshot(叠加)', () => {
    const { state, playerRoles } = makeBattle({
      roles: [makeRole(0, { dexterity: 40 })],
    })
    const ctx: BattleCtx = {
      state,
      playerRoles,
      target: { type: 'player', idx: 0 },
    }
    dispatchBattleOpcode(0x30, [20, 50, 0], ctx)
    expect(playerRoles.roles[0]!.dexterity).toBe(60)
  })
})

describe('cov85 0x31 ChangeBattleSprite / 0x92 ShowMagicAnim', () => {
  it('0x31:caster player 优先;写 spriteNumOverride', () => {
    const { state } = makeBattle({ roles: [makeRole(0)] })
    dispatchBattleOpcode(0x31, [9, 0, 0], {
      state,
      caster: { type: 'player', idx: 0 },
      target: { type: 'enemy', idx: 0 },
    })
    expect(state.players[0]!.spriteNumOverride).toBe(9)
    dispatchBattleOpcode(0x31, [8, 0, 0], { state, target: { type: 'enemy', idx: 0 } })
    expect(state.players[0]!.spriteNumOverride).toBe(9)
  })

  it('0x92:op0=0 → no-op;op0 非 0 无 bus → no-op 不炸', () => {
    const { state } = makeBattle({ roles: [makeRole(0), makeRole(1)] })
    expect(dispatchBattleOpcode(0x92, [0, 0, 0], { state })).toEqual({ consumed: true })
    expect(dispatchBattleOpcode(0x92, [2, 0, 0], { state })).toEqual({ consumed: true })
    expect(state.battleAnim).toBeUndefined()
  })
})

describe('cov85 0x6A StealFromEnemy', () => {
  it('偷钱:c=count/divisor,stealItemCount 减、cash 加;c=0 不弹框', () => {
    const { state, gs } = makeBattle({
      enemies: [makeEnemy({ stealItem: 0, stealItemCount: 9 })],
      rng: seqRng([0, 3, 3, 3]),
    })
    const ctx: BattleCtx = {
      state,
      gs,
      target: { type: 'enemy', idx: 0 },
      caster: { type: 'player', idx: 0 },
    }
    dispatchBattleOpcode(0x6a, [10, 0, 0], ctx)
    expect(gs.dwCash).toBe(3) // 9/3
    expect(state.enemies[0]!.e.stealItemCount).toBe(6)
    expect(state.battleDialogQueue).toHaveLength(1)
    expect(state.battleDialogQueue![0]).toMatchObject({ text: '@获得 @3 @文钱@' })
    // c=0:剩 1 文 /3 → 0 → 不弹新框
    state.enemies[0]!.e.stealItemCount = 1
    const len = state.battleDialogQueue!.length
    dispatchBattleOpcode(0x6a, [10, 0, 0], ctx)
    expect(gs.dwCash).toBe(3)
    expect(state.battleDialogQueue).toHaveLength(len)
  })

  it('偷物:已持有 +1(封顶 99);roll>rate 失败;count=0 直接失败跳 roll;无 target/gs no-op', () => {
    const rng = seqRng([11, 0])
    const { state, gs } = makeBattle({
      enemies: [makeEnemy({ stealItem: 30, stealItemCount: 2 })],
      rng,
    })
    gs.inventory = [{ itemId: 30, count: 98 }]
    const ctx: BattleCtx = {
      state,
      gs,
      items: [makeItem(30, '短刀')],
      target: { type: 'enemy', idx: 0 },
      caster: { type: 'player', idx: 0 },
    }
    // roll=11 > 10 → 失败
    dispatchBattleOpcode(0x6a, [3, 0, 0], ctx) // roll=10 > 3 → 失败
    expect(gs.inventory[0]!.count).toBe(98)
    // roll=0 → 成功偷物
    dispatchBattleOpcode(0x6a, [3, 0, 0], ctx)
    expect(gs.inventory[0]!.count).toBe(99)
    expect(state.enemies[0]!.e.stealItemCount).toBe(1)
    expect(dispatchBattleOpcode(0x6a, [10, 0, 0], { state })).toEqual({ consumed: true })
  })

  it('偷物:包里没有 → push 新条目;stealItemCount=0 → 不抽 rng 直接失败', () => {
    const rng = seqRng([])
    const { state, gs } = makeBattle({
      enemies: [makeEnemy({ stealItem: 30, stealItemCount: 0 })],
      rng,
    })
    const ctx: BattleCtx = {
      state,
      gs,
      target: { type: 'enemy', idx: 0 },
      caster: { type: 'player', idx: 0 },
    }
    dispatchBattleOpcode(0x6a, [10, 0, 0], ctx)
    expect(rng.calls).toEqual([]) // count=0 → 短路不抽 rng
    state.enemies[0]!.e.stealItemCount = 1
    gs.inventory = []
    dispatchBattleOpcode(0x6a, [0, 0, 0], ctx) // rate=0 恒成功
    expect(gs.inventory).toEqual([{ itemId: 30, count: 1 }])
  })
})

describe('cov85 0x1B/0x1C/0x1D 战内 HP/MP delta', () => {
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

describe('cov85 0x22 战内 RevivePlayer', () => {
  it('applyAll:复活死人(比例+清战内全部状态+currentFrame 复位+清≤3级毒);fScriptSuccess=anyRevived', () => {
    const { state, gs, playerRoles } = makeBattle({
      roles: [makeRole(0, { hp: 0 }), makeRole(1, { hp: 80 })],
    })
    state.players[0]!.status.bravery = 9
    state.players[0]!.currentFrame = 2
    gs.rgPoisonStatus[`0_0`] = { wPoisonID: 77, wPoisonScript: 0 }
    const ctx: BattleCtx = { state, gs, playerRoles }
    dispatchBattleOpcode(0x22, [1, 5, 0], ctx)
    expect(playerRoles.roles[0]!.hp).toBe(250)
    expect(state.players[0]!.status.bravery).toBe(0)
    expect(state.players[0]!.currentFrame).not.toBe(2)
    expect(playerRoles.roles[1]!.hp).toBe(80)
    expect(gs.fScriptSuccess).toBe(true)
    expect(gs.rgPoisonStatus['0_0']!.wPoisonID).toBe(0)
    // 全员活着再跑 → false
    dispatchBattleOpcode(0x22, [1, 5, 0], ctx)
    expect(gs.fScriptSuccess).toBe(false)
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

describe('cov85 0x39 DrainHP / 0x68 JumpIfEnemyTurn / 0x91 JumpIfEnemyNotFirst', () => {
  it('0x39:敌扣血、caster 回血钳 maxHP;无 target / 无 caster(player) no-op', () => {
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

  it('0x68:caster=enemy → newIp=op0;否则续行', () => {
    const { state } = makeBattle()
    expect(
      dispatchBattleOpcode(0x68, [66, 0, 0], { state, caster: { type: 'enemy', idx: 0 } }),
    ).toEqual({ consumed: true, newIp: 66 })
    expect(dispatchBattleOpcode(0x68, [66, 0, 0], { state })).toEqual({ consumed: true })
  })

  it('0x91:同种第二个及以后 → newIp;第一个续行;非 enemy caster no-op', () => {
    const fx = makeBattle({
      enemies: [makeEnemy({ id: 5 }), makeEnemy({ id: 5 }), makeEnemy({ id: 6 })],
    })
    expect(
      dispatchBattleOpcode(0x91, [77, 0, 0], {
        state: fx.state,
        caster: { type: 'enemy', idx: 1 },
      }),
    ).toEqual({ consumed: true, newIp: 77 })
    expect(
      dispatchBattleOpcode(0x91, [77, 0, 0], {
        state: fx.state,
        caster: { type: 'enemy', idx: 0 },
      }),
    ).toEqual({ consumed: true })
    expect(
      dispatchBattleOpcode(0x91, [77, 0, 0], {
        state: fx.state,
        caster: { type: 'enemy', idx: 2 },
      }),
    ).toEqual({ consumed: true })
    expect(dispatchBattleOpcode(0x91, [77, 0, 0], { state: fx.state })).toEqual({ consumed: true })
  })
})

describe('cov85 0x9C EnemyDivision / 0x9F EnemyTransform', () => {
  it('0x9C 失败臂:多活敌 → failJump≠0 跳 op1;health≤1 → failJump=0 续行;非 enemy caster no-op', () => {
    const multi = makeBattle({
      enemies: [makeEnemy({ health: 100 }), makeEnemy({ id: 101, health: 100 })],
    })
    expect(
      dispatchBattleOpcode(0x9c, [1, 55, 0], {
        state: multi.state,
        caster: { type: 'enemy', idx: 0 },
      }),
    ).toEqual({ consumed: true, newIp: 55 })
    const weak = makeBattle({ enemies: [makeEnemy({ health: 1 })] })
    expect(
      dispatchBattleOpcode(0x9c, [1, 0, 0], {
        state: weak.state,
        caster: { type: 'enemy', idx: 0 },
      }),
    ).toEqual({ consumed: true })
    expect(dispatchBattleOpcode(0x9c, [1, 0, 0], { state: weak.state })).toEqual({ consumed: true })
  })

  it('0x9C 成功:恰 1 活敌 health>1 → 血减半 + 分裂落 defeated 空槽', () => {
    const fx = makeBattle({
      enemies: [makeEnemy({ health: 100 }), null, null],
    })
    fx.state.enemies[0]!.defeated = false
    fx.state.enemies[1]!.defeated = true
    fx.state.enemies[2]!.defeated = true
    dispatchBattleOpcode(0x9c, [1, 0, 0], {
      state: fx.state,
      caster: { type: 'enemy', idx: 0 },
    })
    expect(fx.state.enemies[0]!.e.health).toBe(50)
    expect(fx.state.enemies[1]!.defeated).toBe(false)
    expect(fx.state.enemies[1]!.e.health).toBe(50)
    expect(fx.state.enemies[2]!.defeated).toBe(true) // w=1 → 只补 1 个空槽
  })

  it('0x9F:hiding/睡眠 → no-op;查无对象/查无 base → no-op;成功保 health 换 stats', () => {
    const hiding = makeBattle({ enemies: [makeEnemy({ health: 300 })] })
    hiding.state.iHidingTime = 5
    const tables = {
      enemies: [makeEnemy({ id: 200, health: 999 })],
      enemyObjects: [makeEnemyObject(50, 200)],
    }
    dispatchBattleOpcode(0x9f, [50, 0, 0], {
      state: hiding.state,
      summonTables: tables,
      caster: { type: 'enemy', idx: 0 },
    })
    expect(hiding.state.enemies[0]!.e.id).toBe(100)
    const asleep = makeBattle({ enemies: [makeEnemy({ health: 300 })] })
    asleep.state.enemies[0]!.status.sleep = 2
    dispatchBattleOpcode(0x9f, [50, 0, 0], {
      state: asleep.state,
      summonTables: tables,
      caster: { type: 'enemy', idx: 0 },
    })
    expect(asleep.state.enemies[0]!.e.id).toBe(100)
    // 查无对象
    const fx = makeBattle({ enemies: [makeEnemy({ health: 300 })] })
    dispatchBattleOpcode(0x9f, [999, 0, 0], {
      state: fx.state,
      summonTables: tables,
      caster: { type: 'enemy', idx: 0 },
    })
    expect(fx.state.enemies[0]!.e.id).toBe(100)
    // 查无 base(enemyId 不在表)
    dispatchBattleOpcode(0x9f, [51, 0, 0], {
      state: fx.state,
      summonTables: { enemies: tables.enemies, enemyObjects: [makeEnemyObject(51, 777)] },
      caster: { type: 'enemy', idx: 0 },
    })
    expect(fx.state.enemies[0]!.e.id).toBe(100)
    // 成功:保 health=300,换 id/stats + objectId
    dispatchBattleOpcode(0x9f, [50, 0, 0], {
      state: fx.state,
      gs: fx.gs,
      summonTables: tables,
      caster: { type: 'enemy', idx: 0 },
    })
    expect(fx.state.enemies[0]!.e.id).toBe(200)
    expect(fx.state.enemies[0]!.e.health).toBe(300)
    expect(fx.state.enemies[0]!.objectId).toBe(50)
    expect(fx.gs.pendingSounds).toContain(47) // 无 bus → 即时音 fallback
  })
})

describe('cov85 0x9E EnemySummon', () => {
  const tables = {
    enemies: [makeEnemy({ id: 200, health: 888 })],
    enemyObjects: [makeEnemyObject(60, 200)],
  }

  it('无表/非 enemy caster → no-op;房位不足(count>defeated 数)→ failJump', () => {
    const fx = makeBattle({ enemies: [makeEnemy({})] })
    expect(dispatchBattleOpcode(0x9e, [60, 2, 0], { state: fx.state })).toEqual({ consumed: true })
    expect(
      dispatchBattleOpcode(0x9e, [60, 2, 0], {
        state: fx.state,
        summonTables: tables,
        caster: { type: 'player', idx: 0 },
      }),
    ).toEqual({ consumed: true })
    expect(
      dispatchBattleOpcode(0x9e, [60, 2, 44], {
        state: fx.state,
        summonTables: tables,
        caster: { type: 'enemy', idx: 0 },
      }),
    ).toEqual({ consumed: true, newIp: 44 })
  })

  it('hiding / 自身睡眠 → failJump;count≤0 → 1', () => {
    const hiding = makeBattle({ enemies: [makeEnemy({}), null] })
    hiding.state.iHidingTime = 3
    hiding.state.enemies[1]!.defeated = true
    expect(
      dispatchBattleOpcode(0x9e, [60, 1, 44], {
        state: hiding.state,
        summonTables: tables,
        caster: { type: 'enemy', idx: 0 },
      }),
    ).toEqual({ consumed: true, newIp: 44 })
    const asleep = makeBattle({ enemies: [makeEnemy({}), null] })
    asleep.state.enemies[1]!.defeated = true
    asleep.state.enemies[0]!.status.paralyzed = 2
    expect(
      dispatchBattleOpcode(0x9e, [60, 1, 44], {
        state: asleep.state,
        summonTables: tables,
        caster: { type: 'enemy', idx: 0 },
      }),
    ).toEqual({ consumed: true, newIp: 44 })
    // count=0 → 1:成功召唤 1 只
    const ok = makeBattle({ enemies: [makeEnemy({}), null] })
    ok.state.enemies[1]!.defeated = true
    dispatchBattleOpcode(0x9e, [60, 0, 0], {
      state: ok.state,
      gs: ok.gs,
      summonTables: tables,
      caster: { type: 'enemy', idx: 0 },
    })
    expect(ok.state.enemies[1]!.e.id).toBe(200)
    expect(ok.state.enemies[1]!.e.health).toBe(888)
    expect(ok.state.enemies[1]!.objectId).toBe(60)
  })

  it('w=0 自身同种:查无 overlay/对象表 → 回退 self 脚本字段;查无 base → no-op', () => {
    const fx = makeBattle({ enemies: [makeEnemy({}), null] })
    fx.state.enemies[1]!.defeated = true
    fx.state.enemies[0]!.scriptOnReady = 111
    dispatchBattleOpcode(0x9e, [0, 1, 0], {
      state: fx.state,
      summonTables: { enemies: [makeEnemy({ id: 100, health: 5 })], enemyObjects: [] },
      caster: { type: 'enemy', idx: 0 },
    })
    expect(fx.state.enemies[1]!.e.id).toBe(100)
    expect(fx.state.enemies[1]!.scriptOnReady).toBe(111)
    // 查无 base
    const nobase = makeBattle({ enemies: [makeEnemy({}), null] })
    nobase.state.enemies[1]!.defeated = true
    dispatchBattleOpcode(0x9e, [0, 1, 0], {
      state: nobase.state,
      summonTables: { enemies: [], enemyObjects: [] },
      caster: { type: 'enemy', idx: 0 },
    })
    expect(nobase.state.enemies[1]!.defeated).toBe(true)
  })
})

describe('cov85 0x69 EnemyEscape / 0x60 EnemyImmediateKO', () => {
  it('0x69:enemyEscapeAnim 起 + terminated 标记 + 音 45', () => {
    const { state, gs } = makeBattle()
    dispatchBattleOpcode(0x69, [0, 0, 0], { state, gs })
    expect(state.enemyEscapeAnim).toEqual({ step: 0 })
    expect(state.terminatedByEnemyEscape).toBe(true)
    expect(gs.pendingSounds).toContain(45)
  })

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

describe('cov85 家族外 opcode → consumed:false', () => {
  it('未实现 opcode(0x01)交还 raw skip', () => {
    const { state } = makeBattle()
    expect(dispatchBattleOpcode(0x01, [0, 0, 0], { state })).toEqual({ consumed: false })
  })
})
