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

import type {
  BattleField,
  Command,
  Enemy,
  Magic,
  PlayerRole,
  PlayerRoles,
  Spell,
} from '@type-pal/shared'
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
    flags: {
      usableOutsideBattle: false,
      usableInBattle: true,
      usableToEnemy: true,
      applyToAll: false,
    },
    ...opts,
  }
}

function makeState(
  role: Partial<PlayerRole>,
  enemies: Partial<Enemy>[],
  fieldEffect?: BattleField['magicEffect'],
): {
  state: BattleState
  playerRoles: PlayerRoles
  bus: CommandBus
} {
  const r = makeRole(role)
  const field: BattleField = {
    id: 0,
    screenWave: 0,
    magicEffect: fieldEffect ?? { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
  }
  // 固定 rngFactor = 1.0(next()=0 → 1 + 0*0.1)
  const rng = { ...createSeedableRng(1), next: () => 0 }
  const state: BattleState = {
    players: [
      {
        roleId: 0,
        prevHp: r.hp,
        prevMp: r.mp,
        defending: false,
        status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
      },
    ],
    enemies: enemies.map((e) => {
      const en = makeEnemy(e)
      return {
        e: en,
        status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
        prevHp: en.health,
        scriptOnTurnStart: 0,
        scriptOnBattleEnd: 0,
        scriptOnReady: 0,
      }
    }),
    field,
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
    rng,
    phaseStallTicks: 0,
  }
  return { state, playerRoles: { roles: [r] }, bus: createCommandBus() }
}

const commands: Command[] = [{ op: 'end' }]

describe('performMagic E1: inline 攻击法术伤害(player→enemy)', () => {
  it('单体攻击法术 → enemy 落血(手算 50)+ emit showDamageNum', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      {
        health: 100,
        defense: 30,
        level: 5,
        elemResistance: { wind: 5, thunder: 0, water: 0, fire: 0, earth: 0 },
      },
    ])
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell()],
      magics: [makeMagic({ baseDamage: 45, elemental: 1 })],
      playerRoles,
      bus,
      commands,
      runScript: noopRunScript,
    })
    // def=30+44=74; calcBase(64,74)=20; /4=5; +45=50; elem1 windRes5: *5 /5=50; field0: *10/10=50
    expect(state.enemies[0]!.e.health).toBe(50)
    const cmds = bus.drain()
    // D17b:敌人掉血 → blue,target={kind:'enemy',idx:0},value=钳后 delta=50
    const dmgCmd = cmds.find((c) => c.cmd.op === 'showDamageNum')
    expect(dmgCmd).toBeDefined()
    expect(dmgCmd!.cmd).toMatchObject({
      op: 'showDamageNum',
      color: 'blue',
      target: { kind: 'enemy', idx: 0 },
      value: 50,
    })
  })

  it('召唤魔法(type summon)→ 建召唤动画链(state.battleAnim.summon set,精灵 player-{special+10})+ 敌落血', () => {
    const { state, playerRoles, bus } = makeState({ hp: 500, mp: 30, magicStrength: 60 }, [{ health: 9000, defense: 0, level: 5 }])
    // 补 posOriginal(召唤动画前置:发起者底锚)
    ;(state.players[0] as unknown as { posOriginal: { x: number, y: number } }).posOriginal = { x: 240, y: 170 }
    performMagic({
      state, casterIsEnemy: false, casterIdx: 0, spellId: 7, targetIsEnemy: true, targetIdx: 0,
      spells: [makeSpell({ magicNumber: 19 })],
      // 召唤 magic id19(special2→F.MKF chunk12,effect18 指向二次 magic);二次 magic id18(FIRE.MKF chunk18)
      magics: [
        makeMagic({ id: 19, type: 'summon', special: 2, effect: 18, baseDamage: 80, speed: 5, effectTimes: 3 }),
        makeMagic({ id: 18, type: 'attackAll', effect: 18, baseDamage: 0 }),
      ],
      playerRoles, bus, commands, runScript: noopRunScript,
      magicSpriteFrameCounts: new Map([[18, 6]]), // 二次效果 FIRE.MKF 帧数
      summonSpriteFrameCounts: new Map([[12, 4]]), // 召唤神精灵 chunk 12(special 2 + 10)= 4 帧
    })
    expect(state.battleAnim).toBeDefined()
    const godFrame = state.battleAnim!.frames.find((f) => f.summon !== undefined)
    expect(godFrame).toBeDefined() // 链含召唤神演出帧
    expect(godFrame!.summon!.spriteKey).toBe('player-12') // special 2 + 10
    // 召唤伤害走 inline 路径(magic.baseDamage 80 + 施法者 magicStrength)→ 敌落血
    expect(state.enemies[0]!.e.health).toBeLessThan(9000)
  })

  it('applyToAll 法术 → 全体敌人落血', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      {
        health: 100,
        defense: 30,
        level: 5,
        elemResistance: { wind: 5, thunder: 0, water: 0, fire: 0, earth: 0 },
      },
      {
        health: 100,
        defense: 30,
        level: 5,
        elemResistance: { wind: 5, thunder: 0, water: 0, fire: 0, earth: 0 },
      },
    ])
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      // AoE 判定按 magic.type(sdlpal FIGHT_DetectMagicTargetChange),非 flags.applyToAll
      spells: [makeSpell()],
      magics: [makeMagic({ baseDamage: 45, elemental: 1, type: 'attackAll' })],
      playerRoles,
      bus,
      commands,
      runScript: noopRunScript,
    })
    expect(state.enemies[0]!.e.health).toBe(50)
    expect(state.enemies[1]!.e.health).toBe(50)
    // D17b:E1 群攻每敌各 emit 一条 showDamageNum,target idx 各异(blue)。
    const dmgs = bus
      .drain()
      .filter((c) => c.cmd.op === 'showDamageNum')
      .map((c) => c.cmd)
    expect(dmgs).toHaveLength(2)
    expect(dmgs.map((d) => (d as { target: { idx: number } }).target.idx).sort()).toEqual([0, 1])
    for (const d of dmgs)
      expect(d).toMatchObject({ color: 'blue', target: { kind: 'enemy' }, value: 50 })
  })

  it('血魔神功式(attackWhole + applyToAll=False)+ 单体 targetIdx → 仍打全体(修 bug)', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      {
        health: 100,
        defense: 30,
        level: 5,
        elemResistance: { wind: 5, thunder: 0, water: 0, fire: 0, earth: 0 },
      },
      {
        health: 100,
        defense: 30,
        level: 5,
        elemResistance: { wind: 5, thunder: 0, water: 0, fire: 0, earth: 0 },
      },
    ])
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0, // 给单体目标,但 type=attackWhole → 应全体
      spells: [
        makeSpell({
          flags: {
            usableOutsideBattle: false,
            usableInBattle: true,
            usableToEnemy: true,
            applyToAll: false,
          },
        }),
      ],
      magics: [makeMagic({ baseDamage: 45, elemental: 1, type: 'attackWhole' })],
      playerRoles,
      bus,
      commands,
      runScript: noopRunScript,
    })
    expect(state.enemies[0]!.e.health).toBe(50)
    expect(state.enemies[1]!.e.health).toBe(50) // 第二个也被打(type-based AoE)
  })

  it('防御类法术(applyToPlayer)→ 不对敌人结算伤害', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5 },
    ])
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: false,
      targetIdx: 0,
      spells: [makeSpell()],
      magics: [makeMagic({ type: 'applyToPlayer', baseDamage: 45 })],
      playerRoles,
      bus,
      commands,
      runScript: noopRunScript,
    })
    expect(state.enemies[0]!.e.health).toBe(100)
  })

  it('负 baseDamage 法术((SHORT)≤0)→ inline guard 不触发,不结算', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5 },
    ])
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell()],
      magics: [makeMagic({ baseDamage: 64537, elemental: 0 })], // SHORT −999
      playerRoles,
      bus,
      commands,
      runScript: noopRunScript,
    })
    expect(state.enemies[0]!.e.health).toBe(100)
  })

  it('乾坤一掷:scriptOnUse 0x88 set baseDamage by cash → E1 全体伤害(全链)', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 0 }, [
      { health: 500, defense: 30, level: 5 },
      { health: 500, defense: 30, level: 5 },
    ])
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.dwCash = 1000
    // ip1 = 0x88[394,0,0]
    const cmds: Command[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x88, operands: [394, 0, 0] },
      { op: 'end' },
    ]
    const spell = makeSpell({
      id: 394,
      magicNumber: 100,
      scriptOnUse: 1,
      flags: {
        usableOutsideBattle: false,
        usableInBattle: true,
        usableToEnemy: true,
        applyToAll: true,
      },
    })
    const magic = makeMagic({ id: 100, baseDamage: 0, elemental: 0, type: 'attackAll', costMP: 0 })
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 394,
      targetIsEnemy: true,
      targetIdx: 'all',
      spells: [spell],
      magics: [magic],
      playerRoles,
      bus,
      commands: cmds,
      runScript,
      objectMagics: [
        {
          id: 394,
          magicNumber: 100,
          scriptOnSuccess: 0,
          scriptOnUse: 0,
          flags: {
            usableOutsideBattle: false,
            usableInBattle: true,
            usableToEnemy: true,
            applyToAll: true,
          },
        },
      ],
      gs,
    })
    // 0x88:cash 1000 → baseDamage floor(1000*2/5)=400,cash 0;
    // E1:magStr0 → calcBase(0,74)=0 /4=0 +400=400(applyToAll → 全体)
    expect(state.enemies[0]!.e.health).toBe(100) // 500-400
    expect(state.enemies[1]!.e.health).toBe(100)
    expect(gs.dwCash).toBe(0)
  })

  it('敌人施法 → 不走 inline path(player-only),enemy 不被自己打', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5 },
    ])
    performMagic({
      state,
      casterIsEnemy: true,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: false,
      targetIdx: 0,
      spells: [makeSpell()],
      magics: [makeMagic({ baseDamage: 45, elemental: 1 })],
      playerRoles,
      bus,
      commands,
      runScript: noopRunScript,
    })
    expect(state.enemies[0]!.e.health).toBe(100)
  })
})

