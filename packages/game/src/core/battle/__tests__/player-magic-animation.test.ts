/** Player offensive, summon, and defensive animation wiring. */
import type { Command, PlayerRole } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { runScript } from '../../event-system.js'
import { performMagic } from '../actions/magic.js'
import type { BattleState } from '../battle-state.js'
import {
  makeMagic,
  makePartyMagicState,
  makeSpell,
  makeState,
} from './magic-action.test-fixtures.js'

const commands: Command[] = [{ op: 'end' }]

function placeFighters(
  state: BattleState,
  playerPositions: Array<{ x: number; y: number }>,
  enemyPositions: Array<{ x: number; y: number }>,
): void {
  expect(playerPositions).toHaveLength(state.players.length)
  expect(enemyPositions).toHaveLength(state.enemies.length)
  for (const [idx, player] of state.players.entries()) {
    player.pos = { ...playerPositions[idx]! }
    player.posOriginal = { ...playerPositions[idx]! }
    player.currentFrame = 0
  }
  for (const [idx, enemy] of state.enemies.entries()) {
    enemy.pos = { ...enemyPositions[idx]! }
    enemy.posOriginal = { ...enemyPositions[idx]! }
  }
}

describe('player summon animation', () => {
  it('召唤魔法(type summon)→ 建召唤动画链(state.battleAnim.summon set,精灵 player-{special+10})+ 敌落血', () => {
    const { state, playerRoles, bus } = makeState(
      { hp: 500, maxHP: 500, mp: 30, magicStrength: 60 },
      [{ health: 9000, defense: 0, level: 5 }],
    )
    // 补 posOriginal(召唤动画前置:发起者底锚)
    state.players[0]!.posOriginal = {
      x: 240,
      y: 170,
    }
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell({ magicNumber: 19 })],
      // 召唤 magic id19(special2→F.MKF chunk12,effect18 指向二次 magic);二次 magic id18(FIRE.MKF chunk18)
      magics: [
        makeMagic({
          id: 19,
          type: 'summon',
          special: 2,
          effect: 18,
          baseDamage: 80,
          speed: 5,
          effectTimes: 3,
        }),
        makeMagic({ id: 18, type: 'attackAll', effect: 18, baseDamage: 0 }),
      ],
      playerRoles,
      bus,
      commands,
      runScript,
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

  it('secondary effect retains the base-wave keepEffect gate', () => {
    const { state, playerRoles, bus } = makeState(
      { hp: 500, maxHP: 500, mp: 30, magicStrength: 60 },
      [{ health: 9000, defense: 0, level: 5 }],
    )
    state.field.screenWave = 128
    state.players[0]!.posOriginal = {
      x: 240,
      y: 170,
    }
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell({ magicNumber: 19 })],
      magics: [
        makeMagic({
          id: 19,
          type: 'summon',
          special: 2,
          effect: 18,
          baseDamage: 80,
          speed: 5,
          effectTimes: 3,
        }),
        makeMagic({
          id: 18,
          type: 'attackAll',
          effect: 18,
          baseDamage: 0,
          keepEffect: 0xffff,
          wave: 0,
        }),
      ],
      playerRoles,
      bus,
      commands,
      runScript,
      magicSpriteFrameCounts: new Map([[18, 6]]),
      summonSpriteFrameCounts: new Map([[12, 4]]),
    })
    expect(state.battleAnim!.frames.some((f) => f.keepEffect)).toBe(false)

    const {
      state: landState,
      playerRoles: landRoles,
      bus: landBus,
    } = makeState({ hp: 500, maxHP: 500, mp: 30, magicStrength: 60 }, [
      { health: 9000, defense: 0, level: 5 },
    ])
    landState.players[0]!.posOriginal = {
      x: 240,
      y: 170,
    }
    performMagic({
      state: landState,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell({ magicNumber: 19 })],
      magics: [
        makeMagic({
          id: 19,
          type: 'summon',
          special: 2,
          effect: 18,
          baseDamage: 80,
          speed: 5,
          effectTimes: 3,
        }),
        makeMagic({
          id: 18,
          type: 'attackAll',
          effect: 18,
          baseDamage: 0,
          keepEffect: 0xffff,
          wave: 0,
        }),
      ],
      playerRoles: landRoles,
      bus: landBus,
      commands,
      runScript,
      magicSpriteFrameCounts: new Map([[18, 6]]),
      summonSpriteFrameCounts: new Map([[12, 4]]),
    })
    expect(landState.battleAnim!.frames.some((f) => f.keepEffect)).toBe(true)
  })

  it('召唤 magic.sound:挂 PreMagic 后首个变亮帧,不 dispatch 即时 push(WIN95 fight.c:3112)', () => {
    const { state, playerRoles, bus, gs } = makeState(
      { hp: 500, maxHP: 500, mp: 45, maxMP: 45, magicStrength: 60 },
      [{ health: 9000, defense: 0, level: 5 }],
    )
    state.players[0]!.posOriginal = {
      x: 240,
      y: 170,
    }
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell({ magicNumber: 19 })],
      magics: [
        makeMagic({
          id: 19,
          type: 'summon',
          special: 2,
          effect: 18,
          baseDamage: 80,
          speed: 5,
          effectTimes: 3,
          sound: 304,
        }),
        makeMagic({ id: 18, type: 'attackAll', effect: 18, baseDamage: 0 }),
      ],
      playerRoles,
      bus,
      commands,
      runScript,
      gs,
      magicSpriteFrameCounts: new Map([[18, 6]]),
      summonSpriteFrameCounts: new Map([[12, 4]]),
    })
    const frames = state.battleAnim!.frames
    const soundFrameIdx = frames.findIndex((f) => f.sound === 304)
    expect(soundFrameIdx, '召唤音挂在 PreMagic 之后某帧(非 frame0)').toBeGreaterThan(0)
    // 该帧是变亮帧(全员 iColorShift set)→ 确认在 PreMagic 之后
    expect(
      frames[soundFrameIdx]!.fighters?.some(
        (d) => d.side === 'player' && d.iColorShift !== undefined,
      ),
    ).toBe(true)
    // 不再 dispatch 即时 push gs.pendingSounds
    expect(gs.pendingSounds ?? []).not.toContain(304)
  })
})

