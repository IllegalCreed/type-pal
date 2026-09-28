/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R21（migrate/pal-battle-sprites.ts）。
 * 该文件此前无任何测试。合同：player/enemy/summon 定义号函数（范围拒绝与命名）、
 * createPalPlayerBattleSpriteDefinitions 常量防漂移 + fighter profile（帧映射/steal 条件/
 * effect base 手算）+ summon profile、createPalEnemyBattleSpriteDefinitions exact=145/extra=8
 * 恒定与按 enemyObjects 出定义、createPalBattleSpriteDefinitions 组合。
 */
import { describe, expect, test } from 'vitest'
import type { SourceEnemy, SourceEnemyObject } from './migrate-enemies.js'
import {
  createPalBattleSpriteDefinitions,
  createPalEnemyBattleSpriteDefinitions,
  createPalPlayerBattleSpriteDefinitions,
  PAL_ENEMY_BATTLE_SPRITE_FRAME_COUNTS,
  PAL_PLAYER_BATTLE_EFFECT_INDEX,
  PAL_PLAYER_BATTLE_SPRITE_FRAME_COUNTS,
  palEnemyBattleSpriteDefinitionId,
  palPlayerBattleSpriteDefinitionId,
  palSummonBattleSpriteDefinitionId,
} from './pal-battle-sprites.js'

const enemy = (id: number, idleFrames: number, magicFrames = 0, attackFrames = 0): SourceEnemy => ({
  id,
  idleFrames,
  magicFrames,
  attackFrames,
  idleAnimSpeed: 2,
  actWaitFrames: 5,
  yPosOffset: 0,
  attackSound: 0,
  actionSound: 0,
  magicSound: 0,
  deathSound: 0,
  callSound: 0,
  health: 100,
  exp: 5,
  cash: 10,
  level: 1,
  magic: 0,
  magicRate: 0,
  attackEquivItem: 0,
  attackEquivItemRate: 0,
  stealItem: 0,
  stealItemCount: 0,
  attackStrength: 10,
  magicStrength: 10,
  defense: 10,
  dexterity: 10,
  fleeRate: 0,
  poisonResistance: 0,
  elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
  physicalResistance: 0,
  dualMove: 0,
  collectValue: 0,
})

describe('R21 定义号函数', () => {
  test('player 0..9 → fighter-i、10..18 → summon-i；越界/非整数拒绝', () => {
    expect(palPlayerBattleSpriteDefinitionId(0)).toBe('player-fighter-0')
    expect(palPlayerBattleSpriteDefinitionId(9)).toBe('player-fighter-9')
    expect(palPlayerBattleSpriteDefinitionId(10)).toBe('player-summon-10')
    expect(palPlayerBattleSpriteDefinitionId(18)).toBe('player-summon-18')
    expect(() => palPlayerBattleSpriteDefinitionId(19)).toThrow('期望 0..18')
    expect(() => palPlayerBattleSpriteDefinitionId(-1)).toThrow('期望 0..18')
    expect(() => palPlayerBattleSpriteDefinitionId(1.5)).toThrow('期望 0..18')
  })

  test('enemy 正整数 → enemy-battle-i；0/负数拒绝', () => {
    expect(palEnemyBattleSpriteDefinitionId(153)).toBe('enemy-battle-153')
    expect(() => palEnemyBattleSpriteDefinitionId(0)).toThrow('期望正整数')
    expect(() => palEnemyBattleSpriteDefinitionId(-2)).toThrow('期望正整数')
  })

  test('summon godId 0..8 → player-summon-(godId+10)；9 越界拒绝', () => {
    expect(palSummonBattleSpriteDefinitionId(0)).toBe('player-summon-10')
    expect(palSummonBattleSpriteDefinitionId(8)).toBe('player-summon-18')
    expect(() => palSummonBattleSpriteDefinitionId(9)).toThrow('期望 0..8')
  })
})

describe('R21 createPalPlayerBattleSpriteDefinitions', () => {
  test('常量输入 → 19 定义；fighter 帧映射/steal 条件/effect base 手算', () => {
    const defs = createPalPlayerBattleSpriteDefinitions(
      PAL_PLAYER_BATTLE_SPRITE_FRAME_COUNTS,
      PAL_PLAYER_BATTLE_EFFECT_INDEX,
    )
    expect(defs).toHaveLength(19)
    const fighter0 = defs[0]!
    expect(fighter0.id).toBe('player-fighter-0')
    expect(fighter0.profile).toMatchObject({
      kind: 'player-fighter',
      frames: {
        idle: 0,
        dying: 1,
        dead: 2,
        defend: 3,
        hurt: 4,
        preMagic: 5,
        magic: 6,
        attackWindup: 7,
        attackRush: 8,
        attackStrike: 9,
        steal: 10,
      },
      castEffectBase: PAL_PLAYER_BATTLE_EFFECT_INDEX[0] * 10 + 15, // 0*10+15 = 15
      attackEffectBase: PAL_PLAYER_BATTLE_EFFECT_INDEX[1] * 3, // 0*3 = 0
    })
    // sprite 9：frameCount 11 > 10 → 有 steal；castEffectBase = idx[18]*10+15 = 3*10+15 = 45
    expect(defs[9]!.profile).toMatchObject({ frames: { steal: 10 }, castEffectBase: 45 })
    // sprite 2：frameCount 10 → 无 steal；castEffectBase = idx[4]*10+15 = 2*10+15 = 35
    expect(defs[2]!.profile).toMatchObject({ castEffectBase: 35 })
    expect(JSON.stringify(defs[2]!.profile)).not.toContain('steal')
    // sprite 10 → summon profile
    expect(defs[10]!.profile).toEqual({ kind: 'summon' })
    expect(defs[10]!.id).toBe('player-summon-10')
  })

  test('帧数/效果索引漂移各自 fail-loud', () => {
    expect(() =>
      createPalPlayerBattleSpriteDefinitions(
        [...PAL_PLAYER_BATTLE_SPRITE_FRAME_COUNTS.slice(0, 18), 99],
        PAL_PLAYER_BATTLE_EFFECT_INDEX,
      ),
    ).toThrow('实际帧数发生漂移')
    expect(() =>
      createPalPlayerBattleSpriteDefinitions(PAL_PLAYER_BATTLE_SPRITE_FRAME_COUNTS, [
        0,
        0,
        9,
        ...PAL_PLAYER_BATTLE_EFFECT_INDEX.slice(3),
      ]),
    ).toThrow('battle-effect-index.json 发生漂移')
  })
})

