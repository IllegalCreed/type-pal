// Q08 r15 · performMagic E2 敌方攻击魔法目标派发与超杀钳制（typed 零强转，真实公开入口直驱）。
//
// 排重 basis（本批三例只打旧证未覆盖的窄轴）：
// - actions.test.ts:1897 已证 E2 单体结算（1 队员夹具；断言数字 target/color，未断言 value/人数/多队员）。
// - actions.test.ts:1928 已证 E2 gate type-agnostic（summon + baseDamage>0 仍结算）——该例**自注
//   「type != normal → 全体，这里单队员」**：单队员夹具结构上无法区分全体/单体派发。
// - magic-damage.test.ts:327+ 直调 applyEnemyMagicDamage 单元（target='all' 为显式传参；
//   钳制 :474 只在单元结果层）。performMagic 级派发行 magic.ts:369
//   `magic.type === 'normal' ? input.targetIdx : 'all'` 从未被多队员夹具证过。
// - magic-inline-damage.test.ts E1 侧已有「血魔神功式 单体 targetIdx → 仍打全体」对照与
//   「超杀显示完整算出伤害」(:646-651)；E2 的对应语义（全体派发 / 超杀数字=剩余 HP delta）无旧证。
// 反控：Q-ET1 打 magic.ts:369 派发行；Q-ET2 打 magic-damage.ts E2 超杀双层钳（见 counters/*.axis）。

import type { Magic, PlayerRole, PlayerRoles, Spell } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import { performMagic } from './core/battle/actions/magic.js'
import type { BattleEnemy, BattleState } from './core/battle/battle-state.js'
import { createCommandBus } from './core/command-bus.js'
import { runScript as realRunScript } from './core/event-system.js'

/** 敌方法术伤害确定性 rng：rngFactor 恒 1.0（next=0），autoDefend 掷 RandomLong(0,2) 恒 1（永不触发）。 */
const fixedRng: BattleState['rng'] = {
  next: () => 0,
  range: () => 1,
  rangeInclusive: () => 1,
  rangeFloat: () => 0,
  getState: () => 0,
}

function role(id: number, opts: Partial<PlayerRole> = {}): PlayerRole {
  return {
    id,
    _name: `Role${id}`,
    avatar: 0,
    spriteNumInBattle: 0,
    spriteNum: 0,
    name: 0,
    attackAll: 0,
    level: 5,
    maxHP: 500,
    maxMP: 30,
    hp: 500,
    mp: 30,
    attackStrength: 100,
    magicStrength: 0,
    defense: 30,
    dexterity: 50,
    fleeRate: 50,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    walkFrames: 0,
    attackSound: 0,
    weaponSound: 0,
    criticalSound: 0,
    magicSound: 9,
    deathSound: 0,
    ...opts,
  }
}

/** 施法敌：magicStrength 28 + level 0 → magStr = 28+(0+6)*6 = 64（actions.test.ts:1897 同锚）。 */
const casterEnemy: BattleEnemy = {
  e: {
    id: 100,
    _name: 'Enemy0',
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
    level: 0,
    magic: 0,
    magicRate: 0,
    attackEquivItem: 0,
    attackEquivItemRate: 0,
    stealItem: 0,
    stealItemCount: 0,
    attackStrength: 0,
    magicStrength: 28,
    defense: 0,
    dexterity: 20,
    fleeRate: 5,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    physicalResistance: 1,
    dualMove: 0,
    collectValue: 0,
  },
  status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
  prevHp: 100,
  scriptOnTurnStart: 0,
  scriptOnBattleEnd: 0,
  scriptOnReady: 0,
  resistanceToSorcery: 0,
  poisons: [],
}

function battleState(
  roleCount: number,
  roleOverrides: Array<Partial<PlayerRole>> = [],
): {
  state: BattleState
  playerRoles: PlayerRoles
  bus: ReturnType<typeof createCommandBus>
} {
  const roles = Array.from({ length: roleCount }, (_, i) => role(i, roleOverrides[i] ?? {}))
  const state: BattleState = {
    players: roles.map((r) => ({
      roleId: r.id,
      prevHp: r.hp,
      prevMp: r.mp,
      defending: false,
      status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
    })),
    enemies: [{ ...casterEnemy, e: { ...casterEnemy.e } }],
    field: {
      id: 0,
      screenWave: 0,
      magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    },
    isBoss: false,
    phase: 'performAction',
    turn: 1,
    actionQueue: [],
    currentActionIndex: 0,
    pendingActions: new Map(),
    uiState: 'hidden',
    menuState: 'main',
    selectedAction: 0,
    miscMenuCursor: 0,
    miscSubMenuCursor: 0,
    uiCursor: 0,
    expGained: 0,
    cashGained: 0,
    rng: fixedRng,
    phaseStallTicks: 0,
  }
  return { state, playerRoles: { roles }, bus: createCommandBus() }
}