describe('player attack animation', () => {
  const frameCounts = new Map<number, number>([[12, 8]])

  it('单体攻击法术(normal)→ state.battleAnim 有 frames(pre+off+post),非空', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5 },
    ])
    placeFighters(state, [{ x: 240, y: 170 }], [{ x: 160, y: 80 }])
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
      runScript,
      magicSpriteFrameCounts: frameCounts,
      battleEffectIndex: [0, 0], // sprite0 → cast base list[0]=0 → frameBase=15
    })
    expect(state.battleAnim).toBeDefined()
    const f = state.battleAnim!.frames
    // Cast intro 17 + leading delay/effect 15 + hurt/reset 4 + final delay 1.
    expect(f.length).toBe(17 + 15 + 4 + 1)
    // OffMagic 段从 idx 17 起,首帧是 L14 前置 Delay(1)(无 overlay),特效 overlay 从 idx 18
    const offFrame = f[18]!
    expect(offFrame.overlays?.[0]).toMatchObject({ kind: 'magic', spriteChunk: 12 })
  })

  it('sentinel baseDamage(−999)攻击法术仍建链:FIRE 动画对**所有**攻击魔法都放,不 gate baseDamage', () => {
    // sdlpal PAL_BattleShowPlayerOffMagicAnim 对一切攻击魔法都放 FIRE 特效;baseDamage 只决定
    //   **内联**伤害(sentinel −999 的特殊法术伤害靠 scriptOnSuccess opcode)。修:动画曾误 gate 在
    //   baseDamage>0 块内 → sentinel 法术(御剑/special)不动画。现移出 gate。
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5 },
    ])
    placeFighters(state, [{ x: 240, y: 170 }], [{ x: 160, y: 80 }])
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell()],
      // 64537 = (SHORT)−999 sentinel:asShort(baseDamage) <= 0 → E1 内联伤害跳过
      magics: [
        makeMagic({
          effect: 12,
          type: 'normal',
          baseDamage: 64537,
          fireDelay: 2,
          effectTimes: 1,
          shake: 0,
          speed: 2,
        }),
      ],
      playerRoles,
      bus,
      commands,
      runScript,
      magicSpriteFrameCounts: frameCounts,
      battleEffectIndex: [0, 0],
    })
    // PreMagic + OffMagic FIRE 动画仍建链(尽管无内联伤害)
    expect(state.battleAnim, 'sentinel 攻击魔法 FIRE 动画应建链').toBeDefined()
    expect(state.battleAnim!.frames[18]?.overlays?.[0]).toMatchObject({
      kind: 'magic',
      spriteChunk: 12,
    }) // L14:前置 Delay(1) → overlay 从 idx 18
    // 敌人 HP 未变(sentinel 不走 E1 内联伤害,伤害靠 scriptOnSuccess opcode)
    expect(state.enemies[0]!.e.health).toBe(100)
  })

  it('单体 normal:OffMagic 落点 = enemy.posOriginal + (xOff,yOff)', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5 },
    ])
    placeFighters(state, [{ x: 240, y: 170 }], [{ x: 160, y: 80 }])
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
      runScript,
      magicSpriteFrameCounts: frameCounts,
    })
    const off = state.battleAnim!.frames[18]! // L14:前置 Delay(1) → overlay 从 idx 18
    expect(off.overlays![0]).toMatchObject({ x: 164, y: 74 })
  })

  it('全体攻击法术(attackAll)→ OffMagic overlays 三落点', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5 },
      { health: 100, defense: 30, level: 5 },
    ])
    placeFighters(
      state,
      [{ x: 240, y: 170 }],
      [
        { x: 160, y: 80 },
        { x: 100, y: 60 },
      ],
    )
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
      runScript,
      magicSpriteFrameCounts: frameCounts,
    })
    const off = state.battleAnim!.frames[18]! // L14:前置 Delay(1) → overlay 从 idx 18
    expect(off.overlays).toHaveLength(3)
  })

  it('applyToPlayer starts the defensive effect chain and leaves enemies unharmed', () => {
    // Defensive effects include the common cast intro, then the target effect and glow.
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5 },
    ])
    placeFighters(state, [{ x: 240, y: 170 }], [{ x: 160, y: 80 }])
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
      runScript,
      magicSpriteFrameCounts: frameCounts,
    })
    // Cast intro 17 + caster pose 1 + effect 8 + glow 13.
    expect(state.battleAnim).toBeDefined()
    expect(state.battleAnim!.frames.length).toBe(17 + 1 + 8 + 13)
    // 不打敌人(防御类:E1 inline 伤害不触发)
    expect(state.enemies[0]!.e.health).toBe(100)
  })

  it('缺 magicSpriteFrameCounts(无该 chunk)→ 不建时间线', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5 },
    ])
    placeFighters(state, [{ x: 240, y: 170 }], [{ x: 160, y: 80 }])
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
      runScript,
      magicSpriteFrameCounts: frameCounts,
    })
    expect(state.battleAnim).toBeUndefined()
    // 伤害仍即时结算(E1 不依赖时间线)
    expect(state.enemies[0]!.e.health).toBeLessThan(100)
  })

  it('缺 fighter posOriginal→ 不建时间线', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5 },
    ])
    // Explicit missing-position defensive input; normal constructed fighters are positioned.
    delete state.players[0]!.posOriginal
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
      runScript,
      magicSpriteFrameCounts: frameCounts,
    })
    expect(state.battleAnim).toBeUndefined()
  })

  it('PostMagic 段:受伤敌(掉血)抖动帧;i==1 帧 iColorShift=6', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5 },
    ])
    placeFighters(state, [{ x: 240, y: 170 }], [{ x: 160, y: 80 }])
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
      runScript,
      magicSpriteFrameCounts: frameCounts,
    })
    const frames = state.battleAnim!.frames
    // PostMagic 段 = 倒数 5..2(DM12 末尾另有 Delay(5) 收尾帧);i==1 抖动帧 iColorShift=6
    const post = frames.slice(frames.length - 5, frames.length - 1)
    const colorShiftFrame = post[1]!
    expect(colorShiftFrame.fighters?.[0]).toMatchObject({ side: 'enemy', idx: 0, iColorShift: 6 })
  })
})