describe('R21 createPalEnemyBattleSpriteDefinitions', () => {
  /** 153 只敌人：demand=实际帧 → exact；指定 8 只 demand=1 → extra；恒定 exact=145/extra=8。 */
  function source153(extraIds: ReadonlySet<number>): SourceEnemy[] {
    return PAL_ENEMY_BATTLE_SPRITE_FRAME_COUNTS.map((frames, i) => {
      const id = i + 1
      if (extraIds.has(id)) return enemy(id, 1)
      return enemy(id, frames)
    })
  }
  const extraIds = new Set([2, 4, 6, 8, 10, 12, 14, 16])
  const objects: SourceEnemyObject[] = [
    {
      objectIndex: 400,
      enemyId: 3,
      resistanceToSorcery: 0,
      scriptOnTurnStart: 0,
      scriptOnBattleEnd: 0,
      scriptOnReady: 0,
    },
    {
      objectIndex: 401,
      enemyId: 1,
      resistanceToSorcery: 0,
      scriptOnTurnStart: 0,
      scriptOnBattleEnd: 0,
      scriptOnReady: 0,
    },
  ]

  test('exact=145/extra=8 恒定；只对 enemyObjects 出定义且按 id 升序、段位手算', () => {
    const defs = createPalEnemyBattleSpriteDefinitions(
      source153(extraIds),
      objects,
      PAL_ENEMY_BATTLE_SPRITE_FRAME_COUNTS,
    )
    expect(defs.map((d) => d.id)).toEqual(['enemy-battle-1', 'enemy-battle-3'])
    const d3 = defs[1]!.profile as {
      idle: { start: number; count: number }
      magic: { start: number; count: number }
      attack: { start: number; count: number }
      idleTicksPerFrame: number
      actTicksPerFrame: number
    }
    expect(d3.idle).toEqual({ start: 0, count: PAL_ENEMY_BATTLE_SPRITE_FRAME_COUNTS[2] })
    expect(d3.magic).toEqual({ start: PAL_ENEMY_BATTLE_SPRITE_FRAME_COUNTS[2], count: 0 })
    expect(d3.attack).toEqual({ start: PAL_ENEMY_BATTLE_SPRITE_FRAME_COUNTS[2], count: 0 })
    expect(d3.idleTicksPerFrame).toBe(2)
    expect(d3.actTicksPerFrame).toBe(5)
  })

  test('缺动画数据 / 帧不足 / 帧数漂移 各自 fail-loud', () => {
    const missing = source153(extraIds).filter((e) => e.id !== 77)
    expect(() =>
      createPalEnemyBattleSpriteDefinitions(missing, objects, PAL_ENEMY_BATTLE_SPRITE_FRAME_COUNTS),
    ).toThrow('PAL enemy 77 缺动画数据')
    const short = source153(extraIds).map((e) => (e.id === 5 ? enemy(5, 999) : e))
    expect(() =>
      createPalEnemyBattleSpriteDefinitions(short, objects, PAL_ENEMY_BATTLE_SPRITE_FRAME_COUNTS),
    ).toThrow('帧不足')
    expect(() =>
      createPalEnemyBattleSpriteDefinitions(source153(extraIds), objects, [
        ...PAL_ENEMY_BATTLE_SPRITE_FRAME_COUNTS.slice(0, 152),
        99,
      ]),
    ).toThrow('漂移')
  })
})

describe('R21 createPalBattleSpriteDefinitions 组合', () => {
  test('player 19 + enemy used 数；player 段在前', () => {
    const extraIds = new Set([2, 4, 6, 8, 10, 12, 14, 16])
    const enemies = PAL_ENEMY_BATTLE_SPRITE_FRAME_COUNTS.map((frames, i) => {
      const id = i + 1
      return extraIds.has(id) ? enemy(id, 1) : enemy(id, frames)
    })
    const objects: SourceEnemyObject[] = [
      {
        objectIndex: 400,
        enemyId: 1,
        resistanceToSorcery: 0,
        scriptOnTurnStart: 0,
        scriptOnBattleEnd: 0,
        scriptOnReady: 0,
      },
    ]
    const defs = createPalBattleSpriteDefinitions(
      enemies,
      objects,
      PAL_PLAYER_BATTLE_SPRITE_FRAME_COUNTS,
      PAL_ENEMY_BATTLE_SPRITE_FRAME_COUNTS,
      PAL_PLAYER_BATTLE_EFFECT_INDEX,
    )
    expect(defs).toHaveLength(19 + 1)
    expect(defs[0]!.id).toBe('player-fighter-0')
    expect(defs[19]!.id).toBe('enemy-battle-1')
  })
})