function spellDef(): Spell {
  return {
    id: 7,
    _name: 'spell7',
    magicNumber: 7,
    scriptOnSuccess: 0,
    scriptOnUse: 0, // 无脚本：runMagicScript 即时返回，不注入 gs/runScript 依赖
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: false,
      usableInBattle: true,
      usableToEnemy: true,
      applyToAll: false,
    },
  }
}

/** baseDamage 45 + elemental 1(wind)：与旧手算锚（magic-damage.test.ts:350）完全同参 → 伤害 65。 */
function magicDef(type: Magic['type']): Magic {
  return {
    id: 7,
    effect: 0,
    type,
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
  }
}

function enemyCast(
  state: BattleState,
  playerRoles: PlayerRoles,
  bus: ReturnType<typeof createCommandBus>,
  type: Magic['type'],
  targetIdx: number,
): void {
  performMagic({
    state,
    casterIsEnemy: true,
    casterIdx: 0,
    spellId: 7,
    targetIsEnemy: false,
    targetIdx,
    spells: [spellDef()],
    magics: [magicDef(type)],
    playerRoles,
    bus,
    commands: [{ op: 'end' }],
    runScript: realRunScript, // scriptOnUse=0 → runMagicScript 门内短路，真实注入不触发
  })
}

describe('Q08 performMagic E2 敌方攻击魔法目标派发与超杀钳制（magic.ts:368-391）', () => {
  test('attackAll + 数字 targetIdx=1 → 仍结算全体队员（type!=normal 强制 all，fight.c:4719）', () => {
    const { state, playerRoles, bus } = battleState(3)
    enemyCast(state, playerRoles, bus, 'attackAll', 1)
    // 三名队员各吃 65（手算锚：calcBase(64,30)=80;/4=20;+45=65;wind*5/5=65;rngFactor 1.0、无自卫）
    expect(playerRoles.roles.map((r) => r.hp)).toEqual([435, 435, 435])
    const nums = bus
      .drain()
      .map((e) => e.cmd)
      .filter((c) => c.op === 'showDamageNum')
    expect(nums).toEqual([
      { op: 'showDamageNum', target: { kind: 'player', idx: 0 }, value: 65, color: 'blue' },
      { op: 'showDamageNum', target: { kind: 'player', idx: 1 }, value: 65, color: 'blue' },
      { op: 'showDamageNum', target: { kind: 'player', idx: 2 }, value: 65, color: 'blue' },
    ])
  })

  test('对照：normal + 同 targetIdx=1 → 仅目标队员结算，其余原样', () => {
    const { state, playerRoles, bus } = battleState(3)
    enemyCast(state, playerRoles, bus, 'normal', 1)
    expect(playerRoles.roles.map((r) => r.hp)).toEqual([500, 435, 500])
    const nums = bus
      .drain()
      .map((e) => e.cmd)
      .filter((c) => c.op === 'showDamageNum')
    expect(nums).toEqual([
      { op: 'showDamageNum', target: { kind: 'player', idx: 1 }, value: 65, color: 'blue' },
    ])
  })

  test('超杀：伤害钳到剩余 HP，数字=钳后 delta（30 非 65），HP 落 0 不为负', () => {
    const { state, playerRoles, bus } = battleState(1, [
      { hp: 30, maxHP: 30 }, // 剩余 30 < 计算伤害 65
    ])
    const hpBefore = playerRoles.roles[0]!.hp
    enemyCast(state, playerRoles, bus, 'normal', 0)
    expect(playerRoles.roles[0]!.hp).toBe(0)
    // E2 超杀数字 = 整段剩余 HP（钳后真实 delta；对照 E1 超杀显示完整算出伤害）。
    // 期望随输入捕获（hpBefore）：红只能来自钳制关系失效，非初始常量答案错配。
    const nums = bus
      .drain()
      .map((e) => e.cmd)
      .filter((c) => c.op === 'showDamageNum')
    expect(nums).toEqual([
      { op: 'showDamageNum', target: { kind: 'player', idx: 0 }, value: hpBefore, color: 'blue' },
    ])
  })
})