// ============================================================================
// D17:player 攻击魔法动画链(PreMagic + OffMagic + PostMagic → state.battleAnim)
// ============================================================================
describe('performMagic D17: 攻击魔法 build 时间线', () => {
  /** 给 player/enemy 补上 fighter render-state(posOriginal),否则不建链。 */
  function withFighterPos(
    state: BattleState,
    playerPos: { x: number; y: number },
    enemyPositions: Array<{ x: number; y: number }>,
  ): void {
    for (const p of state.players) {
      p.pos = { ...playerPos }
      p.posOriginal = { ...playerPos }
      p.currentFrame = 0
    }
    state.enemies.forEach((e, i) => {
      const pos = enemyPositions[i] ?? { x: 100, y: 80 }
      e.pos = { ...pos }
      e.posOriginal = { ...pos }
    })
  }

  const frameCounts = new Map<number, number>([[12, 8]]) // FIRE.MKF chunk 12 → 8 frames

  it('单体攻击法术(normal)→ state.battleAnim 有 frames(pre+off+post),非空', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5 },
    ])
    withFighterPos(state, { x: 240, y: 170 }, [{ x: 160, y: 80 }])
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell()],
      magics: [
        makeMagic({
          effect: 12,
          type: 'normal',
          baseDamage: 45,
          fireDelay: 2,
          effectTimes: 1,
          shake: 0,
          speed: 2,
        }),
      ],
      playerRoles,
      bus,
      commands,
      runScript: noopRunScript,
      magicSpriteFrameCounts: frameCounts,
      battleEffectIndex: [0, 0], // sprite0 → cast base list[0]=0 → frameBase=15
    })
    expect(state.battleAnim).toBeDefined()
    const f = state.battleAnim!.frames
    // PreMagic = 17(4+1+1+10+1);OffMagic l=(8-2)*1+8=14;PostMagic=4(受伤敌抖3+复位)= 35
    expect(f.length).toBe(17 + 14 + 4)
    // OffMagic 段(从 idx 17 起)有 magic overlays
    const offFrame = f[17]!
    expect(offFrame.overlays?.[0]).toMatchObject({ kind: 'magic', spriteChunk: 12 })
  })

  it('sentinel baseDamage(−999)攻击法术仍建链:FIRE 动画对**所有**攻击魔法都放,不 gate baseDamage', () => {
    // sdlpal PAL_BattleShowPlayerOffMagicAnim 对一切攻击魔法都放 FIRE 特效;baseDamage 只决定
    //   **内联**伤害(sentinel −999 的特殊法术伤害靠 scriptOnSuccess opcode)。修:动画曾误 gate 在
    //   baseDamage>0 块内 → sentinel 法术(御剑/special)不动画。现移出 gate。
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5 },
    ])
    withFighterPos(state, { x: 240, y: 170 }, [{ x: 160, y: 80 }])
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell()],
      // 64537 = (SHORT)−999 sentinel:asShort(baseDamage) <= 0 → E1 内联伤害跳过
      magics: [makeMagic({ effect: 12, type: 'normal', baseDamage: 64537, fireDelay: 2, effectTimes: 1, shake: 0, speed: 2 })],
      playerRoles,
      bus,
      commands,
      runScript: noopRunScript,
      magicSpriteFrameCounts: frameCounts,
      battleEffectIndex: [0, 0],
    })
    // PreMagic + OffMagic FIRE 动画仍建链(尽管无内联伤害)
    expect(state.battleAnim, 'sentinel 攻击魔法 FIRE 动画应建链').toBeDefined()
    expect(state.battleAnim!.frames[17]?.overlays?.[0]).toMatchObject({ kind: 'magic', spriteChunk: 12 })
    // 敌人 HP 未变(sentinel 不走 E1 内联伤害,伤害靠 scriptOnSuccess opcode)
    expect(state.enemies[0]!.e.health).toBe(100)
  })

  it('单体 normal:OffMagic 落点 = enemy.posOriginal + (xOff,yOff)', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5 },
    ])
    withFighterPos(state, { x: 240, y: 170 }, [{ x: 160, y: 80 }])
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell()],
      magics: [
        makeMagic({
          effect: 12,
          type: 'normal',
          baseDamage: 45,
          fireDelay: 2,
          effectTimes: 1,
          xOffset: 4,
          yOffset: -6,
        }),
      ],
      playerRoles,
      bus,
      commands,
      runScript: noopRunScript,
      magicSpriteFrameCounts: frameCounts,
    })
    const off = state.battleAnim!.frames[17]!
    expect(off.overlays![0]).toMatchObject({ x: 164, y: 74 })
  })

  it('全体攻击法术(attackAll)→ OffMagic overlays 三落点', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5 },
      { health: 100, defense: 30, level: 5 },
    ])
    withFighterPos(state, { x: 240, y: 170 }, [
      { x: 160, y: 80 },
      { x: 100, y: 60 },
    ])
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 'all',
      spells: [
        makeSpell({
          flags: {
            usableOutsideBattle: false,
            usableInBattle: true,
            usableToEnemy: true,
            applyToAll: true,
          },
        }),
      ],
      magics: [
        makeMagic({ effect: 12, type: 'attackAll', baseDamage: 45, fireDelay: 2, effectTimes: 1 }),
      ],
      playerRoles,
      bus,
      commands,
      runScript: noopRunScript,
      magicSpriteFrameCounts: frameCounts,
    })
    const off = state.battleAnim!.frames[17]!
    expect(off.overlays).toHaveLength(3)
  })

  it('防御类法术(applyToPlayer)→ 不走 OFF_MAGIC 攻击链(D17 补全后改走 DefMagic)', () => {
    // 旧断言:applyToPlayer 不建任何时间线(DefMagic 尚未实现)。D17 法术补全后,applyToPlayer
    // 改走 DefMagic 链(目标队员处 FIRE 特效 + 辉光),帧形态 ≠ OFF_MAGIC 攻击链(无 PreMagic 上移段)。
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5 },
    ])
    withFighterPos(state, { x: 240, y: 170 }, [{ x: 160, y: 80 }])
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: false,
      targetIdx: 0,
      spells: [makeSpell()],
      magics: [makeMagic({ effect: 12, type: 'applyToPlayer', baseDamage: 45 })],
      playerRoles,
      bus,
      commands,
      runScript: noopRunScript,
      magicSpriteFrameCounts: frameCounts,
    })
    // DefMagic:caster帧6 + n(8)magic + 14 辉光 = 23(非 OffMagic 链 17+14+4=35)。
    expect(state.battleAnim).toBeDefined()
    expect(state.battleAnim!.frames.length).toBe(1 + 8 + 14)
    // 不打敌人(防御类:E1 inline 伤害不触发)
    expect(state.enemies[0]!.e.health).toBe(100)
  })

  it('缺 magicSpriteFrameCounts(无该 chunk)→ 不建时间线(向后兼容)', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5 },
    ])
    withFighterPos(state, { x: 240, y: 170 }, [{ x: 160, y: 80 }])
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell()],
      magics: [makeMagic({ effect: 99, type: 'normal', baseDamage: 45 })], // chunk 99 不在 frameCounts
      playerRoles,
      bus,
      commands,
      runScript: noopRunScript,
      magicSpriteFrameCounts: frameCounts,
    })
    expect(state.battleAnim).toBeUndefined()
    // 伤害仍即时结算(E1 不依赖时间线)
    expect(state.enemies[0]!.e.health).toBeLessThan(100)
  })

  it('缺 fighter posOriginal(旧 fixture)→ 不建时间线', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5 },
    ])
    // 不调 withFighterPos:players[0].posOriginal undefined
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell()],
      magics: [makeMagic({ effect: 12, type: 'normal', baseDamage: 45 })],
      playerRoles,
      bus,
      commands,
      runScript: noopRunScript,
      magicSpriteFrameCounts: frameCounts,
    })
    expect(state.battleAnim).toBeUndefined()
  })

  it('PostMagic 段:受伤敌(掉血)抖动帧;i==1 帧 iColorShift=6', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5 },
    ])
    withFighterPos(state, { x: 240, y: 170 }, [{ x: 160, y: 80 }])
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell()],
      magics: [
        makeMagic({
          effect: 12,
          type: 'normal',
          baseDamage: 45,
          fireDelay: 2,
          effectTimes: 1,
          shake: 0,
        }),
      ],
      playerRoles,
      bus,
      commands,
      runScript: noopRunScript,
      magicSpriteFrameCounts: frameCounts,
    })
    const frames = state.battleAnim!.frames
    // PostMagic 段 = 末 4 帧;i==1 抖动帧(总倒数第 3 帧)iColorShift=6
    const post = frames.slice(frames.length - 4)
    const colorShiftFrame = post[1]!
    expect(colorShiftFrame.fighters?.[0]).toMatchObject({ side: 'enemy', idx: 0, iColorShift: 6 })
  })
})

