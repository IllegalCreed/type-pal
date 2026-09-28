/**
 * TEST-GLM-PHASE1-LEAVES-3 L07（battle-inspect.ts）— 去重表：
 *  - battle-inspect.test（field signed 场效/敌血量名/普攻毒四分支/灵葫值/party 名源血抗/结构化
 *    状态/levelUpExp nextExp/hiddenExp 标签序）→ 不重复
 *  - 新差异：persistent 来源（explore + rgPlayerStatus）、slow 无 persistentIndex 恒 0、
 *    rgPoisonStatus 毒条 entries/tags（知名/未知/毒ID0 跳过）、battle players[slot].roleId
 *    投影与非战斗槽回退 persistent、敌 steal 金钱/物品名缺三分支、maxHealth 缺省 prevHp 回退、
 *    defeated/巫抗/敌状态敌毒、isBoss+screenWave、三收集器输入深保真（结构化快照逐字段比对）。
 * 显示值正确 ≠ 伤害公式正确：本组只核只读投影；不跑战斗公式。
 * 合法 typed 输入：GameState 来自 createInitialGameState（真实工厂），battleState 完整字面量，
 * 不用 as-cast 掩盖缺字段。
 */
import type { Enemy, ObjectPoisonView, PlayerRoles } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import type { BattleState } from '../battle/battle-state.js'
import { createInitialGameState } from '../game-state.js'
import { createSeedableRng } from '../rng.js'
import {
  collectEnemyStatusReadouts,
  collectFieldInfoReadout,
  collectPartyStatusReadouts,
} from './battle-inspect.js'

const POISON_ID = 551

const objectPoisons: ObjectPoisonView[] = [
  { id: POISON_ID, level: 3, color: 0, playerScript: 0, enemyScript: 4242 },
]
const items: Parameters<typeof collectPartyStatusReadouts>[3] = [
  {
    id: POISON_ID,
    _name: '毒蛇卵',
    bitmap: 0,
    price: 0,
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
  },
]

function roles(): PlayerRoles {
  return {
    roles: [
      {
        id: 0,
        _name: '李逍遥',
        avatar: 0,
        spriteNumInBattle: 0,
        spriteNum: 0,
        name: 0,
        attackAll: 0,
        level: 10,
        maxHP: 120,
        maxMP: 60,
        hp: 100,
        mp: 50,
        attackStrength: 30,
        magicStrength: 40,
        defense: 12,
        dexterity: 18,
        fleeRate: 7,
        poisonResistance: 8,
        elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
        walkFrames: 3,
        attackSound: 0,
        weaponSound: 0,
        criticalSound: 0,
        magicSound: 0,
        deathSound: 0,
      },
      {
        id: 1,
        _name: '赵灵儿',
        avatar: 0,
        spriteNumInBattle: 0,
        spriteNum: 0,
        name: 0,
        attackAll: 0,
        level: 9,
        maxHP: 90,
        maxMP: 80,
        hp: 88,
        mp: 70,
        attackStrength: 20,
        magicStrength: 50,
        defense: 10,
        dexterity: 22,
        fleeRate: 6,
        poisonResistance: 4,
        elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
        walkFrames: 3,
        attackSound: 0,
        weaponSound: 0,
        criticalSound: 0,
        magicSound: 0,
        deathSound: 0,
      },
    ],
  }
}

function mkEnemy(partial: Partial<Enemy>): Enemy {
  return {
    id: 100,
    _name: '飞贼',
    idleFrames: 3,
    magicFrames: 2,
    attackFrames: 3,
    idleAnimSpeed: 6,
    actWaitFrames: 0,
    yPosOffset: 0,
    attackSound: 0,
    actionSound: 0,
    magicSound: 0,
    deathSound: 0,
    callSound: 0,
    health: 42,
    exp: 20,
    cash: 15,
    level: 3,
    magic: 0,
    magicRate: 0,
    attackEquivItem: 0,
    attackEquivItemRate: 0,
    stealItem: 0,
    stealItemCount: 0,
    attackStrength: 10,
    magicStrength: 0,
    defense: 5,
    dexterity: 8,
    fleeRate: 1,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    physicalResistance: 0,
    dualMove: 0,
    collectValue: 0,
    ...partial,
  }
}

