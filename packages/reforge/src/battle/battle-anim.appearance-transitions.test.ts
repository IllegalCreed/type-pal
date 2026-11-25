import { describe, expect, test } from 'vitest'
import { PLAYER_PROFILE } from '../__tests__/battle-workflows/catalog.js'
import { buildEnemyDivide, buildEnemyTransform, buildPlayerTrance } from './battle-anim.js'

const PLAYER_FRAMES = PLAYER_PROFILE.frames

describe('战斗角色外观与分裂位移', () => {
  test('变身现形:旧图 colorShift 0→5 六帧染白 → 72帧 dither 过渡至新图', () => {
    const frames = buildEnemyTransform({
      idx: 2,
      oldDefinitionId: 'battle-sprite.enemy.001',
      oldPos: { x: 140, y: 106 },
      newPos: { x: 140, y: 128 },
      oldIdleFrame: 0,
      newIdleFrame: 3,
      sound: 'sound.pal.047',
    })
    expect(frames.length).toBe(78)
    expect(frames.slice(0, 6).map((f) => f.fighters![0]!.colorShift)).toEqual([0, 1, 2, 3, 4, 5])
    const steps = frames.map(({ appearanceTransition }) =>
      appearanceTransition?.side === 'enemy' ? appearanceTransition.step : null,
    )
    expect(steps.slice(0, 6)).toEqual([0, 0, 0, 0, 0, 0])
    expect(steps.slice(6)).toEqual(Array.from({ length: 72 }, (_, i) => i + 1))
    expect(frames.slice(6).every((f) => f.durationMs === 16)).toBe(true)
    expect(frames[6]!.fighters![0]).toMatchObject({
      frame: 3,
      pos: { x: 140, y: 128 },
      holdFrame: true,
    })
    expect(frames[6]!.appearanceTransition).toMatchObject({
      step: 1,
      source: { x: 140, y: 106, frame: 0, colorShift: 5 },
    })
    expect(frames[6]!.sound).toBe('sound.pal.047')
  })

  test('梦蛇:旧图施法后 0/2/4/6/8/10 闪色，再 72×16ms 切换到新图', () => {
    // fight.c:4226–4240 和 battle.c:884–907 的冻结端点与逐相溶解。
    const frames = buildPlayerTrance({
      casterIdx: 0,
      casterPos: { x: 240, y: 170 },
      oldDefinitionId: 'battle-sprite.player.000',
      oldFrames: PLAYER_FRAMES,
      newFrames: { ...PLAYER_FRAMES, preMagic: 4 },
      castEffectBase: -1,
      magicSound: 'sound.pal.009',
    })
    const flash = frames.slice(7, 13)
    expect(flash.map((f) => f.fighters![0]!.colorShift)).toEqual([0, 2, 4, 6, 8, 10])
    expect(flash.every((f) => f.durationMs === 40)).toBe(true)
    expect(frames[0]?.appearanceTransition).toEqual({
      side: 'player',
      idx: 0,
      oldDefinitionId: 'battle-sprite.player.000',
    })
    const fade = frames.slice(-72)
    expect(
      fade.map((f) =>
        f.appearanceTransition?.side === 'player' ? f.appearanceTransition.fade?.step : null,
      ),
    ).toEqual(Array.from({ length: 72 }, (_, i) => i + 1))
    expect(fade[0]?.appearanceTransition).toMatchObject({
      fade: { source: { x: 230, y: 166, frame: 5, colorShift: 10 } },
    })
    expect(fade[0]?.fighters).toEqual([
      { side: 'player', idx: 0, frame: 4, colorShift: 0, pos: { x: 240, y: 170 } },
    ])
    expect(fade.every((f) => f.durationMs === 16)).toBe(true)
  })

  test('分裂滑开(script.c:2853 0x9C):10 帧整数二分逼近 + 终帧精确落位', () => {
    const frames = buildEnemyDivide({
      motherPos: { x: 100, y: 100 },
      spawns: [{ idx: 3, target: { x: 180, y: 120 }, idleFrame: 0 }],
    })
    expect(frames.length).toBe(11)
    const xs = frames.map((f) => f.fighters![0]!.pos!.x)
    expect(xs).toEqual([140, 160, 170, 175, 177, 178, 179, 179, 179, 179, 180]) // (cur+target)/2 整除
    expect(frames[0]!.fighters![0]!.pos!.y).toBe(110)
    expect(frames[10]!.fighters![0]!.pos).toEqual({ x: 180, y: 120 })
  })
})
