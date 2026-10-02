// Q08 r16 · performMagic E2 AoE 自卫预掷与防御姿/多队员受击（typed 零强转，真实公开入口直驱）。
//
// 排重 basis（本批两例只打旧证未覆盖的窄轴）：
// - magic.glm-next-wave.test.ts DM6（:95-117）已证自卫预掷**先于脚本**的时序与单体
//   hit/miss 伤害差（1 队员夹具，断言 hpAfter 比较与 rng 轨迹）。
// - magic-damage.test.ts :425/:458/:568 单元层已证 autoDefend 除数 +1、sleep 无资格、
//   AoE 先预判全队再逐人掷——直调 applyEnemyMagicDamage，不覆盖 wrapper 级集成。
// - magic.ts:953-967（autoDefendIdxs → intro 尾帧注入防御姿 frame3，L16）与
//   :1026-1031（AoE affectedIdxs = hitPlayerIdxs → 多队员受击动画 + 数字挂 hurt 首帧）
//   无旧断言：anim-timeline.test.ts:693/:772 的 currentFrame: 3 是**敌方施法手势帧**，
//   非玩家防御姿；magic-inline-damage EnemyMagic describe（:1147+）与 actions.test.ts
//   :1456 均为 normal 单目标路径。corpus「防御姿/autoDefend+姿态」0 命中。
// 反控：Q-AP1 打全员掷骰命中输入；Q-AP2 打睡眠资格输入（见 counters/*.axis）。

import type { Magic, PlayerRole, PlayerRoles, Spell } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import { performMagic } from './core/battle/actions/magic.js'
import type { BattleEnemy, BattleState } from './core/battle/battle-state.js'
import { createCommandBus } from './core/command-bus.js'
import { runScript as realRunScript } from './core/event-system.js'