/** 完整合法 BattleState 字面量（collectors 只读 players/enemies/field/isBoss，其余按类型补齐）。 */
function mkBattleState(
  players: BattleState['players'],
  enemies: BattleState['enemies'],
  isBoss: boolean,
): BattleState {
  return {
    players,
    enemies,
    field: {
      id: 7,
      screenWave: 2,
      magicEffect: { wind: 1, thunder: 0, water: 0, fire: -2, earth: 0 },
    },
    isBoss,
    phase: 'selectAction',
    turn: 1,
    actionQueue: [],
    currentActionIndex: 0,
    pendingActions: new Map(),
    uiState: 'wait',
    menuState: 'main',
    selectedAction: 0,
    uiCursor: 0,
    miscMenuCursor: 0,
    miscSubMenuCursor: 0,
    expGained: 0,
    cashGained: 0,
    rng: createSeedableRng(1),
    phaseStallTicks: 0,
  }
}

const ZERO_STATUS = { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 }

function oneEnemy(
  partial: Partial<Enemy>,
  be?: Omit<Partial<BattleState['enemies'][number]>, 'status'> & {
    status?: Partial<BattleState['enemies'][number]['status']>
  },
) {
  const enemy = mkEnemy(partial)
  const { status, ...rest } = be ?? {}
  return mkBattleState(
    [{ roleId: 0, prevHp: 100, prevMp: 50, defending: false, status: { ...ZERO_STATUS } }],
    [
      {
        e: enemy,
        status: { ...ZERO_STATUS, ...status },
        prevHp: 42,
        scriptOnTurnStart: 0,
        scriptOnBattleEnd: 0,
        scriptOnReady: 0,
        poisons: [],
        resistanceToSorcery: 4,
        ...rest,
      },
    ],
    false,
  )
}

/** explore 底座（真实工厂）+ 可选战斗态；runtime 数组按 roleId 赋值。 */
function makeGs(opts: { battle?: BattleState } = {}) {
  const gs = createInitialGameState({ x: 100, y: 200, facing: 'down' })
  gs.partyMembers = [0, 1]
  const rt = gs.PlayerRolesRuntime
  rt.rgwLevel[0] = 10
  rt.rgwLevel[1] = 9
  rt.rgwHP[0] = 100
  rt.rgwMaxHP[0] = 120
  rt.rgwMP[0] = 50
  rt.rgwMaxMP[0] = 60
  rt.rgwHP[1] = 88
  rt.rgwMaxHP[1] = 90
  rt.rgwMP[1] = 70
  rt.rgwMaxMP[1] = 80
  rt.rgwElementalResistance[0]![0] = 5
  rt.rgwPoisonResistance[0] = 8
  gs.Exp.rgPrimaryExp[0]!.wExp = 250
  gs.Exp.rgAttackExp[0]!.wExp = 40
  gs.Exp.rgAttackExp[0]!.wLevel = 3
  gs.Exp.rgAttackExp[0]!.wCount = 12
  if (opts.battle) {
    gs.mode = 'battle'
    gs.battleState = opts.battle
  }
  return gs
}

