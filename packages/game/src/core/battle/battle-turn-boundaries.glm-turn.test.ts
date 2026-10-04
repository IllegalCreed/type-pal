/**
 * TEST-GLM-GAME-TURN-BOUNDARIES-1 —— 战斗回合与结算边界合同(GLM r1)。
 *
 * 范围:turn-queue.ts / battle-finalization.ts / battle-system.ts / battle-state.ts
 * 中尚未被 __tests__ 旧测、cov85、glm-next-wave 系列证明的回合队列、结算归类、
 * 回合末毒结算与恢复合同。排重账见 docs/ops/evidence/TEST-GLM-GAME-TURN-BOUNDARIES-1/。
 *
 * 全部走公开 caller(tickBattle / startBattle);fixture 直填 pendingActions 为
 * 既有测试认可的注入方式(battle-system.test.ts 头注释)。
 */
import type {
  BattleField,
  Command,
  Enemy,
  EnemyTeam,
  InputSnapshot,
  Item,
  PlayerRole,
  PlayerRoles,
} from '@type-pal/shared'
import { describe, expect, it, vi } from 'vitest'
import { type CommandBus, createCommandBus } from '../command-bus.js'
import { createInitialGameState, type GameState } from '../game-state.js'
import { startBattle, tickBattle } from './battle-system.js'

// ============================================================================
// Fixture helpers(对齐 __tests__/battle-system.test.ts 的 makeRole/makeEnemy/bootstrap)
// ============================================================================

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
    attackStrength: 100,
    magicStrength: 0,
    defense: 50,
    dexterity: 50,
    fleeRate: 50,
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
    exp: 50,
    cash: 30,
    level: 5,
    magic: 0,
    magicRate: 0,
    attackEquivItem: 0,
    attackEquivItemRate: 0,
    stealItem: 0,
    stealItemCount: 0,
    attackStrength: 10,
    magicStrength: 0,
    defense: 10,
    dexterity: 20,
    fleeRate: 0,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    physicalResistance: 1,
    dualMove: 0,
    collectValue: 0,
    ...opts,
  }
}

interface BootstrapOpts {
  partyMembers?: number[]
  roles?: PlayerRole[]
  enemies?: Enemy[]
  teamSlots?: number[]
  commands?: Command[]
}

function bootstrap(opts: BootstrapOpts = {}): {
  gs: GameState
  bus: CommandBus
  playerRoles: PlayerRoles
  emptyInput: InputSnapshot
} {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = opts.partyMembers ?? [0]
  const roles: PlayerRole[] = opts.roles ?? gs.partyMembers.map((id) => makeRole({ id }))
  const playerRoles: PlayerRoles = { roles }
  const enemies: Enemy[] = opts.enemies ?? [makeEnemy()]
  const teamSlots: number[] = opts.teamSlots ?? [enemies[0]!.id, 0xffff, 0xffff, 0xffff, 0xffff]
  const enemyTeams: EnemyTeam[] = [
    { id: 0, enemies: teamSlots as [number, number, number, number, number] },
  ]
  const field: BattleField = {
    id: 0,
    screenWave: 0,
    magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
  }
  const items: Item[] = []
  const bus = createCommandBus()
  startBattle({
    gs,
    enemyTeamId: 0,
    battleFieldId: 0,
    isBoss: false,
    enemies,
    enemyTeams,
    battleFields: [field],
    playerRoles,
    items,
    spells: [],
    magics: [],
    commands: opts.commands ?? [{ op: 'end' }],
    rngSeed: 42,
  })
  return { gs, bus, playerRoles, emptyInput: { held: new Set(), pressed: new Set(), frameNum: 0 } }
}

/** preBattle → selectAction 一 tick(无 introFade)。 */
function enterSelectAction(gs: GameState, bus: CommandBus, input: InputSnapshot): void {
  tickBattle(gs, input, bus)
  expect(gs.battleState?.phase).toBe('selectAction')
}