/** 每例独立 rng：next=0 → rngFactor 1.0；range 可配（0=自卫掷命中，1=永不）。 */
function rngWith(rangeRoll: number): BattleState['rng'] {
  return {
    next: () => 0,
    range: () => rangeRoll,
    rangeInclusive: () => 0,
    rangeFloat: () => 0,
    getState: () => 0,
  }
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

/** 施法敌（intro 帧型镜像 anim-timeline.test.ts 林月如例：idle1/magic0/attack4/wait1）。 */
const casterEnemy: BattleEnemy = {
  e: {
    id: 100,
    _name: 'Enemy0',
    idleFrames: 1,
    magicFrames: 0,
    attackFrames: 4,
    idleAnimSpeed: 0,
    actWaitFrames: 1,
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
  sleepingSlots: number[] = [],
): {
  state: BattleState
  playerRoles: PlayerRoles
  bus: ReturnType<typeof createCommandBus>
} {
  const roles = Array.from({ length: roleCount }, (_, i) => role(i))
  const state: BattleState = {
    players: roles.map((r, i) => ({
      roleId: r.id,
      prevHp: r.hp,
      prevMp: r.mp,
      defending: false,
      status: {
        sleep: sleepingSlots.includes(i) ? 2 : 0,
        paralyzed: 0,
        confused: 0,
        haste: 0,
        slow: 0,
      },
      pos: { x: 200 + i * 40, y: 170 },
      posOriginal: { x: 200 + i * 40, y: 170 },
      currentFrame: 0,
    })),
    enemies: [
      {
        ...casterEnemy,
        e: { ...casterEnemy.e },
        pos: { x: 160, y: 80 },
        posOriginal: { x: 160, y: 80 },
      },
    ],
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
    rng: rngWith(0),
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
    scriptOnUse: 0,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: false,
      usableInBattle: true,
      usableToEnemy: true,
      applyToAll: false,
    },
  }
}

/** attackAll + effect12：伤害 65 同 r15 手算锚；建链走 EnemyMagic AoE 落点表。 */
function aoeMagicDef(): Magic {
  return {
    id: 7,
    effect: 12,
    type: 'attackAll',
    xOffset: 0,
    yOffset: 0,
    special: 0,
    speed: 0,
    keepEffect: 0,
    fireDelay: 0,
    effectTimes: 1,
    shake: 0,
    wave: 0,
    unknown: 0,
    costMP: 5,
    baseDamage: 45,
    elemental: 1,
    sound: 0,
  }
}

function enemyCastAoe(
  state: BattleState,
  playerRoles: PlayerRoles,
  bus: ReturnType<typeof createCommandBus>,
): void {
  performMagic({
    state,
    casterIsEnemy: true,
    casterIdx: 0,
    spellId: 7,
    targetIsEnemy: false,
    targetIdx: 1, // 数字单选：attackAll 由 magic.ts:369 强制全体（r15 已证派发）
    spells: [spellDef()],
    magics: [aoeMagicDef()],
    playerRoles,
    bus,
    commands: [{ op: 'end' }],
    runScript: realRunScript, // scriptOnUse=0 → 门内短路
    magicSpriteFrameCounts: new Map([[12, 8]]),
  })
}

/** intro 尾帧注入的玩家防御姿条目（L16：autoDefendIdxs → currentFrame 3）。 */
function guardPoseEntries(frame: {
  fighters?: Array<{ side: string; idx: number; currentFrame?: number }>
}) {
  return (frame.fighters ?? [])
    .filter((f) => f.side === 'player' && f.currentFrame === 3)
    .map((f) => ({ side: f.side, idx: f.idx, currentFrame: f.currentFrame }))
}

describe('Q08 performMagic E2 AoE 自卫预掷：防御姿注入与多队员受击（magic.ts:953-967/:1026-1031）', () => {
  test('全员自卫掷命中 → 除数+1 各落 32 + intro 尾帧三人防御姿 + 受击动画全员 + 数字挂 hurt 首帧', () => {
    const { state, playerRoles, bus } = battleState(3)
    state.rng = rngWith(0) // AP1：自卫掷 RandomLong(0,2)==0 全命中
    enemyCastAoe(state, playerRoles, bus)
    // 65 → trunc(65/(1+1)) = 32/人（除数 (defending?2:1)*protect + autoDefend?1:0）
    expect(playerRoles.roles.map((r) => r.hp)).toEqual([468, 468, 468])
    const frames = state.battleAnim?.frames ?? []
    // L16：恰一帧带玩家防御姿（intro 尾帧），三人齐备
    const guardFrames = frames.filter((fr) => guardPoseEntries(fr).length > 0)
    expect(guardFrames).toHaveLength(1)
    expect(guardPoseEntries(guardFrames[0]!)).toEqual([
      { side: 'player', idx: 0, currentFrame: 3 },
      { side: 'player', idx: 1, currentFrame: 3 },
      { side: 'player', idx: 2, currentFrame: 3 },
    ])
    // 多队员受击：5 帧 frame4 + 红闪（i<3 → 6），i=0 无击退位移
    const hurtFrames = frames.filter(
      (fr) =>
        (fr.fighters ?? []).length > 0 &&
        fr.fighters!.every((f) => f.side === 'player' && f.currentFrame === 4),
    )
    expect(hurtFrames).toHaveLength(5)
    expect(hurtFrames[0]!.fighters).toEqual(
      [0, 1, 2].map((i) => ({
        side: 'player',
        idx: i,
        currentFrame: 4,
        iColorShift: 6,
        pos: { x: 200 + i * 40, y: 170 },
      })),
    )
    // 数字不即时 emit，挂 hurt 首帧（value=钳后 delta 32）
    expect(bus.drain().filter((e) => e.cmd.op === 'showDamageNum')).toEqual([])
    expect(hurtFrames[0]!.damageNums).toEqual([
      { target: { kind: 'player', idx: 0 }, value: 32, color: 'blue' },
      { target: { kind: 'player', idx: 1 }, value: 32, color: 'blue' },
      { target: { kind: 'player', idx: 2 }, value: 32, color: 'blue' },
    ])
  })

  test('睡眠队员无自卫资格 → 满伤 65 且无防御姿；清醒队友 32 + 防御姿（fight.c:4727-4735）', () => {
    const { state, playerRoles, bus } = battleState(3, [1]) // 队员1睡眠
    state.rng = rngWith(0) // AP2：同掷命中——资格门（sleep）才是差异轴
    enemyCastAoe(state, playerRoles, bus)
    // 睡眠：canAutoDefend=false → 除数 1 → 满伤 65；清醒：除数 2 → 32
    expect(playerRoles.roles.map((r) => r.hp)).toEqual([468, 435, 468])
    const frames = state.battleAnim?.frames ?? []
    const guardFrames = frames.filter((fr) => guardPoseEntries(fr).length > 0)
    expect(guardFrames).toHaveLength(1)
    expect(guardPoseEntries(guardFrames[0]!)).toEqual([
      { side: 'player', idx: 0, currentFrame: 3 },
      { side: 'player', idx: 2, currentFrame: 3 },
    ])
    const hurtFrames = frames.filter(
      (fr) =>
        (fr.fighters ?? []).length > 0 &&
        fr.fighters!.every((f) => f.side === 'player' && f.currentFrame === 4),
    )
    expect(hurtFrames).toHaveLength(5)
    expect(hurtFrames[0]!.damageNums).toEqual([
      { target: { kind: 'player', idx: 0 }, value: 32, color: 'blue' },
      { target: { kind: 'player', idx: 1 }, value: 65, color: 'blue' },
      { target: { kind: 'player', idx: 2 }, value: 32, color: 'blue' },
    ])
  })
})