describe('L07 collectPartyStatusReadouts 剩余投影', () => {
  it('persistent 来源：explore 下 rgPlayerStatus[role][idx] 计数 → 状态标签；slow 无持久位不出现', () => {
    const gs = makeGs()
    gs.rgPlayerStatus[0]![2] = 5 // persistentIndex 2 = sleep
    const r = collectPartyStatusReadouts(gs, roles())
    expect(r).toHaveLength(2)
    expect(r[0]!.source).toBe('persistent')
    expect(r[0]!.roleId).toBe(0)
    expect(r[0]!.statuses).toContainEqual({ name: '眠', kind: 'debuff', rounds: 5 })
    expect(r[0]!.statuses.some((s) => s.name === '迟')).toBe(false)
    // 未设状态的 slot 1 无 debuff/buff 标签
    expect(r[1]!.statuses).toEqual([])
  })

  it('rgPoisonStatus 毒条：知名毒 → 名#id + L级 + script；未知毒 → #id；毒ID 0 跳过', () => {
    const gs = makeGs()
    gs.rgPoisonStatus['0_0'] = { wPoisonID: POISON_ID, wPoisonScript: 4242 }
    gs.rgPoisonStatus['1_0'] = { wPoisonID: 600, wPoisonScript: 0 }
    gs.rgPoisonStatus['2_0'] = { wPoisonID: 0, wPoisonScript: 0 } // 空槽
    const r = collectPartyStatusReadouts(gs, roles(), objectPoisons, items)
    expect(r[0]!.entries).toContain('毒槽0:毒蛇卵#551 L3 script:4242')
    expect(r[0]!.entries).toContain('毒槽1:#600')
    expect(r[0]!.statuses).toContainEqual({ name: '毒蛇卵', kind: 'poison' })
    expect(r[0]!.statuses).toContainEqual({ name: '毒#600', kind: 'poison' })
    expect(r[0]!.statuses).toHaveLength(2)
  })

  it('battle players[slot].roleId 投影：显示身份按战斗槽而非 party 顺序；缺槽回退 persistent', () => {
    const battle = mkBattleState(
      [{ roleId: 1, prevHp: 88, prevMp: 70, defending: false, status: { ...ZERO_STATUS } }],
      [],
      false,
    )
    const gs = makeGs({ battle })
    const r = collectPartyStatusReadouts(gs, roles())
    expect(r[0]!.source).toBe('battle')
    expect(r[0]!.roleId).toBe(1) // 战斗槽 0 是灵儿 → 显示身份 roleId 1
    expect(r[0]!.roleName).toBe('赵灵儿')
    expect(r[0]!.hp).toBe(88)
    expect(r[1]!.source).toBe('persistent') // players[1] 缺 → 回退 party slot 1
    expect(r[1]!.roleId).toBe(1)
  })

  it('hiddenExp：cur/next/gained 按各自池（next 用池 wLevel 阈值），与主经验 nextExp 区分', () => {
    const gs = makeGs()
    const levelUpExp = Array.from({ length: 12 }, (_, i) => i * 100)
    const r = collectPartyStatusReadouts(gs, roles(), [], [], levelUpExp)[0]!
    expect(r.nextExp).toBe(1000) // levelUpExp[level=10]
    const attack = r.hiddenExp.find((h) => h.label === '武术')!
    expect(attack.cur).toBe(40)
    expect(attack.gained).toBe(12)
    expect(attack.next).toBe(300) // levelUpExp[池 wLevel=3]
  })
})

describe('L07 collectEnemyStatusReadouts 剩余投影', () => {
  it('steal 三分支：金钱/知名物品/缺名物品', () => {
    const money = collectEnemyStatusReadouts(
      makeGs({ battle: oneEnemy({ stealItemCount: 5 }) }),
    )[0]!
    expect(money.canSteal).toBe(true)
    expect(money.steal).toBe('金钱 ×5')
    const named = collectEnemyStatusReadouts(
      makeGs({ battle: oneEnemy({ stealItem: POISON_ID, stealItemCount: 2 }) }),
      objectPoisons,
      items,
    )[0]!
    expect(named.steal).toBe('毒蛇卵 ×2')
    const unknown = collectEnemyStatusReadouts(
      makeGs({ battle: oneEnemy({ stealItem: 999, stealItemCount: 1 }) }),
      [],
      items,
    )[0]!
    expect(unknown.steal).toBe('物品#999 ×1')
  })

  it('maxHp 回退链 maxHealth ?? prevHp ?? health；defeated 与巫抗行', () => {
    const noMax = collectEnemyStatusReadouts(makeGs({ battle: oneEnemy({ health: 42 }) }))[0]!
    expect(noMax.maxHp).toBe(42) // maxHealth 缺 → prevHp 42
    const withPrev = collectEnemyStatusReadouts(
      makeGs({ battle: oneEnemy({ health: 30 }, { prevHp: 50 }) }),
    )[0]!
    expect(withPrev.maxHp).toBe(50) // maxHealth 缺 → prevHp 50
    const dead = collectEnemyStatusReadouts(
      makeGs({ battle: oneEnemy({ health: 0 }, { defeated: true }) }),
    )[0]!
    expect(dead.defeated).toBe(true)
    expect(dead.resistances.find((x) => x.label === '巫抗')?.value).toBe(4)
  })

  it('敌方状态与毒条：be.status/confused → 乱；be.poisons → 毒 entries/tags', () => {
    const battle = oneEnemy(
      {},
      {
        status: { confused: 4 },
        poisons: [{ poisonId: POISON_ID, scriptEntry: 9 }],
      },
    )
    const r = collectEnemyStatusReadouts(makeGs({ battle }), objectPoisons, items)[0]!
    expect(r.statuses).toContainEqual({ name: '乱', kind: 'debuff', rounds: 4 })
    expect(r.statusEntries).toContain('毒:毒蛇卵#551 L3 script:9')
  })
})