describe('player defensive animation', () => {
  function makeStateMulti(role: Partial<PlayerRole>, count: number) {
    return makePartyMagicState(
      Array.from({ length: count }, () => ({ mp: 30, magicStrength: 64, ...role })),
      [{ health: 100, defense: 30, level: 5 }],
    )
  }

  const frameCounts = new Map<number, number>([[15, 5]])

  it('applyToPlayer places the effect and glow on the selected teammate', () => {
    const { state, playerRoles, bus } = makeStateMulti({}, 2)
    placeFighters(
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
      magics: [makeMagic({ effect: 15, type: 'applyToPlayer', speed: 2, xOffset: 4, yOffset: -6 })],
      playerRoles,
      bus,
      commands,
      runScript,
      magicSpriteFrameCounts: frameCounts,
    })
    expect(state.battleAnim).toBeDefined()
    const f = state.battleAnim!.frames
    expect(f.length).toBe(17 + 1 + 5 + 13)
    // PreMagic 后首帧 = caster 帧6
    expect(f[17]!.fighters).toEqual([{ side: 'player', idx: 0, currentFrame: 6 }])
    // magic 帧落点 = target 队员 posOriginal + (xOff,yOff) = (184,144)
    expect(f[18]!.overlays?.[0]).toMatchObject({ kind: 'magic', spriteChunk: 15, x: 184, y: 144 })
    // 辉光帧设 target 队员 idx1
    const glowPeak = f[17 + 1 + 5 + 6]! // 辉光 i=6 峰值
    expect(glowPeak.fighters).toEqual([{ side: 'player', idx: 1, iColorShift: 6 }])
  })

  it('applyToParty → 全队员落点 + 全队员辉光', () => {
    const { state, playerRoles, bus } = makeStateMulti({}, 3)
    placeFighters(
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
      runScript,
      magicSpriteFrameCounts: frameCounts,
    })
    const f = state.battleAnim!.frames
    // magic 帧落点 = 3 队员(DM14:+17 PreMagic 前摇)
    expect(f[18]!.overlays).toHaveLength(3)
    // 辉光首帧设 3 队员
    const glow0 = f[17 + 1 + 5]!
    expect(glow0.fighters).toHaveLength(3)
  })

  it('applyToPlayer 缺 target 队员 posOriginal → 不建链', () => {
    const { state, playerRoles, bus } = makeStateMulti({}, 2)
    // Explicit missing target position; all other fields retain the normal constructor values.
    delete state.players[1]!.posOriginal
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
      runScript,
      magicSpriteFrameCounts: frameCounts,
    })
    expect(state.battleAnim).toBeUndefined()
  })

  it('applyToPlayer 缺 magicSpriteFrameCounts(无该 chunk)→ 不建链', () => {
    const { state, playerRoles, bus } = makeStateMulti({}, 2)
    placeFighters(
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
      runScript,
      magicSpriteFrameCounts: frameCounts,
    })
    expect(state.battleAnim).toBeUndefined()
  })
})
