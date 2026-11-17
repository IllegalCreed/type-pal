import type { PlayerFighterFrames } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { AnimPlayer, buildPlayerCoop, type CastFxParams } from './battle-anim.js'

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

describe('当前合击呈现的队员槽位与结果时序', () => {
  test('三人编队中第二位未贡献仍占聚拢槽，第三位真实贡献并于受击后归位', () => {
    const partyPositions = [
      { x: 110, y: 130 },
      { x: 140, y: 145 },
      { x: 170, y: 160 },
    ]
    const input = {
      framesByPlayer: [pose, pose, pose],
      casterIdx: 0,
      contributorIdxs: [0, 2],
      partySize: 3,
      partyPositions,
      fireFrames: 2,
      fx,
      targetPos: { x: 105, y: 70 },
      damageNums: [{ target: { side: 'enemy' as const, idx: 1 }, value: 23 }],
      postTargets: [{ idx: 1, pos: { x: 105, y: 70 } }],
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
      { sheet: 'magic', frameIdx: 0, x: 105, y: 70, layerOffset: 0 },
    ])
    expect(frames[12]).toMatchObject({
      durationMs: 0,
      damageNums: [{ target: { side: 'enemy', idx: 1 }, value: 23 }],
    })
    expect(frames[12]?.fighters).toBeUndefined()
    expect(frames.slice(13, 17).map((frame) => frame.fighters?.[0]?.pos?.x)).toEqual([
      97, 101, 99, 105,
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

  test('两人有效合击无受击位移时仍单独结算数字；无 fire 资产与声音不制造假帧', () => {
    const frames = buildPlayerCoop({
      framesByPlayer: [pose, pose],
      casterIdx: 1,
      contributorIdxs: [0, 1],
      partySize: 2,
      partyPositions: [
        { x: 100, y: 130 },
        { x: 150, y: 140 },
      ],
      fireFrames: 0,
      fx,
      damageNums: [{ target: { side: 'enemy', idx: 0 }, value: 11 }],
    })
    expect(frames).toHaveLength(16)
    expect(frames[6]?.fighters).toEqual([{ side: 'player', idx: 0, frame: 5 }])
    expect(frames[9]?.damageNums).toEqual([{ target: { side: 'enemy', idx: 0 }, value: 11 }])
    expect(frames.filter((frame) => frame.damageNums)).toHaveLength(1)
    expect(frames.every((frame) => frame.sound === undefined && frame.overlays === undefined)).toBe(
      true,
    )
    expect(frames.at(-1)?.fighters?.map((fighter) => fighter.idx)).toEqual([1, 0])
  })

  test('友方合击用聚拢后的受术站位绘制疗效，辉光结束再归位', () => {
    const partyPositions = [
      { x: 110, y: 130 },
      { x: 140, y: 145 },
      { x: 170, y: 160 },
    ]
    const frames = buildPlayerCoop({
      framesByPlayer: [pose, pose, pose],
      casterIdx: 0,
      contributorIdxs: [0, 1],
      partySize: 3,
      partyPositions,
      fireFrames: 2,
      fx: { ...fx, xOffset: -10, yOffset: -6, sound: 'sound.pal.138' },
      allyTargets: [{ idx: 1, pos: { x: 140, y: 145 } }],
      damageNums: [],
    })
    expect(frames[9]).toMatchObject({
      overlays: [{ sheet: 'magic', frameIdx: 0, x: 224, y: 164 }],
      sound: 'sound.pal.138',
    })
    expect(frames.slice(11, 24).map((frame) => frame.fighters)).toEqual(
      [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1, 0].map((colorShift) => [
        { side: 'player', idx: 1, colorShift },
      ]),
    )
    expect(frames.some((frame) => frame.damageNums?.length)).toBe(false)
    expect(frames.at(-1)?.fighters?.map(({ pos }) => pos)).toEqual(partyPositions.slice(0, 2))
  })
})
