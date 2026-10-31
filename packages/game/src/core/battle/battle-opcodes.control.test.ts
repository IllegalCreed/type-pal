/** Battle dispatch: result/control flow, theft and enemy roster changes. Real state and injected resource tables; no rendering acceptance. */
import type { EnemyObject, Item } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import {
  makeEnemyRecord as makeEnemy,
  makeRoleRecord as makeRole,
} from '../../__tests__/battle-records.js'
import { makeBattle, seqRng } from '../../__tests__/coverage85-glm-game/harness.js'
import type { BattleCtx } from '../event-system.js'
import { dispatchBattleOpcode } from './battle-opcodes.js'

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

describe('0x5C HideParty / 0x89 SetBattleResult / 0x8A AutoBattle', () => {
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
describe('0x33 CollectEnemy / 0x3A PlayerFlee', () => {
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
describe('0x31 ChangeBattleSprite / 0x92 ShowMagicAnim', () => {
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
describe('0x6A StealFromEnemy', () => {
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

  it('偷物:已持有 +1(封顶 99);roll>rate 失败;无 gs no-op', () => {
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
    // seq的11在合法范围[0,10]被夹为10；10>rate3，所以失败。
    dispatchBattleOpcode(0x6a, [3, 0, 0], ctx)
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
describe('0x68/0x91 敌方条件跳转', () => {
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
describe('0x9C EnemyDivision / 0x9F EnemyTransform', () => {
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
describe('0x9E EnemySummon', () => {
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

  it('hiding / 自身定身 → failJump;count=0 → 1', () => {
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
describe('0x69 EnemyEscape', () => {
  it('0x69:enemyEscapeAnim 起 + terminated 标记 + 音 45', () => {
    const { state, gs } = makeBattle()
    dispatchBattleOpcode(0x69, [0, 0, 0], { state, gs })
    expect(state.enemyEscapeAnim).toEqual({ step: 0 })
    expect(state.terminatedByEnemyEscape).toBe(true)
    expect(gs.pendingSounds).toContain(45)
  })
})
describe('家族外 opcode → consumed:false', () => {
  it('未实现 opcode(0x01)交还 raw skip', () => {
    const { state } = makeBattle()
    expect(dispatchBattleOpcode(0x01, [0, 0, 0], { state })).toEqual({ consumed: false })
  })
})