// ============================================================================
// D17 法术补全:player 防御/治疗魔法 DefMagic(state.battleAnim,fight.c:2447-2606)
// ============================================================================
describe('performMagic D17: player 防御/治疗魔法 DefMagic 时间线', () => {
  /** 给 player/enemy 补 fighter render-state(posOriginal)。 */
  function withFighterPos(
    state: BattleState,
    playerPositions: Array<{ x: number; y: number }>,
    enemyPositions: Array<{ x: number; y: number }>,
  ): void {
    state.players.forEach((p, i) => {
      const pos = playerPositions[i] ?? { x: 240, y: 170 }
      p.pos = { ...pos }
      p.posOriginal = { ...pos }
      p.currentFrame = 0
    })
    state.enemies.forEach((e, i) => {
      const pos = enemyPositions[i] ?? { x: 100, y: 80 }
      e.pos = { ...pos }
      e.posOriginal = { ...pos }
    })
  }

  /** 多队员 state(makeState 只造 1 player,这里手动扩)。 */
  function makeStateMulti(
    role: Partial<PlayerRole>,
    roleCount: number,
  ): { state: BattleState; playerRoles: PlayerRoles; bus: CommandBus } {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64, ...role }, [
      { health: 100, defense: 30, level: 5 },
    ])
    // 复制 player slot 到 roleCount 个(共享 role 0)。
    for (let i = 1; i < roleCount; i++) {
      state.players.push({
        roleId: 0,
        prevHp: 200,
        prevMp: 30,
        defending: false,
        status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 },
      })
    }
    return { state, playerRoles, bus }
  }

  const frameCounts = new Map<number, number>([[15, 5]]) // FIRE.MKF chunk 15 → 5 frames

  it('applyToPlayer → state.battleAnim 有 frames(caster帧6 + 5 magic + 14 辉光 = 20)', () => {
    const { state, playerRoles, bus } = makeStateMulti({}, 2)
    withFighterPos(
      state,
      [
        { x: 240, y: 170 },
        { x: 180, y: 150 },
      ],
      [{ x: 160, y: 80 }],
    )
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: false,
      targetIdx: 1, // 治疗队友 idx1
      spells: [makeSpell()],
      magics: [
        makeMagic({ effect: 15, type: 'applyToPlayer', speed: 2, xOffset: 4, yOffset: -6 }),
      ],
      playerRoles,
      bus,
      commands,
      runScript: noopRunScript,
      magicSpriteFrameCounts: frameCounts,
    })
    expect(state.battleAnim).toBeDefined()
    const f = state.battleAnim!.frames
    expect(f.length).toBe(1 + 5 + 14) // 20
    // frame0 = caster 帧6
    expect(f[0]!.fighters).toEqual([{ side: 'player', idx: 0, currentFrame: 6 }])
    // magic 帧(frame1)落点 = target 队员 posOriginal + (xOff,yOff) = (184,144)
    expect(f[1]!.overlays?.[0]).toMatchObject({ kind: 'magic', spriteChunk: 15, x: 184, y: 144 })
    // 辉光帧设 target 队员 idx1
    const glowPeak = f[1 + 5 + 6]! // 辉光 i=6 峰值
    expect(glowPeak.fighters).toEqual([{ side: 'player', idx: 1, iColorShift: 6 }])
  })

  it('applyToParty → 全队员落点 + 全队员辉光', () => {
    const { state, playerRoles, bus } = makeStateMulti({}, 3)
    withFighterPos(
      state,
      [
        { x: 240, y: 170 },
        { x: 200, y: 150 },
        { x: 160, y: 130 },
      ],
      [{ x: 160, y: 80 }],
    )
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: false,
      targetIdx: 'all',
      spells: [makeSpell()],
      magics: [makeMagic({ effect: 15, type: 'applyToParty', speed: 0, xOffset: 0, yOffset: 0 })],
      playerRoles,
      bus,
      commands,
      runScript: noopRunScript,
      magicSpriteFrameCounts: frameCounts,
    })
    const f = state.battleAnim!.frames
    // magic 帧落点 = 3 队员
    expect(f[1]!.overlays).toHaveLength(3)
    // 辉光首帧设 3 队员
    const glow0 = f[1 + 5]!
    expect(glow0.fighters).toHaveLength(3)
  })

  it('applyToPlayer 缺 target 队员 posOriginal → 不建链(向后兼容)', () => {
    const { state, playerRoles, bus } = makeStateMulti({}, 2)
    // 只给 caster posOriginal,target(idx1)缺
    state.players[0]!.pos = { x: 240, y: 170 }
    state.players[0]!.posOriginal = { x: 240, y: 170 }
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: false,
      targetIdx: 1,
      spells: [makeSpell()],
      magics: [makeMagic({ effect: 15, type: 'applyToPlayer' })],
      playerRoles,
      bus,
      commands,
      runScript: noopRunScript,
      magicSpriteFrameCounts: frameCounts,
    })
    expect(state.battleAnim).toBeUndefined()
  })

  it('applyToPlayer 缺 magicSpriteFrameCounts(无该 chunk)→ 不建链', () => {
    const { state, playerRoles, bus } = makeStateMulti({}, 2)
    withFighterPos(
      state,
      [
        { x: 240, y: 170 },
        { x: 180, y: 150 },
      ],
      [{ x: 160, y: 80 }],
    )
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: false,
      targetIdx: 1,
      spells: [makeSpell()],
      magics: [makeMagic({ effect: 99, type: 'applyToPlayer' })], // chunk 99 不在表
      playerRoles,
      bus,
      commands,
      runScript: noopRunScript,
      magicSpriteFrameCounts: frameCounts,
    })
    expect(state.battleAnim).toBeUndefined()
  })
})

