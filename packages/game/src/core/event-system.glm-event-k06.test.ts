/**
 * TEST-GLM-EVENT-WAVE-K-1 · K06 战斗/大世界脚本入口与失败门
 *
 * 审计行(组 K06):
 * - 现行 caller:battle/actions/item.ts:97(performItem → runScript(runtimeMode:'battle')),
 *   fight.c 调用方语义由 battle-system 脚本推进消费;menu 物品使用 → startOverworldItemScript
 *   (menu-driver / event-system.ts:3286);毒入口 runPlayerPoisonEntrySync(event-system.ts:3156,
 *   event-opcode-player.ts:245 注入)。
 * - 旧测证据(排重):event-system.test.ts『runScript (M3 T17, battle mode)』:775-:1136 全部以
 *   **plain end(0x00)收尾** → end advance/reset 的返回值合同零断言;battle 具名 giveItem op 零断言
 *   (蛊孵化链 wEnemyScript 末尾 giveItem 的合同只落在注释);『P1#3 g_fScriptSuccess + 物品消耗 gate』
 *   :4143-:4224 走 scriptOnUse=1 的成功入口 → startOverworldItemScript 两条失败门零断言。
 * - 一手真值:reference/sdlpal/script.c:3204-3237(wNextScriptEntry:0x01 → wScriptEntry+1;
 *   0x02 → resetTo;0x00 → 不变)+ fight.c:1185-1186/1689-1690(`wScriptOnTurnStart =
 *   PAL_RunTriggerScript(...)` 返回值写回 = advance/reset 返回值的消费方);
 *   script.c:970-975(0x1F → PAL_AddItemToInventory(op0, (SHORT)op1));play.c:244-325
 *   (PAL_GameUseItem:script 跑不起来则物品不可用入口的当前合同守卫,event-system.ts:3293-3302)。
 * - 缺口结论:runScript end 三态返回值、battle 具名 giveItem、startOverworldItemScript 失败门
 *   可达且无旧证 → 新增;battle 对话队列/0x69/0x35/0x19 回灌/条件跳转 fall-back 已证不重做。
 */
import type { Command, Enemy, PlayerRole } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createBattleState } from './battle/battle-state.js'
import { type CommandBus, createCommandBus } from './command-bus.js'
import {
  type BattleCtx,
  OP_NOOP_A7,
  type RunScriptOptions,
  runScript,
  setGlobalEvents,
  startOverworldItemScript,
} from './event-system.js'
import { createInitialGameState, type GameState } from './game-state.js'
import { createSeedableRng } from './rng.js'

/** 现行 PlayerRole fixture(battle-state.test.ts minimalRole 同款,合法 CreateBattleStateInput)。 */
function minimalRole(id: number): PlayerRole {
  return {
    id,
    _name: `Role${id}`,
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
  }
}

/** 现行 Enemy fixture(battle-state.test.ts minimalEnemy 同款)。 */
function minimalEnemy(id: number, health = 50): Enemy {
  return {
    id,
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
    health,
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
    defense: 0,
    dexterity: 20,
    fleeRate: 5,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    physicalResistance: 1,
    dualMove: 0,
    collectValue: 0,
  }
}

/**
 * 合法战斗 ctx:经现行构造器 createBattleState 派生(gs.partyMembers=[0] + 1 敌),
 * caster.idx 0 指向真实 state.players[0](卡面"合法正控/现行构造器"要求)。
 */
function makeLegalBattleCtx(gs: GameState): BattleCtx {
  gs.partyMembers = [0]
  const state = createBattleState({
    gs,
    playerRoles: { roles: [minimalRole(0)] },
    enemies: [minimalEnemy(100)],
    field: {
      id: 0,
      screenWave: 0,
      magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    },
    isBoss: false,
    rng: createSeedableRng(1),
  })
  return { state, caster: { type: 'player', idx: 0 }, gs }
}

function runBattleScript(commands: Command[], gs: GameState, bus: CommandBus): number {
  const opts: RunScriptOptions = {
    commands,
    ip: 0,
    bus,
    runtimeMode: 'battle',
    battleCtx: makeLegalBattleCtx(gs),
  }
  return runScript(opts)
}

