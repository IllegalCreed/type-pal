import type { PlayerFighterFrames } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import { AnimPlayer, buildPlayerAttackAll } from './battle-anim.js'

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

describe('当前长鞭物攻全体的一挥多目标时间线', () => {
  test('两敌不同伤害同帧结算，一次冲刺后按 −8/−4/−6 击退并完整复位', () => {
    const input = {
      frames: pose,
      attackerIdx: 1,
      attackerPos: { x: 50, y: 140 },
      centerPos: { x: 130, y: 70 },
      hits: [
        { idx: 0, pos: { x: 100, y: 80 }, value: 12 },
        { idx: 2, pos: { x: 130, y: 70 }, value: 8 },
      ],
      attackSound: 'sound.attack',
      weaponSound: 'sound.weapon',
    }
    const before = structuredClone(input)
    const frames = buildPlayerAttackAll(input)
    expect(frames).toHaveLength(7)
    expect(frames.map((frame) => frame.durationMs)).toEqual([160, 80, 80, 40, 40, 40, 160])
    expect(frames[0]?.fighters).toEqual([
      { side: 'player', idx: 1, frame: 7, pos: { x: 50, y: 140 } },
    ])
    expect(frames[1]).toMatchObject({
      sound: 'sound.attack',
      fighters: [{ side: 'player', idx: 1, frame: 8, pos: { x: 194, y: 90 } }],
    })
    expect(frames[2]).toMatchObject({
      sound: 'sound.weapon',
      fighters: [
        { side: 'player', idx: 1, frame: 9 },
        { side: 'enemy', idx: 0, colorShift: 6 },
        { side: 'enemy', idx: 2, colorShift: 6 },
      ],
      damageNums: [
        { target: { side: 'enemy', idx: 0 }, value: 12 },
        { target: { side: 'enemy', idx: 2 }, value: 8 },
      ],
    })
    expect(frames.slice(3, 6).map((frame) => frame.fighters)).toEqual([
      [
        { side: 'enemy', idx: 0, pos: { x: 92, y: 80 } },
        { side: 'enemy', idx: 2, pos: { x: 122, y: 70 } },
      ],
      [
        { side: 'enemy', idx: 0, pos: { x: 96, y: 80 } },
        { side: 'enemy', idx: 2, pos: { x: 126, y: 70 } },
      ],
      [
        { side: 'enemy', idx: 0, pos: { x: 94, y: 80 }, colorShift: 0 },
        { side: 'enemy', idx: 2, pos: { x: 124, y: 70 }, colorShift: 0 },
      ],
    ])
    expect(frames[6]?.fighters).toEqual([
      { side: 'player', idx: 1, frame: 0, pos: { x: 50, y: 140 } },
    ])
    expect(input).toEqual(before)
  })

  test('AnimPlayer 在挥击帧只派发一次双目标伤害与兵器音，停留同帧不重复结算', () => {
    const frames = buildPlayerAttackAll({
      frames: pose,
      attackerIdx: 0,
      attackerPos: { x: 40, y: 120 },
      centerPos: { x: 100, y: 80 },
      hits: [
        { idx: 1, pos: { x: 70, y: 90 }, value: 5 },
        { idx: 2, pos: { x: 100, y: 80 }, value: 7 },
      ],
      attackSound: 'sound.attack',
      weaponSound: 'sound.weapon',
    })
    const onSound = vi.fn()
    const onDamage = vi.fn()
    const playback = new AnimPlayer(frames, { onSound, onDamage })
    expect(playback.tick(0)).toBe(false)
    expect(playback.tick(160)).toBe(false)
    expect(onSound.mock.calls).toEqual([['sound.attack']])
    expect(playback.tick(80)).toBe(false)
    expect(onSound.mock.calls).toEqual([['sound.attack'], ['sound.weapon']])
    expect(onDamage.mock.calls).toEqual([
      [{ side: 'enemy', idx: 1 }, 5, undefined],
      [{ side: 'enemy', idx: 2 }, 7, undefined],
    ])
    expect(playback.tick(20)).toBe(false)
    expect(onDamage).toHaveBeenCalledTimes(2)
  })

  test('单个活敌仍走同一全体时间线，无可选声音时不制造声音或其它敌的数字', () => {
    const frames = buildPlayerAttackAll({
      frames: pose,
      attackerIdx: 0,
      attackerPos: { x: 40, y: 120 },
      centerPos: { x: 100, y: 80 },
      hits: [{ idx: 3, pos: { x: 100, y: 80 }, value: 17 }],
    })
    expect(frames).toHaveLength(7)
    expect(frames.some((frame) => frame.sound !== undefined)).toBe(false)
    expect(frames[2]?.damageNums).toEqual([{ target: { side: 'enemy', idx: 3 }, value: 17 }])
    expect(
      frames.slice(3, 6).map((frame) => frame.fighters?.map((fighter) => fighter.idx)),
    ).toEqual([[3], [3], [3]])
  })
})