// ============================================================================
// D17 法术补全:敌方攻击魔法 EnemyMagic(state.battleAnim,fight.c:2846-3069)
// ============================================================================
describe('performMagic D17: 敌方攻击魔法 EnemyMagic 时间线', () => {
  function withFighterPos(
    state: BattleState,
    playerPos: { x: number; y: number },
    enemyPos: { x: number; y: number },
  ): void {
    for (const p of state.players) {
      p.pos = { ...playerPos }
      p.posOriginal = { ...playerPos }
      p.currentFrame = 0
    }
    for (const e of state.enemies) {
      e.pos = { ...enemyPos }
      e.posOriginal = { ...enemyPos }
    }
  }

  const frameCounts = new Map<number, number>([[12, 8]]) // FIRE.MKF chunk 12 → 8 frames

  it('enemy normal 攻击魔法 → state.battleAnim 有 EnemyMagic frames(l=(8-2)*1+8=14)', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5, idleFrames: 4, magicFrames: 2, attackFrames: 3 },
    ])
    withFighterPos(state, { x: 240, y: 170 }, { x: 160, y: 80 })
    performMagic({
      state,
      casterIsEnemy: true,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: false,
      targetIdx: 0, // 打队员 idx0
      spells: [makeSpell()],
      magics: [
        makeMagic({
          effect: 12,
          type: 'normal',
          baseDamage: 45,
          fireDelay: 2,
          effectTimes: 1,
          shake: 0,
          speed: 2,
          xOffset: 4,
          yOffset: -6,
        }),
      ],
      playerRoles,
      bus,
      commands,
      runScript: noopRunScript,
      magicSpriteFrameCounts: frameCounts,
    })
    expect(state.battleAnim).toBeDefined()
    const f = state.battleAnim!.frames
    // 帧链 = 施法起手(前移+手势,buildEnemyMagicCastIntro)+ posReset + 落点特效(14)+ 队员受击(5)。
    //   特效段从第一个带 overlays 的帧起(起手段无 overlays)。
    const effStart = f.findIndex((fr) => (fr.overlays?.length ?? 0) > 0)
    const eff = f.slice(effStart)
    // 落点特效 14 帧(都带 overlays)+ 受击 5 帧(fight.c:4861-4899,无 overlays)
    expect(eff.filter((fr) => (fr.overlays?.length ?? 0) > 0).length).toBe((8 - 2) * 1 + 8) // l=14
    expect(eff.length).toBe(14 + 5)
    // 落点 = player.posOriginal + (xOff,yOff) = (244,164)
    expect(eff[0]!.overlays?.[0]).toMatchObject({ kind: 'magic', spriteChunk: 12, x: 244, y: 164 })
    // 特效内敌施法帧 i=2(fireDelay)→ currentFrame = 2-2+4+2 = 6
    expect(eff[2]!.fighters).toEqual([{ side: 'enemy', idx: 0, currentFrame: 6 }])
    // 起手段(磁frames=2)应有前移 + 施法手势,证明施法本体动画接上(修「敌人施法定格」)
    expect(f[0]!.fighters?.[0]).toMatchObject({ side: 'enemy', idx: 0, pos: { x: 172, y: 86 } }) // 前移 +12/+6
    // 受击动画(末 5 帧):受伤队员 idx0 frame4 + 红闪;i=0 不位移(pos=posOriginal 240,170)
    const hurt = f.slice(f.length - 5)
    expect(hurt[0]!.fighters).toEqual([
      { side: 'player', idx: 0, currentFrame: 4, iColorShift: 6, pos: { x: 240, y: 170 } },
    ])
    expect(hurt[4]!.fighters?.[0]).toMatchObject({ side: 'player', idx: 0, currentFrame: 4, iColorShift: 0 })
    // 敌人 HP 不被改(敌方伤害靠 AI/script,本切片只动画)
    expect(state.enemies[0]!.e.health).toBe(100)
  })

  it('enemy attackAll → overlays 三落点(敌方坐标)', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5, idleFrames: 4 },
    ])
    withFighterPos(state, { x: 240, y: 170 }, { x: 160, y: 80 })
    performMagic({
      state,
      casterIsEnemy: true,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: false,
      targetIdx: 'all',
      spells: [makeSpell()],
      magics: [
        makeMagic({ effect: 12, type: 'attackAll', fireDelay: 0, effectTimes: 1, shake: 0 }),
      ],
      playerRoles,
      bus,
      commands,
      runScript: noopRunScript,
      magicSpriteFrameCounts: frameCounts,
    })
    const f = state.battleAnim!.frames
    // 特效段从第一个带 overlays 的帧起(前置施法起手段无 overlays)
    const eff0 = f.find((fr) => (fr.overlays?.length ?? 0) > 0)!
    expect(eff0.overlays).toHaveLength(3)
    // 敌方 attackAll 第一落点 {180,180}(异于 OffMagic 的 {70,140})
    expect(eff0.overlays?.[0]).toMatchObject({ x: 180, y: 180 })
  })

  it('player 攻击魔法仍走 OffMagic(回归:enemy 分支不污染 player)', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5 },
    ])
    withFighterPos(state, { x: 240, y: 170 }, { x: 160, y: 80 })
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell()],
      magics: [
        makeMagic({ effect: 12, type: 'normal', baseDamage: 45, fireDelay: 2, effectTimes: 1 }),
      ],
      playerRoles,
      bus,
      commands,
      runScript: noopRunScript,
      magicSpriteFrameCounts: frameCounts,
      battleEffectIndex: [0, 0],
    })
    // OffMagic 链 = PreMagic(17) + OffMagic(14) + PostMagic(4) = 35;EnemyMagic 只 14。
    expect(state.battleAnim!.frames.length).toBe(17 + 14 + 4)
  })

  it('enemy 缺 target 队员 posOriginal(旧 fixture)→ 不建链', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5, idleFrames: 4 },
    ])
    // 只给 enemy posOriginal,player 缺
    state.enemies[0]!.pos = { x: 160, y: 80 }
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    performMagic({
      state,
      casterIsEnemy: true,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: false,
      targetIdx: 0,
      spells: [makeSpell()],
      magics: [makeMagic({ effect: 12, type: 'normal', fireDelay: 2 })],
      playerRoles,
      bus,
      commands,
      runScript: noopRunScript,
      magicSpriteFrameCounts: frameCounts,
    })
    expect(state.battleAnim).toBeUndefined()
  })
})

