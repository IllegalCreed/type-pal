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

const attackerPos = { x: 256, y: 152 }
const targets = [
  { idx: 0, pos: { x: 70, y: 130 } },
  { idx: 1, pos: { x: 140, y: 106 } },
]
const input = {
  frames: pose,
  attackerIdx: 1,
  attackerPos,
  attackerRestFrame: 0,
  effectFrameBase: 3,
  targets,
}

describe('玩家物攻全体时间线', () => {
  test('双挥各从本人的起手位置出招，命中特效铺两敌，击退连贯后统一复位', () => {
    const frames = buildPlayerAttackAll({
      ...input,
      sweeps: [
        {
          hits: [
            { idx: 1, value: 807 },
            { idx: 0, value: 404 },
          ],
        },
        {
          hits: [
            { idx: 1, value: 269 },
            { idx: 0, value: 135 },
          ],
        },
      ],
    })

    const playerDeltas = frames.flatMap((frame) =>
      (frame.fighters ?? []).filter(({ side }) => side === 'player'),
    )
    expect(playerDeltas.filter(({ frame }) => frame === 7)).toHaveLength(1)
    expect(playerDeltas.filter(({ frame }) => frame === 8).map(({ pos }) => pos)).toEqual([
      { x: 248, y: 148 },
      { x: 236, y: 140 },
    ])
    expect(playerDeltas.filter(({ frame }) => frame === 9)).toHaveLength(2)
    expect(frames.flatMap(({ overlays }) => (overlays ? [overlays] : []))).toEqual(
      [3, 4, 5, 3, 4, 5].map((frameIdx) =>
        targets.map(({ pos }) => ({ ...pos, sheet: 'effect', frameIdx })),
      ),
    )
    expect(
      frames.flatMap(({ fighters }) =>
        (fighters ?? []).flatMap(({ side, idx, pos }) =>
          side === 'enemy' && idx === 0 && pos ? [pos.x] : [],
        ),
      ),
    ).toEqual([62, 66, 64, 56, 60, 58, 70])
    expect(frames.at(-1)?.durationMs).toBe(120)
    expect(frames.at(-1)?.fighters?.[0]).toEqual({
      side: 'player',
      idx: 1,
      frame: 0,
      pos: attackerPos,
    })
  })

  test('两挥的武器音在首个特效帧，飘字在次帧且不重复派发', () => {
    const frames = buildPlayerAttackAll({
      ...input,
      sweeps: [
        {
          hits: [
            { idx: 1, value: 807 },
            { idx: 0, value: 404 },
          ],
          attackSound: 'sound.critical',
        },
        {
          hits: [
            { idx: 1, value: 269 },
            { idx: 0, value: 135 },
          ],
          attackSound: 'sound.attack',
        },
      ],
      weaponSound: 'sound.weapon',
    })
    const onSound = vi.fn()
    const onDamage = vi.fn()
    const playback = new AnimPlayer(frames, { onSound, onDamage })
    expect(playback.tick(0)).toBe(false)
    expect(playback.tick(160)).toBe(false)
    expect(onSound.mock.calls).toEqual([['sound.critical']])
    expect(playback.tick(120)).toBe(false)
    expect(onSound.mock.calls).toEqual([['sound.critical'], ['sound.weapon']])
    expect(onDamage).not.toHaveBeenCalled()
    expect(playback.tick(20)).toBe(false)
    expect(onDamage).not.toHaveBeenCalled()
    expect(playback.tick(20)).toBe(false)
    expect(onDamage.mock.calls).toEqual([
      [{ side: 'enemy', idx: 1 }, 807, undefined],
      [{ side: 'enemy', idx: 0 }, 404, undefined],
    ])
    expect(playback.tick(360)).toBe(false)
    expect(onSound.mock.calls).toEqual([['sound.critical'], ['sound.weapon'], ['sound.attack']])
    expect(onDamage).toHaveBeenCalledTimes(2)
    expect(playback.tick(120)).toBe(false)
    expect(onSound.mock.calls).toEqual([
      ['sound.critical'],
      ['sound.weapon'],
      ['sound.attack'],
      ['sound.weapon'],
    ])
    expect(onDamage).toHaveBeenCalledTimes(2)
    expect(playback.tick(40)).toBe(false)
    expect(onDamage.mock.calls.slice(2)).toEqual([
      [{ side: 'enemy', idx: 1 }, 269, undefined],
      [{ side: 'enemy', idx: 0 }, 135, undefined],
    ])
  })

  test('单挥走普通中心冲刺，只显示唯一目标并允许没有命中特效资产', () => {
    const frames = buildPlayerAttackAll({
      ...input,
      effectFrameBase: -1,
      targets: [{ idx: 3, pos: { x: 100, y: 80 } }],
      sweeps: [{ hits: [{ idx: 3, value: 17 }] }],
    })
    expect(frames[1]?.fighters).toEqual([
      { side: 'player', idx: 1, frame: 8, pos: { x: 214, y: 120 } },
    ])
    expect(frames.some((frame) => frame.overlays || frame.sound)).toBe(false)
    expect(frames.flatMap((frame) => frame.damageNums ?? [])).toEqual([
      { target: { side: 'enemy', idx: 3 }, value: 17 },
    ])
    expect(
      frames
        .flatMap((frame) => frame.fighters ?? [])
        .filter(({ side }) => side === 'enemy')
        .map(({ idx }) => idx),
    ).toEqual([3, 3, 3, 3, 3])
  })
})
