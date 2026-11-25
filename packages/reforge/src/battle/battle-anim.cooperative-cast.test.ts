import type { PlayerFighterFrames } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { buildPlayerCoop, type CastFxParams } from './battle-anim.js'
import { AnimPlayer } from './battle-animation-player.js'

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

const fx: CastFxParams = {
  placement: 'normal',
  xOffset: 0,
  yOffset: 0,
  speed: 0,
  fireDelay: 0,
  effectTimes: 0,
  shake: 0,
  wave: 0,
}

describe('合击队形与结果时序', () => {
  test('三人编队中第二位未贡献仍占聚拢槽，第三位真实贡献并于受击后归位', () => {
    const partyPositions = [
      { x: 180, y: 180 },
      { x: 234, y: 170 },
      { x: 270, y: 146 },
    ]
    const input = {
      framesByPlayer: [pose, pose, pose],
      casterIdx: 0,
      contributorIdxs: [0, 2],
      partySize: 3,
      partyPositions,
      fireFrames: 2,
      fx,
      targetPos: { x: 140, y: 106 },
      damageNums: [{ target: { side: 'enemy' as const, idx: 1 }, value: 23 }],
      postTargets: [{ idx: 1, pos: { x: 140, y: 106 } }],
      castSound: 'sound.coop',
      waitForEnemyDeathFade: true,
    }
    const before = structuredClone(input)
    const frames = buildPlayerCoop(input)
    expect(frames[0]?.sound).toBe('sound.coop')
    expect(frames[5]?.fighters).toEqual([
      { side: 'player', idx: 0, pos: { x: 208, y: 157 } },
      { side: 'player', idx: 2, pos: { x: 260, y: 183 } },
    ])
    expect(frames[6]?.fighters).toEqual([{ side: 'player', idx: 2, frame: 5 }])
    expect(frames[7]).toMatchObject({
      fighters: [{ side: 'player', idx: 0, frame: 5, colorShift: 6 }],
    })
    expect(frames[7]?.sound).toBeUndefined()
    expect(frames[8]?.fighters).toEqual([{ side: 'player', idx: 0, frame: 6, colorShift: 0 }])
    expect(frames[9]).toEqual({ durationMs: 40 })
    expect(frames[10]?.overlays).toEqual([
      { sheet: 'magic', frameIdx: 0, x: 140, y: 106, layerOffset: 0 },
    ])
    expect(frames[12]).toMatchObject({
      durationMs: 0,
      damageNums: [{ target: { side: 'enemy', idx: 1 }, value: 23 }],
    })
    expect(frames[12]?.fighters).toBeUndefined()
    expect(frames.slice(13, 17).map((frame) => frame.fighters?.[0]?.pos?.x)).toEqual([
      132, 136, 134, 140,
    ])
    const events: string[] = []
    const playback = new AnimPlayer(frames, {
      onEnemyDeathFade: () => events.push('fade'),
      onFighter: (fighter) => {
        if (fighter.side === 'player' && fighter.frame === 0) events.push('return')
      },
    })
    const fadeAt = frames.slice(0, 18).reduce((duration, frame) => duration + frame.durationMs, 0)
    expect(frames[17]).toEqual({ durationMs: 200 })
    expect(playback.tick(fadeAt - 1)).toBe(false)
    expect(events).toEqual([])
    expect(playback.tick(1200)).toBe(false)
    expect(events).toEqual(['fade'])
    expect(playback.tick(0)).toBe(false)
    expect(events).toEqual(['fade', 'return', 'return'])
    // 聚拢时空过中间槽；回位时第三位从第二个聚拢点计算第一步。
    expect(frames[19]?.fighters).toEqual([
      { side: 'player', idx: 0, frame: 0, pos: { x: 203, y: 160 } },
      { side: 'player', idx: 2, frame: 0, pos: { x: 240, y: 166 } },
    ])
    expect(frames.at(-1)?.fighters).toEqual([
      { side: 'player', idx: 0, frame: 0, pos: partyPositions[0] },
      { side: 'player', idx: 2, frame: 0, pos: partyPositions[2] },
    ])
    expect(
      frames.every(
        (frame) =>
          !frame.fighters?.some((fighter) => fighter.idx === 1 && fighter.side === 'player'),
      ),
    ).toBe(true)
    expect(input).toEqual(before)
  })

  test('没有 FIRE 资源的两人合击仍在受击位移前显示结果', () => {
    const frames = buildPlayerCoop({
      framesByPlayer: [pose, pose],
      casterIdx: 1,
      contributorIdxs: [0, 1],
      partySize: 2,
      partyPositions: [
        { x: 200, y: 176 },
        { x: 256, y: 152 },
      ],
      fireFrames: 0,
      fx,
      damageNums: [{ target: { side: 'enemy', idx: 0 }, value: 11 }],
      postTargets: [{ idx: 0, pos: { x: 100, y: 110 } }],
    })
    expect(frames[6]?.fighters).toEqual([{ side: 'player', idx: 0, frame: 5 }])
    expect(frames[9]).toEqual({
      durationMs: 0,
      waveAdd: 0,
      damageNums: [{ target: { side: 'enemy', idx: 0 }, value: 11 }],
    })
    expect(frames[10]?.fighters).toEqual([
      { side: 'enemy', idx: 0, pos: { x: 92, y: 110 }, colorShift: 0 },
    ])
    expect(frames.filter((frame) => frame.damageNums)).toHaveLength(1)
    expect(frames.every((frame) => frame.sound === undefined && frame.overlays === undefined)).toBe(
      true,
    )
    expect(frames.at(-1)?.fighters?.map((fighter) => fighter.idx)).toEqual([1, 0])
  })

  test('友方合击用聚拢后的受术站位绘制疗效，辉光结束再归位', () => {
    const partyPositions = [
      { x: 180, y: 180 },
      { x: 234, y: 170 },
      { x: 270, y: 146 },
    ]
    const frames = buildPlayerCoop({
      framesByPlayer: [pose, pose, pose],
      casterIdx: 0,
      contributorIdxs: [0, 2],
      partySize: 3,
      partyPositions,
      fireFrames: 2,
      fx: { ...fx, xOffset: -10, yOffset: -6, sound: 'sound.pal.138' },
      allyTargets: [{ idx: 2, pos: { x: 270, y: 146 } }],
      damageNums: [],
    })
    expect(frames[9]).toMatchObject({
      overlays: [{ sheet: 'magic', frameIdx: 0, x: 250, y: 177 }],
      sound: 'sound.pal.138',
    })
    expect(frames.slice(11, 24).map((frame) => frame.fighters)).toEqual(
      [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1, 0].map((colorShift) => [
        { side: 'player', idx: 2, colorShift },
      ]),
    )
    expect(frames.some((frame) => frame.damageNums?.length)).toBe(false)
    expect(frames.at(-1)?.fighters?.map(({ pos }) => pos)).toEqual([
      partyPositions[0],
      partyPositions[2],
    ])
  })
})
