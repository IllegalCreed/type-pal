/** Battle dispatch: poison targets, status ownership and temporary stat effects. Synthetic metadata, not an original-story execution claim. */
import type { Command, ObjectPoisonView } from '@type-pal/shared'
import { afterEach, describe, expect, it } from 'vitest'
import {
  makeEnemyRecord as makeEnemy,
  makeRoleRecord as makeRole,
} from '../../__tests__/battle-records.js'
import { makeBattle, seqRng } from '../../__tests__/coverage85-glm-game/harness.js'
import { type BattleCtx, runScript } from '../event-system.js'
import { addPoisonForPlayer, setObjectPoisons } from '../player-poison-state.js'
import { damageNums } from './battle-opcode.test-fixtures.js'
import { dispatchBattleOpcode } from './battle-opcodes.js'

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
afterEach(() => setObjectPoisons([]))
describe('0x28 ApplyPoison 抗性/去重/槽满/入口脚本', () => {
  it('单体只毒target1：真实入口立即扣5血并保存续点3，非目标不受影响', () => {
    const { state, gs, bus } = makeBattle({
      enemies: [makeEnemy(), makeEnemy({ id: 101 })],
      rng: seqRng([0, 0]),
    })
    state.enemies[0]!.resistanceToSorcery = 9
    const commands: Command[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x21, operands: [0, 5, 0] },
      { op: 'end', advance: true },
    ]
    const ctx: BattleCtx = {
      state,
      gs,
      bus,
      target: { type: 'enemy', idx: 1 },
      objectPoisons: densePoisons([poison(77, 1)]),
      commands: [...commands],
      runScript,
    }
    expect(dispatchBattleOpcode(0x28, [0, 77, 0], ctx).consumed).toBe(true)
    expect(state.enemies[0]!.poisons).toEqual([]) // 非 target 不落
    const p1 = state.enemies[1]!.poisons
    expect(p1).toHaveLength(1)
    expect(p1![0]).toEqual({ poisonId: 77, scriptEntry: 3 })
    expect(state.enemies.map((enemy) => enemy.e.health)).toEqual([9000, 8995])
    expect(damageNums(bus.drain())).toEqual([
      { op: 'showDamageNum', target: { kind: 'enemy', idx: 1 }, value: 5, color: 'blue' },
    ])
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

  it('毒槽满 16 → 不再落;全体模式只为有空槽的活敌登记毒', () => {
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
describe('0x2A CureEnemyPoisonKind 全体/单体/无 target', () => {
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
describe('resolvePlayerPoisonTargets(0x2B/0x2C/0x29 目标解析)', () => {
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
describe('0x2D SetPlayerStatus 战内状态三族', () => {
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

  it('好状态:活人更久才写，较短持续时间与死人不覆盖', () => {
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
describe('0x2E SetEnemyStatus 命中/抵抗/非法', () => {
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
describe('0x2F RemovePlayerStatus', () => {
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
describe('0x5E JumpIfNoPoison', () => {
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
describe('0x30 BuffPlayerStatPct', () => {
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
    const beforeInvalid = structuredClone({ roles: playerRoles, effects: gs.rgEquipmentEffect })
    // Explicit role bypasses target selection so this reaches the unknown-row guard.
    expect(dispatchBattleOpcode(0x30, [99, 50, 2], ctx)).toEqual({ consumed: true })
    expect(dispatchBattleOpcode(0x30, [17, 50, 0], ctx)).toEqual({ consumed: true })
    expect({ roles: playerRoles, effects: gs.rgEquipmentEffect }).toEqual(beforeInvalid)
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