// ============================================================================
// performMagic scriptOnSuccess —— 治疗/复活/特殊效果真值所在(fight.c:4214-4265)。
// 旧实现只跑 scriptOnUse → 战斗内治疗值/复活/sentinel 攻击魔法特殊伤害全部不生效。
// ============================================================================

describe('performMagic scriptOnSuccess(fight.c:4214-4265)', () => {
  it('scriptOnUse 后跑 scriptOnSuccess,带 target ctx(顺序 use→success)', () => {
    const { state, playerRoles, bus } = makeState({ hp: 50, maxHP: 200 }, [{ health: 100 }])
    const calls: Array<{ ip: number, tType?: string, tIdx?: number }> = []
    const recordRun: RunScriptFn = (opts) => {
      calls.push({ ip: opts.ip, tType: opts.battleCtx?.target?.type, tIdx: opts.battleCtx?.target?.idx })
    }
    performMagic({
      state, casterIsEnemy: false, casterIdx: 0, spellId: 7,
      targetIsEnemy: false, targetIdx: 0,
      spells: [makeSpell({ scriptOnUse: 10, scriptOnSuccess: 20 })],
      magics: [makeMagic({ type: 'applyToPlayer', baseDamage: 0 })],
      playerRoles, bus, commands, runScript: recordRun,
    })
    expect(calls.map(c => c.ip)).toEqual([10, 20]) // use 先,success 后
    expect(calls[1]).toMatchObject({ ip: 20, tType: 'player', tIdx: 0 }) // success 带 target
  })

  it('scriptOnUse=0 仍跑 scriptOnSuccess(气疗术真值:use=0 / success=heal)', () => {
    const { state, playerRoles, bus } = makeState({ hp: 50 }, [])
    const calls: number[] = []
    const recordRun: RunScriptFn = (opts) => { calls.push(opts.ip) }
    performMagic({
      state, casterIsEnemy: false, casterIdx: 0, spellId: 7,
      targetIsEnemy: false, targetIdx: 0,
      spells: [makeSpell({ scriptOnUse: 0, scriptOnSuccess: 20 })],
      magics: [makeMagic({ type: 'applyToPlayer', baseDamage: 0 })],
      playerRoles, bus, commands, runScript: recordRun,
    })
    expect(calls).toEqual([20]) // 仅 success(use=0 skip)
  })

  it('集成:治疗法术 scriptOnSuccess=0x1B → 目标队友 HP 真涨(50→130)', () => {
    const { state, playerRoles, bus } = makeState({ hp: 50, maxHP: 200, mp: 100 }, [])
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    // scriptOnSuccess ip=1 → 0x1B heal op1=80;ip=2 end(ip=0 占位 end,避免 scriptId=0 被当 skip)
    const healCommands: Command[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x1B, operands: [0, 80, 0] },
      { op: 'end' },
    ]
    performMagic({
      state, casterIsEnemy: false, casterIdx: 0, spellId: 7,
      targetIsEnemy: false, targetIdx: 0,
      spells: [makeSpell({ scriptOnUse: 0, scriptOnSuccess: 1 })],
      magics: [makeMagic({ type: 'applyToPlayer', baseDamage: 0, costMP: 5 })],
      playerRoles, bus, commands: healCommands, runScript, gs,
    })
    expect(playerRoles.roles[0]!.hp).toBe(130) // 50 + 80
  })

  it('scriptOnUse 置 g_fScriptSuccess=false → 不跑 scriptOnSuccess(fight.c:4217 gate)', () => {
    const { state, playerRoles, bus } = makeState({ hp: 50 }, [])
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const calls: number[] = []
    const failingRun: RunScriptFn = (opts) => {
      calls.push(opts.ip)
      if (opts.ip === 10)
        gs.fScriptSuccess = false // scriptOnUse 失败(等价 sdlpal g_fScriptSuccess=FALSE)
    }
    performMagic({
      state, casterIsEnemy: false, casterIdx: 0, spellId: 7,
      targetIsEnemy: false, targetIdx: 0,
      spells: [makeSpell({ scriptOnUse: 10, scriptOnSuccess: 20 })],
      magics: [makeMagic({ type: 'applyToPlayer', baseDamage: 0 })],
      playerRoles, bus, commands, runScript: failingRun, gs,
    })
    expect(calls).toEqual([10]) // scriptOnUse 跑了,scriptOnSuccess 被 fScriptSuccess gate 挡
  })
})