describe('K06 runScript end 三态返回值(fight.c 写回 wScriptOnTurnStart/Ready 的合同)', () => {
  const bus = createCommandBus()

  it('0x01 advance end → 返回 ip+1(show-once:下轮不再跑本段)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const ret = runBattleScript(
      [
        { op: 'raw', opcode: OP_NOOP_A7, operands: [0, 0, 0] }, // ip0
        { op: 'end', advance: true }, // ip1 → 返回 2
      ],
      gs,
      bus,
    )
    expect(ret).toBe(2)
  })

  it('0x02 reset end → 返回 resetTo 解析的 label ip(re-arm 到指定段)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const ret = runBattleScript(
      [
        { op: 'raw', opcode: OP_NOOP_A7, operands: [0, 0, 0] }, // ip0
        { op: 'end', reset: true, resetTo: 3 }, // ip1 → 返回 L_3 = 3
        { op: 'end' }, // ip2 占位
        { op: 'end', label: 'L_3' }, // ip3:重臂点
      ],
      gs,
      bus,
    )
    expect(ret).toBe(3)
  })

  it('单轴对照 0x00 plain end → 返回起始 ip(每轮重显;同时排除 advance/reset 两臂)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const ret = runBattleScript(
      [
        { op: 'raw', opcode: OP_NOOP_A7, operands: [0, 0, 0] }, // ip0
        { op: 'end' }, // ip1 → 返回 opts.ip = 0
      ],
      gs,
      bus,
    )
    expect(ret).toBe(0)
  })
})

describe('K06 battle 具名 giveItem:毒 tick 脚本末尾炼成蛊入包(sdlpal script.c:970-975;蛊链数据 @40936/40959)', () => {
  it('battle 模式 giveItem{itemId:178,count:2} → battleCtx.gs.inventory +2(不 skip)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const bus = createCommandBus()
    const ret = runBattleScript(
      [
        { op: 'giveItem', itemId: 178, count: 2 }, // ip0
        { op: 'end' }, // ip1
      ],
      gs,
      bus,
    )
    expect(ret).toBe(0) // plain end 正常收尾
    expect(gs.inventory).toEqual([{ itemId: 178, count: 2 }])
  })

  it('夹具合法性对照:caster.idx 0 指向 createBattleState 派生的真实玩家(卡面合法正控)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const ctx = makeLegalBattleCtx(gs)
    expect(ctx.state.players).toHaveLength(1)
    expect(ctx.state.players[0]?.roleId).toBe(0) // caster {player, idx:0} 指向真实玩家
    expect(ctx.state.players[0]?.prevHp).toBe(200) // 从 minimalRole hp 派生
  })
})

describe('K06 startOverworldItemScript 失败门:scriptOnUse=0 / label 不在全局表 → false 且零状态副作用', () => {
  it('scriptOnUse=0 与 L_<n> 缺失都拒绝启动;成功对照 = true + mode=event + pendingItemConsume 记账', () => {
    const gsFail = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    try {
      // 全局表无任何 label → L_1 解析不到
      setGlobalEvents([{ op: 'end' }])
      // 门 1:scriptOnUse=0(sdlpal 不可用物品的守卫;event-system.ts:3293)
      expect(startOverworldItemScript(gsFail, 5, 0, 0, true)).toBe(false)
      // 门 2:label 缺失(P2#5 全局表查不到;event-system.ts:3298-3302)
      expect(startOverworldItemScript(gsFail, 5, 1, 0, true)).toBe(false)
      // 失败门零副作用:不切 mode、不建 cursor、不记消耗
      expect(gsFail.mode).toBe('explore')
      expect(gsFail.eventCursor).toBeUndefined()
      expect(gsFail.pendingItemConsume).toBeUndefined()

      // 成功对照(旧测 :4151 已证,此处作同判据正控):L_1 存在 → 启动 + 消耗记账
      const gsOk = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      setGlobalEvents([{ op: 'end' }, { op: 'end', label: 'L_1' }]) // L_1 → 全局 ip 1
      expect(startOverworldItemScript(gsOk, 5, 1, 0, true)).toBe(true)
      expect(gsOk.mode).toBe('event')
      expect(gsOk.eventCursor?.ip).toBe(1)
      expect(gsOk.pendingItemConsume).toBe(5) // consuming → 脚本结束后按 fScriptSuccess 扣
      expect(gsOk.fScriptSuccess).toBe(true)
    } finally {
      setGlobalEvents([])
    }
  })
})