describe('TEST-GLM-GAME-TURN-BOUNDARIES-1', () => {
  // ── battle-finalization.ts:14-34 结算归类(lost / forced 两臂均无直接旧测)────────

  it('finalizeBattle lost 归类:resume 接回 lostIp + 战斗 MP 回写 runtime(战败不伪复活)', () => {
    // finalizeBattle 的 outcome 三元(battle-finalization.ts:26-32)只被旧测经 fleed(草妖 wonIp /
    // battle-finalization.test fledIp)证明;'lost' 归类与 finalizeBattle:23 的 HP/MP 回写(won 路径走
    // settlement owner,不走这里)均未证。手摆 phase='lost' 同旧测 '逃跑/战败不跑 scriptOnBattleEnd' 手法。
    const { gs, bus, emptyInput, playerRoles } = bootstrap()
    const st = gs.battleState!
    playerRoles.roles[0]!.hp = 0 // 全员阵亡(战败结算值)
    playerRoles.roles[0]!.mp = 22
    gs.postBattleResume = { wonIp: 11, lostIp: 22, fledIp: 33 }
    st.phase = 'lost'
    tickBattle(gs, emptyInput, bus)
    expect(gs.mode).toBe('event')
    expect(gs.eventCursor?.ip).toBe(22) // lost → lostIp(非 wonIp 11 / fledIp 33)
    expect(gs.PlayerRolesRuntime.rgwMP[0]).toBe(22) // finalizeBattle:23 回写(测试 gs runtime 初始全 0)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(0) // 死员 hp=0 原样回写,不伪复活
    expect(gs.battleState).toBeUndefined()
  })

  it('finalizeBattle forced(看门狗)归类 won:非终态 phase 强制收场也接回 wonIp', () => {
    // cov85 只证 stall → explore + console.error;forced=true → outcome 'won' 的脚本归类
    // (battle-finalization.ts:26-27)未证 —— phase='performAction' 非终态,若按 phase 分支会落错 ip。
    const { gs, bus, emptyInput } = bootstrap()
    const st = gs.battleState!
    gs.postBattleResume = { wonIp: 11, lostIp: 22, fledIp: 33 }
    st.phase = 'performAction'
    st.phaseStallTicks = 1501 // > PHASE_STALL_TICKS_LIMIT(1500)
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    tickBattle(gs, emptyInput, bus)
    err.mockRestore()
    expect(gs.mode).toBe('event')
    expect(gs.eventCursor?.ip).toBe(11) // forced → 'won'(非 lostIp/fledIp)
    expect(gs.battleState).toBeUndefined()
  })

  // ── battle-system.ts:598-624/755 行动倍率(defend ×5 已证,其余臂未证)──────────

  it('行动倍率 flee ×0.5 floor(L10,fight.c:1547):奇数 dex 逃跑者降到攻击者与敌人之后', () => {
    // 同 dex(21)两队员:p1 攻击 21、p0 逃跑 21×0.5=10.5 floor 10。敌 level0/dex0 = (0+6)*3 = 18。
    // 抖动钉 1.0(同 D7 测手法)→ 期望序 [p1(21), 敌(18), p0(10)]。
    const { gs, bus, emptyInput } = bootstrap({
      partyMembers: [0, 1],
      roles: [makeRole({ id: 0, dexterity: 21 }), makeRole({ id: 1, dexterity: 21 })],
      enemies: [makeEnemy({ id: 100, level: 0, dexterity: 0 })],
    })
    const st = gs.battleState!
    st.rng.rangeFloat = () => 1
    enterSelectAction(gs, bus, emptyInput)
    st.pendingActions.set(0, { type: 'flee', target: -1 })
    st.pendingActions.set(1, { type: 'attack', target: 0 })
    tickBattle(gs, emptyInput, bus) // 选满 → 建 queue → performAction
    expect(st.actionQueue.map((q) => [q.isEnemy, q.idx, q.dex])).toEqual([
      [false, 1, 21],
      [true, 0, 18],
      [false, 0, 10],
    ])
  })

  it('行动倍率 item ×3(fight.c:1549):物品动作压过基础 dex 更高的攻击者', () => {
    // p0 物品 dex 8×3=24 > p1 攻击 20 > 敌 18。×3 失效 → p0(8) 掉到队尾。
    const { gs, bus, emptyInput } = bootstrap({
      partyMembers: [0, 1],
      roles: [makeRole({ id: 0, dexterity: 8 }), makeRole({ id: 1, dexterity: 20 })],
      enemies: [makeEnemy({ id: 100, level: 0, dexterity: 0 })],
    })
    const st = gs.battleState!
    st.rng.rangeFloat = () => 1
    enterSelectAction(gs, bus, emptyInput)
    st.pendingActions.set(0, { type: 'item', actionId: 1, target: 0, targetSide: 'player' })
    st.pendingActions.set(1, { type: 'attack', target: 0 })
    tickBattle(gs, emptyInput, bus)
    expect(st.actionQueue.map((q) => [q.isEnemy, q.idx, q.dex])).toEqual([
      [false, 0, 24],
      [false, 1, 20],
      [true, 0, 18],
    ])
  })

  it('濒死 ÷2(fight.c:1558):濒死队员行动序降到健康低 dex 队员之后', () => {
    // p0 攻击 dex 30、hp 10/maxHP 200(阈值 min(100,40)=40 → 濒死)→ 15;p1 健康 dex 20。
    const { gs, bus, emptyInput } = bootstrap({
      partyMembers: [0, 1],
      roles: [
        makeRole({ id: 0, dexterity: 30, hp: 10, maxHP: 200 }),
        makeRole({ id: 1, dexterity: 20 }),
      ],
      enemies: [makeEnemy({ id: 100, level: 0, dexterity: 0 })],
    })
    const st = gs.battleState!
    st.rng.rangeFloat = () => 1
    enterSelectAction(gs, bus, emptyInput)
    st.pendingActions.set(0, { type: 'attack', target: 0 })
    st.pendingActions.set(1, { type: 'attack', target: 0 })
    tickBattle(gs, emptyInput, bus)
    expect(st.actionQueue.map((q) => [q.isEnemy, q.idx, q.dex])).toEqual([
      [false, 1, 20],
      [true, 0, 18],
      [false, 0, 15],
    ])
  })

  // ── battle-system.ts:2505-2507 队列消费:死亡敌人行动项跳过 ────────────────────

  it('行动项死亡敌人跳过:被先手击杀的敌人轮到时不行动(存活敌照常轮转)', () => {
    // 旧测只证死亡**队员**队列项跳过;全敌死走早退、单敌死留队列的消费语义未证。
    // p0(dex 50)先手秒杀 A(health 1);A 队列项轮到时已 defeated → 不行动;B 睡眠 pass。
    // 若死亡检查失效 → A 诈尸以 attackStrength 999 攻击 p0 → hp 变化可判别。
    const { gs, bus, emptyInput, playerRoles } = bootstrap({
      partyMembers: [0],
      roles: [makeRole({ id: 0, hp: 9999, maxHP: 9999, dexterity: 50, attackStrength: 500 })],
      enemies: [
        makeEnemy({ id: 100, level: 0, dexterity: 0, health: 1, attackStrength: 999 }),
        makeEnemy({ id: 200, level: 0, dexterity: 0, health: 99999, attackStrength: 999 }),
      ],
      teamSlots: [100, 200, 0xffff, 0xffff, 0xffff],
    })
    const st = gs.battleState!
    st.enemies[1]!.status.sleep = 999 // B 不出手,隔离 A 的跳过语义
    st.rng.rangeFloat = () => 1
    enterSelectAction(gs, bus, emptyInput)
    st.pendingActions.set(0, { type: 'attack', target: 0 })
    let guard = 300
    while (gs.mode === 'battle' && !(st.phase === 'selectAction' && st.turn === 1) && guard-- > 0)
      tickBattle(gs, emptyInput, bus)
    expect(st.turn).toBe(1) // 整轮跑完回下一轮(A、B 两项都消费掉)
    expect(playerRoles.roles[0]!.hp).toBe(9999) // A 死后未行动、B 睡眠 → 全程无伤
  })

  // ── battle-system.ts:430/2099-2124 flee 成功即中止剩余队列 ─────────────────────

  it('flee 成功即中止剩余队列:后续队员的 flee 不再掷骰(逃跑音 45 恰一次)', () => {
    // fleeAnim hold 期间整场冻结:队列里 p1 的 flee 永不执行。旧逃跑测均为单人队,
    // 多人队列中止未证。oracle = performFlee 成功才推 gs.pendingSounds 45(battle.c:1459)。
    // 敌 50 级(dex 168)队首先手,攻击动画在 p0 flee 前播完;两队员 hp 拉满扛住先手
    // (伤害公式含等级项,p0 必须活着才能成为首个掷骰者)。变异若放行后续队列,p1
    // (紧随 p0)的 flee 掷骰必然先于 16 步逃跑动画完成 → 第二声 45 可判别。
    const { gs, bus, emptyInput } = bootstrap({
      partyMembers: [0, 1],
      roles: [
        makeRole({ id: 0, dexterity: 50, hp: 9999, maxHP: 9999 }),
        makeRole({ id: 1, dexterity: 10, hp: 9999, maxHP: 9999 }),
      ],
      enemies: [makeEnemy({ id: 100, level: 50, dexterity: 0, attackStrength: 0, fleeRate: 0 })],
    })
    const st = gs.battleState!
    st.rng.rangeInclusive = () => 0 // flee 掷骰恒 0 ≤ str(0) → 必成(同旧逃跑测手法)
    enterSelectAction(gs, bus, emptyInput)
    st.pendingActions.set(0, { type: 'flee', target: -1 })
    st.pendingActions.set(1, { type: 'flee', target: -1 })
    let guard = 300
    while (gs.mode === 'battle' && guard-- > 0) tickBattle(gs, emptyInput, bus)
    expect(gs.mode).toBe('explore')
    expect((gs.pendingSounds ?? []).filter((s) => s === 45)).toHaveLength(1) // 只 p0 掷成一次
  })

  // ── battle-system.ts:2102-2124 逃跑动画只逐步挪活队员 ─────────────────────────

  it('fleeAnim 逐步位移只挪活队员:战内阵亡者保持原位(battle.c:1469 只挪活人)', () => {
    // 16 步完成后的全员移出屏(9999)是 sdlpal battle.c:1520-1523 全员语义;
    // 逐步位移段的 hp<=0 守卫(2109)未证:死队员不应跟着滑步。
    const { gs, bus, emptyInput, playerRoles } = bootstrap({
      partyMembers: [0, 1],
      roles: [makeRole({ id: 0, dexterity: 50 }), makeRole({ id: 1 })],
      enemies: [makeEnemy({ id: 100, level: 0, dexterity: 0, attackStrength: 0, fleeRate: 0 })],
    })
    const st = gs.battleState!
    playerRoles.roles[1]!.hp = 0 // 模拟战内阵亡(L23 复活在 startBattle 内,此处后置)
    st.rng.rangeInclusive = () => 0
    enterSelectAction(gs, bus, emptyInput)
    st.pendingActions.set(0, { type: 'flee', target: -1 })
    let guard = 300
    while (
      gs.mode === 'battle' &&
      (!gs.battleState?.fleeAnim || gs.battleState.fleeAnim.step < 1) &&
      guard-- > 0
    )
      tickBattle(gs, emptyInput, bus)
    expect(st.fleeAnim?.step).toBe(1)
    expect(st.players[0]!.pos).toEqual({ x: 205, y: 180 }) // 活队员右下 +5/+4(2 人 layout 200,176)
    expect(st.players[1]!.pos).toEqual({ x: 256, y: 152 }) // 死队员不动
  })

  // ── battle-system.ts:2137-2163 敌逃动画:死敌槽不位移 ─────────────────────────

  it('enemyEscapeAnim 死敌槽不位移:0x69 触发后仅活敌左移(battle.c:1408 死敌跳过)', () => {
    // D13/L11 旧测均为单活敌;defeated 槽(召唤/分裂复用的空槽语义)不参与逃飞未证。
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 50 }), makeEnemy({ id: 200, health: 50 })],
      teamSlots: [100, 200, 0xffff, 0xffff, 0xffff],
    })
    const st = gs.battleState!
    st.enemies[0]!.defeated = true
    st.enemies[0]!.pos = { x: 100, y: 80 }
    st.enemies[1]!.pos = { x: 200, y: 80 }
    st.enemyEscapeAnim = { step: 0 } // 模拟 0x69 触发(同 D13 旧测手法)
    tickBattle(gs, emptyInput, bus)
    expect(st.enemies[1]!.pos?.x).toBe(180) // 活敌 -ENEMY_FLYOUT_DX(20)
    expect(st.enemies[0]!.pos?.x).toBe(100) // 死敌槽原位
  })

  // ── battle-system.ts:3029-3049 回合末玩家毒 tick ─────────────────────────────

  it('玩家毒 tick:回合末每毒槽跑 wPoisonScript 扣血 + 返回值回写推进毒链(fight.c:1624)', () => {
    // 旧测只覆盖敌侧毒 tick(0x21);玩家侧 rgPoisonStatus 槽循环 + wPoisonScript 回写
    // (sdlpal fight.c:1657-1697)无任何驱动(wPoisonScript 在旧测中恒 0)。
    // 毒脚本 = ip1 0x1B[0,-10,0](单体 HP delta,battle 侧毒扣血真opcode)→ ip2 advance end
    // → 返回 end 行+1 = 3(推进,下轮不再从入口重跑)。
    const commands: Command[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x1b, operands: [0, -10, 0] },
      { op: 'end', advance: true },
    ]
    const { gs, bus, emptyInput, playerRoles } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 99999, level: 0, dexterity: 0, attackStrength: 0 })],
      commands,
    })
    const st = gs.battleState!
    st.enemies[0]!.status.sleep = 999 // 敌全程 pass,隔离毒结算
    playerRoles.roles[0]!.hp = 100
    gs.rgPoisonStatus['0_0'] = { wPoisonID: 5, wPoisonScript: 1 }
    enterSelectAction(gs, bus, emptyInput)
    st.pendingActions.set(0, { type: 'defend', target: -1 })
    let guard = 100
    while (gs.mode === 'battle' && st.phase !== 'postAction' && guard-- > 0)
      tickBattle(gs, emptyInput, bus)
    tickBattle(gs, emptyInput, bus) // postAction:玩家毒 tick + 回合收尾
    expect(playerRoles.roles[0]!.hp).toBe(90) // 100 - 10(0x1B 负 delta)
    expect(gs.rgPoisonStatus['0_0']?.wPoisonScript).toBe(3) // advance end 返回值回写
    expect(st.phase).toBe('selectAction') // 双方都活 → 下一轮
  })

  it('DM12:毒改 HP → 回合末 8 tick 停顿后才开下轮菜单(fight.c:1664-1668)', () => {
    // cov85 只证 roundEndDelayTicks>0 的递减臂;「毒结算改 HP → 置 8」的设置臂未证。
    const commands: Command[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x1b, operands: [0, -10, 0] },
      { op: 'end', advance: true },
    ]
    const { gs, bus, emptyInput, playerRoles } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 99999, level: 0, dexterity: 0, attackStrength: 0 })],
      commands,
    })
    const st = gs.battleState!
    st.enemies[0]!.status.sleep = 999
    playerRoles.roles[0]!.hp = 100
    gs.rgPoisonStatus['0_0'] = { wPoisonID: 5, wPoisonScript: 1 }
    enterSelectAction(gs, bus, emptyInput)
    st.pendingActions.set(0, { type: 'defend', target: -1 })
    let guard = 100
    while (gs.mode === 'battle' && st.phase !== 'postAction' && guard-- > 0)
      tickBattle(gs, emptyInput, bus)
    tickBattle(gs, emptyInput, bus)
    expect(st.roundEndDelayTicks).toBe(8) // PAL_BattleDelay(8) 停顿被登记
  })

  it('战斗已分胜负的回合跳过回合末毒结算(普攻终结后毒不多扣一次,fight.c:1116-1150)', () => {
    // 回合正常跑完才跑毒;本回合已被战斗(非毒)分出胜负 → 毒 tick 整段跳过。
    // 玩家中毒 + 一击秒敌 → won 转换时毒未扣血、毒脚本入口未被消费。
    const commands: Command[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x1b, operands: [0, -10, 0] },
      { op: 'end', advance: true },
    ]
    const { gs, bus, emptyInput, playerRoles } = bootstrap({
      roles: [makeRole({ id: 0, hp: 100, attackStrength: 500, dexterity: 50 })],
      enemies: [makeEnemy({ id: 100, health: 1, level: 0, dexterity: 0, attackStrength: 0 })],
      commands,
    })
    const st = gs.battleState!
    st.rng.rangeFloat = () => 1 // p0 dex 50 先手,秒杀唯一敌
    gs.rgPoisonStatus['0_0'] = { wPoisonID: 5, wPoisonScript: 1 }
    enterSelectAction(gs, bus, emptyInput)
    st.pendingActions.set(0, { type: 'attack', target: 0 })
    let guard = 300
    while (gs.mode === 'battle' && st.phase !== 'won' && guard-- > 0)
      tickBattle(gs, emptyInput, bus)
    expect(st.phase).toBe('won')
    expect(playerRoles.roles[0]!.hp).toBe(100) // 毒未结算
    expect(gs.rgPoisonStatus['0_0']?.wPoisonScript).toBe(1) // 毒脚本入口未被消费/回写
  })

  // ── battle-system.ts:2585-2595 执行期吞并/粘滞(DL3 / DL1)────────────────────

  it('DL3 fThisTurnCoop:合击后同回合后续玩家动作吞为 pass(无攻击伤害、无攻击隐藏经验)', () => {
    // 合击吞并臂(2586-2587)无旧测(coop-magic.test 只证合击本身)。fThisTurnCoop 由
    // performCoopMagic 置真(2983),此处直摆该 typed 字段隔离 gate 本体。
    const { gs, bus, emptyInput } = bootstrap({
      roles: [makeRole({ id: 0, attackStrength: 500 })],
      enemies: [makeEnemy({ id: 100, health: 99999, level: 0, dexterity: 0, attackStrength: 0 })],
    })
    const st = gs.battleState!
    st.phase = 'performAction'
    st.uiState = 'hidden'
    st.fThisTurnCoop = true // 本回合已执行过合击
    st.actionQueue = [{ isEnemy: false, idx: 0, dex: 100, fIsSecond: false }]
    st.currentActionIndex = 0
    st.pendingActions.set(0, { type: 'attack', target: 0 }) // 后续手动动作
    let guard = 100
    while (gs.mode === 'battle' && st.phase === 'performAction' && guard-- > 0)
      tickBattle(gs, emptyInput, bus)
    expect(st.enemies[0]!.e.health).toBe(99999) // 吞为 pass → 攻击未发生
    expect(gs.Exp.rgAttackExp[0]!.wCount ?? 0).toBe(0) // E04 攻击隐藏经验未累积(执行的是 pass)
  })

  it('DL1 prevPlayerAutoAtk 粘性:围攻后手动防御被强制改普攻(防御经验 0/攻击经验 1)', () => {
    // 围攻粘性臂(2591-2595)无旧测(杂项盒测只证 fAutoAttack 开关)。prevPlayerAutoAtk 由
    // 前序 auto-attack 动作置真(2592),此处直摆隔离 gate 本体。
    const { gs, bus, emptyInput } = bootstrap({
      roles: [makeRole({ id: 0, attackStrength: 500 })],
      enemies: [makeEnemy({ id: 100, health: 99999, level: 0, dexterity: 0, attackStrength: 0 })],
    })
    const st = gs.battleState!
    st.phase = 'performAction'
    st.uiState = 'hidden'
    st.prevPlayerAutoAtk = true // 本回合先序队员已 auto-attack
    st.actionQueue = [{ isEnemy: false, idx: 0, dex: 100, fIsSecond: false }]
    st.currentActionIndex = 0
    st.pendingActions.set(0, { type: 'defend', target: -1 }) // 中途取消围攻后的手动防御
    let guard = 100
    while (gs.mode === 'battle' && st.phase === 'performAction' && guard-- > 0)
      tickBattle(gs, emptyInput, bus)
    expect(st.enemies[0]!.e.health).toBeLessThan(99999) // 被强制改普攻并命中
    expect(gs.Exp.rgDefenseExp[0]!.wCount ?? 0).toBe(0) // 防御未执行
    expect(gs.Exp.rgAttackExp[0]!.wCount ?? 0).toBe(1) // 改后的普攻累积攻击经验
  })

  // ── battle-system.ts:2175-2183 隐身期 turnStart 脚本跳过 ─────────────────────

  it('隐身期(iHidingTime>0)敌整轮跳过包括 turnStart 脚本(不排嘲讽对话,fight.c:1680)', () => {
    // 旧隐身测(3685)只证敌方行动跳过;turnStart 脚本门(2183)未证 ——
    // 隐身回合 boss 嘲讽对话不应入队。
    const commands: Command[] = [
      { op: 'end' },
      { op: 'showDialog', messageIndex: 0, text: '退下' },
      { op: 'end' },
    ]
    const { gs, bus, emptyInput } = bootstrap({
      enemies: [makeEnemy({ id: 100, health: 99999, level: 0, dexterity: 0, attackStrength: 0 })],
      commands,
    })
    const st = gs.battleState!
    st.enemies[0]!.scriptOnTurnStart = 1
    st.iHidingTime = 5 // 已激活隐身(0x5C 负值经 activateHidingEffect 取反后的态)
    enterSelectAction(gs, bus, emptyInput)
    tickBattle(gs, emptyInput, bus) // 轮起手 turnStart 门
    expect(st.battleDialogQueue?.length ?? 0).toBe(0) // 隐身 → 脚本未跑、对话未入队
    expect(st.turnStartDoneForTurn).toBe(0) // 轮次标记照常登记(该轮不再补跑)
  })
})