describe('D17:法术伤害数字延迟到特效播完(sdlpal DisplayStatChange after anim,fight.c:4322)', () => {
  it('建了动画链 → performMagic 不立即 emit showDamageNum,而存 battleAnim.pendingDamageNums', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5, elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } },
    ])
    // 建动画链前置:caster + target posOriginal + magicSpriteFrameCounts 有该 effect
    state.players[0]!.posOriginal = { x: 240, y: 170 }
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell()],
      magics: [makeMagic({ baseDamage: 45, elemental: 0, effect: 1, type: 'normal' })],
      playerRoles,
      bus,
      commands,
      runScript: noopRunScript,
      magicSpriteFrameCounts: new Map([[1, 5]]),
    })
    // 伤害已结算(HP 落),但数字**未立即 emit**
    expect(state.enemies[0]!.e.health).toBeLessThan(100)
    const cmds = bus.drain()
    expect(cmds.find((c) => c.cmd.op === 'showDamageNum')).toBeUndefined()
    // 数字存到时间线播完后 emit
    expect(state.battleAnim).toBeDefined()
    expect(state.battleAnim!.pendingDamageNums).toEqual([
      { target: { kind: 'enemy', idx: 0 }, value: expect.any(Number), color: 'blue' },
    ])
  })

  it('未建动画链(无 magicSpriteFrameCounts)→ 立即 emit(向后兼容 fallback)', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5, elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 } },
    ])
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell()],
      magics: [makeMagic({ baseDamage: 45, elemental: 0, effect: 1, type: 'normal' })],
      playerRoles,
      bus,
      commands,
      runScript: noopRunScript,
    })
    const cmds = bus.drain()
    expect(cmds.find((c) => c.cmd.op === 'showDamageNum')).toBeDefined() // fallback 立即 emit
    expect(state.battleAnim).toBeUndefined()
  })
})
