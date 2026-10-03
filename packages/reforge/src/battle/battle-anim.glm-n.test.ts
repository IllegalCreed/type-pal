import type { PlayerFighterFrames } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { buildMateAttack, buildPlayerAttackAll, buildThrowItem } from './battle-anim.js'

const pose: PlayerFighterFrames = {
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
}

describe('N04 投掷物品时间线目标分布', () => {
  test('无任何目标直接 fail-loud，不产出时间线', () => {
    expect(() => buildThrowItem({ casterIdx: 0, casterFrames: pose, damage: 5 })).toThrow(
      'buildThrowItem: 至少需要一个目标',
    )
  })

  test('两敌同时受击：各自独立伤害数字挂同一命中帧，零伤目标不产数字', () => {
    const frames = buildThrowItem({
      casterIdx: 0,
      casterFrames: pose,
      hits: [
        { idx: 0, damage: 12 },
        { idx: 1, damage: 0 },
        { idx: 2, damage: 7 },
      ],
    })
    const numbered = frames.filter((frame) => frame.damageNums)
    expect(numbered).toHaveLength(1)
    expect(numbered[0]?.damageNums).toEqual([
      { target: { side: 'enemy', idx: 0 }, value: 12 },
      { target: { side: 'enemy', idx: 2 }, value: 7 },
    ])
    const reset = frames[frames.length - 1]
    expect(reset?.fighters).toContainEqual({ side: 'player', idx: 0, frame: pose.idle })
  })

  test('单目标正伤保持单数字形态（damageNum 而非 damageNums）', () => {
    const frames = buildThrowItem({
      casterIdx: 1,
      casterFrames: pose,
      hits: [{ idx: 2, damage: 9 }],
    })
    const numbered = frames.filter((frame) => frame.damageNum || frame.damageNums)
    expect(numbered).toHaveLength(1)
    expect(numbered[0]?.damageNum).toEqual({
      target: { side: 'enemy', idx: 2 },
      value: 9,
    })
    expect(numbered[0]?.damageNums).toBeUndefined()
  })
})

describe('N04 队友受击阵亡帧', () => {
  test('mateDied 后队友帧取 dead/dying 姿而非 idle 姿', () => {
    const frames = buildMateAttack({
      attackerFrames: pose,
      mateFrames: pose,
      attackerIdx: 0,
      attackerPos: { x: 40, y: 140 },
      mateIdx: 1,
      matePos: { x: 120, y: 60 },
      damage: 6,
      mateDied: true,
    })
    const mateFrames = frames.flatMap((frame) =>
      (frame.fighters ?? []).filter((fighter) => fighter.side === 'player' && fighter.idx === 1),
    )
    expect(mateFrames.length).toBeGreaterThan(0)
    // 复位帧 = 阵亡倒地姿；击退/受击帧只带位移或染色。
    expect(mateFrames).toContainEqual({
      side: 'player',
      idx: 1,
      frame: pose.dead,
      pos: { x: 120, y: 60 },
    })
  })
})

describe('N04 全体物攻可选音臂', () => {
  test('缺攻音与兵器音时不产出任何 sound 字段，时间线其余不变', () => {
    const voiced = buildPlayerAttackAll({
      frames: pose,
      attackerIdx: 0,
      attackerPos: { x: 50, y: 140 },
      centerPos: { x: 130, y: 70 },
      hits: [{ idx: 0, pos: { x: 100, y: 80 }, value: 3 }],
      attackSound: 'a',
      weaponSound: 'w',
    })
    const silent = buildPlayerAttackAll({
      frames: pose,
      attackerIdx: 0,
      attackerPos: { x: 50, y: 140 },
      centerPos: { x: 130, y: 70 },
      hits: [{ idx: 0, pos: { x: 100, y: 80 }, value: 3 }],
    })
    expect(silent.map((frame) => frame.sound)).toEqual(
      Array.from({ length: silent.length }, () => undefined),
    )
    expect(silent.map((frame) => frame.durationMs)).toEqual(voiced.map((frame) => frame.durationMs))
    expect(silent.map((frame) => frame.fighters)).toEqual(voiced.map((frame) => frame.fighters))
    expect(voiced.map((frame) => frame.sound)).toEqual([
      undefined,
      'a',
      'w',
      ...Array.from({ length: voiced.length - 3 }, () => undefined),
    ])
  })
})
