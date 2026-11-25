import { describe, expect, test } from 'vitest'
import {
  enemyProfile,
  finishRecordedAnimation,
  recordBattleAnimation,
} from '../__tests__/battle-workflows/animation-observer.js'
import { PLAYER_PROFILE } from '../__tests__/battle-workflows/catalog.js'
import { buildEnemyCast, buildPlayerCast, buildPlayerScriptCastEffect } from './battle-anim.js'

const PLAYER_FRAMES = PLAYER_PROFILE.frames

describe('敌我施法起手与受击表现', () => {
  test('玩家施法:吟唱音挂 frame5 姿势帧(rgwMagicSound,非起手即播)', () => {
    const frames = buildPlayerCast({
      casterFrames: PLAYER_FRAMES,
      casterIdx: 0,
      casterPos: { x: 240, y: 170 },
      magicSound: 'sound.pal.009',
      castEffectBase: -1,
      fireFrames: 0,
      fx: {
        placement: 'normal',
        xOffset: 0,
        yOffset: 0,
        speed: 0,
        fireDelay: 0,
        effectTimes: 1,
        shake: 0,
        wave: 0,
      },
      damageNums: [],
    })
    const { events, player } = recordBattleAnimation(frames)
    finishRecordedAnimation(player, 50)
    const snd = events.indexOf('snd:sound.pal.009')
    const gesture = events.indexOf('f:player0#5')
    expect(snd).toBeGreaterThan(-1)
    expect(gesture).toBeGreaterThan(-1)
    expect(snd).toBe(gesture + 1) // 与 frame5 同帧派发(fighter 先于 sound)
  })

  test('对敌仙术在起手特效与 FIRE 之间各保留一拍收尾和准备', () => {
    const frames = buildPlayerCast({
      casterFrames: PLAYER_FRAMES,
      casterIdx: 0,
      casterPos: { x: 240, y: 170 },
      castEffectBase: 15,
      fireFrames: 7,
      fx: {
        placement: 'attackAll',
        xOffset: 0,
        yOffset: 0,
        speed: 2,
        fireDelay: 0,
        effectTimes: 0,
        shake: 0,
        wave: 0,
      },
      offensive: true,
      damageNums: [],
    })
    const lastEffect = frames
      .map((frame) => frame.overlays?.some(({ sheet }) => sheet === 'effect'))
      .lastIndexOf(true)
    const firstFire = frames.findIndex((frame) =>
      frame.overlays?.some(({ sheet }) => sheet === 'magic'),
    )
    expect(lastEffect).toBeGreaterThanOrEqual(0)
    expect(firstFire).toBeGreaterThan(lastEffect)
    expect(frames.slice(lastEffect + 1, firstFire)).toEqual([
      { durationMs: 40 },
      { durationMs: 40 },
    ])
  })

  test('敌施法无特效资源时仍从原地显示数字和五拍受击', () => {
    const frames = buildEnemyCast({
      enemyIdx: 0,
      enemyPos: { x: 100, y: 110 },
      enemyFrame: 0,
      anim: enemyProfile(4, 2, 0),
      playerFrames: [PLAYER_FRAMES],
      fireFrames: 0, // 无特效资产也要有受击反应
      fx: {
        placement: 'normal',
        xOffset: 0,
        yOffset: 0,
        speed: 0,
        fireDelay: 0,
        effectTimes: 1,
        shake: 0,
        wave: 0,
      },
      damageNums: [{ target: { side: 'player', idx: 0 }, value: 9 }],
      hurtPlayers: [{ idx: 0, pos: { x: 240, y: 170 } }],
    })
    const { events, player } = recordBattleAnimation(frames)
    finishRecordedAnimation(player, 50)
    // fight.c:4856–4898。第一拍原地显示扣血，后三次位移后在最后一拍停住。
    expect(
      events.filter((event) => event.startsWith('f:player') || event.startsWith('dmg:')),
    ).toEqual([
      'f:player0#4@240,170c6',
      'dmg:player0:9',
      'f:player0#4@244,172c6',
      'f:player0#4@246,173c6',
      'f:player0#4@247,173c0',
      'f:player0#4@247,173c0',
    ])
  })

  test('敌施法:被动格挡从首个特效帧可见，后续特效帧保持姿势', () => {
    const mk = (autoDefendPlayers?: number[]) =>
      buildEnemyCast({
        enemyIdx: 0,
        enemyPos: { x: 100, y: 110 },
        enemyFrame: 0,
        anim: enemyProfile(4, 2, 0),
        playerFrames: [PLAYER_FRAMES, PLAYER_FRAMES, PLAYER_FRAMES],
        fireFrames: 3,
        fx: {
          placement: 'normal',
          xOffset: 0,
          yOffset: 0,
          speed: 0,
          fireDelay: 0,
          effectTimes: 1,
          shake: 0,
          wave: 0,
        },
        damageNums: [],
        ...(autoDefendPlayers ? { autoDefendPlayers } : {}),
      })
    const frames = mk([0, 2])
    const fireStart = frames.findIndex((frame) => frame.overlays?.length)
    expect(fireStart).toBeGreaterThan(0)
    expect(frames[fireStart]?.fighters).toEqual([
      { side: 'player', idx: 0, frame: 3 },
      { side: 'player', idx: 2, frame: 3 },
    ])
    for (const f of [...frames.slice(0, fireStart), ...frames.slice(fireStart + 1)])
      expect(f.fighters?.some((x) => x.side === 'player') ?? false).toBe(false)
    // 未格挡:全时间线无 player delta
    for (const f of mk()) expect(f.fighters?.some((x) => x.side === 'player') ?? false).toBe(false)
  })

  test('剧情施法白闪:PreMagic + frame6 + 全队 0/2/4/6/8 后复色', () => {
    const frames = buildPlayerScriptCastEffect({
      casterIdx: 1,
      casterPos: { x: 240, y: 170 },
      casterFrames: PLAYER_FRAMES,
      castEffectBase: 70,
      partyIdxs: [0, 1, 2],
      magicSound: 'sound.pal.019',
    })
    expect(frames).toHaveLength(24)
    expect(frames[3]?.fighters?.[0]?.pos).toEqual({ x: 230, y: 166 })
    expect(frames[5]?.fighters?.[0]?.frame).toBe(PLAYER_FRAMES.preMagic)
    expect(frames[5]?.sound).toBe('sound.pal.019')
    expect(frames.slice(6, 16).map((frame) => frame.overlays?.[0]?.frameIdx)).toEqual(
      Array.from({ length: 10 }, (_, index) => 70 + index),
    )
    expect(frames[17]?.fighters?.[0]?.frame).toBe(PLAYER_FRAMES.magic)
    expect(
      frames.slice(18, 23).map((frame) => frame.fighters?.map((fighter) => fighter.colorShift)),
    ).toEqual([
      [0, 0, 0],
      [2, 2, 2],
      [4, 4, 4],
      [6, 6, 6],
      [8, 8, 8],
    ])
    expect(frames[23]?.fighters?.map((fighter) => fighter.colorShift)).toEqual([0, 0, 0])
  })
})