describe('L07 collectFieldInfoReadout 剩余投影与深保真', () => {
  it('isBoss/screenWave 原样透出；boss 标志 false 时如实 false', () => {
    const boss = mkBattleState([], [], true)
    const f = collectFieldInfoReadout(makeGs({ battle: boss }))
    expect(f?.isBoss).toBe(true)
    expect(f?.screenWave).toBe(2)
    expect(collectFieldInfoReadout(makeGs({ battle: mkBattleState([], [], false) }))?.isBoss).toBe(
      false,
    )
  })

  it('输入深保真：三收集器调用前后实际消费的 gs 子树/roles/poisons/items 逐字段不变', () => {
    const battle = oneEnemy(
      { stealItem: POISON_ID, stealItemCount: 2 },
      { status: { confused: 2 }, poisons: [{ poisonId: POISON_ID, scriptEntry: 9 }] },
    )
    const gs = makeGs({ battle })
    gs.rgPlayerStatus[0]![2] = 5
    gs.rgPoisonStatus['0_0'] = { wPoisonID: POISON_ID, wPoisonScript: 4242 }
    const snapshot = {
      partyMembers: structuredClone(gs.partyMembers),
      runtime: structuredClone(gs.PlayerRolesRuntime),
      exp: structuredClone(gs.Exp),
      playerStatus: structuredClone(gs.rgPlayerStatus),
      poisonStatus: structuredClone(gs.rgPoisonStatus),
      battlePlayers: structuredClone(gs.battleState?.players),
      battleEnemies: structuredClone(gs.battleState?.enemies),
      battleField: structuredClone(gs.battleState?.field),
      roles: structuredClone(roles()),
      poisons: structuredClone(objectPoisons),
      items: structuredClone(items),
    }
    const gsRoles = roles()
    collectPartyStatusReadouts(gs, gsRoles, objectPoisons, items, [])
    collectEnemyStatusReadouts(gs, objectPoisons, items)
    collectFieldInfoReadout(gs)
    expect(structuredClone(gs.partyMembers)).toEqual(snapshot.partyMembers)
    expect(structuredClone(gs.PlayerRolesRuntime)).toEqual(snapshot.runtime)
    expect(structuredClone(gs.Exp)).toEqual(snapshot.exp)
    expect(structuredClone(gs.rgPlayerStatus)).toEqual(snapshot.playerStatus)
    expect(structuredClone(gs.rgPoisonStatus)).toEqual(snapshot.poisonStatus)
    expect(structuredClone(gs.battleState?.players)).toEqual(snapshot.battlePlayers)
    expect(structuredClone(gs.battleState?.enemies)).toEqual(snapshot.battleEnemies)
    expect(structuredClone(gs.battleState?.field)).toEqual(snapshot.battleField)
    expect(structuredClone(gsRoles)).toEqual(snapshot.roles)
    expect(structuredClone(objectPoisons)).toEqual(snapshot.poisons)
    expect(structuredClone(items)).toEqual(snapshot.items)
  })
})
