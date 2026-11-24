import type { EnemyBattleSpriteProfile, PlayerFighterFrames } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { buildEnemyCast, type CastFxParams } from './battle-anim.js'

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

const enemy: EnemyBattleSpriteProfile = {
  kind: 'enemy',
  idle: { start: 0, count: 2 },
  magic: { start: 2, count: 1 },
  attack: { start: 3, count: 2 },
  idleTicksPerFrame: 1,
  actTicksPerFrame: 3,
}

const fx: CastFxParams = {
  placement: 'attackWhole',
  xOffset: 3,
  yOffset: -4,
  layerOffset: 2,
  speed: 1,
  fireDelay: 1,
  effectTimes: 1,
  shake: 2,
  preShake: { frames: 4, level: 4 },
  wave: 3,
  sound: 'sound.enemy-magic',
}

describe('敌方法术的动作帧与屏幕效果', () => {
  test('正 fireDelay 在特效里推进敌攻击段，前震、后震、波幅和烙印各留原帧', () => {
    const input = {
      enemyIdx: 2,
      enemyPos: { x: 100, y: 110 },
      enemyFrame: 1,
      anim: enemy,
      playerFrames: [pose],
      magicSound: 'sound.windup',
      fireFrames: 2,
      fx,
      targetPos: { x: 88, y: 71 },
      damageNums: [],
      hurtPlayers: [],
      keepEffect: true,
    }
    const frames = buildEnemyCast(input)
    const effect = frames.filter((frame) => frame.overlays?.length)
    const firstEffect = frames.findIndex((frame) => frame.overlays?.length)
    expect(frames.slice(0, firstEffect)).toEqual([
      {
        durationMs: 40,
        fighters: [{ side: 'enemy', idx: 2, pos: { x: 112, y: 116 }, frame: 1, holdFrame: true }],
      },
      { durationMs: 40, fighters: [{ side: 'enemy', idx: 2, pos: { x: 116, y: 118 } }] },
      { durationMs: 120, fighters: [{ side: 'enemy', idx: 2, frame: 2 }], sound: 'sound.windup' },
    ])
    expect(effect.map((frame) => frame.fighters?.[0]?.frame)).toEqual([
      undefined,
      3,
      4,
      undefined,
      undefined,
    ])
    expect(effect.map((frame) => frame.overlays?.[0])).toEqual(
      [0, 1, 1, 0, 0].map((frameIdx) => ({
        sheet: 'magic',
        frameIdx,
        x: 243,
        y: 146,
        layerOffset: 2,
      })),
    )
    expect(effect.map((frame) => frame.sound)).toEqual([
      'sound.enemy-magic',
      undefined,
      undefined,
      undefined,
      undefined,
    ])
    expect(effect[0]).toMatchObject({ durationMs: 60, waveAdd: 3 })
    // The last scripted beat overlaps the first native tail beat. The tail wins.
    expect(effect.map((frame) => frame.frameShakeOffsetY)).toEqual([4, -4, 4, -3, 3])
    expect(frames.every((frame) => frame.screenShake === undefined)).toBe(true)
    expect(
      frames
        .slice(firstEffect + effect.length)
        .every((frame) => frame.frameShakeOffsetY === undefined),
    ).toBe(true)
    expect(effect.at(-1)?.burnBg).toEqual([
      { sheet: 'magic', frameIdx: 0, x: 243, y: 146, layerOffset: 2 },
    ])
    expect(frames.slice(firstEffect + effect.length, -1).map((frame) => frame.durationMs)).toEqual([
      40, 40, 40, 40, 40,
    ])
    expect(frames.slice(firstEffect + effect.length).some((frame) => frame.damageNums)).toBe(false)
    expect(frames.at(-1)).toEqual({
      durationMs: 40,
      fighters: [{ side: 'enemy', idx: 2, frame: 0, pos: { x: 100, y: 110 } }],
    })
  })

  test('零 FIRE 延迟先播攻击段，单体特效使用受术者底锚', () => {
    const frames = buildEnemyCast({
      enemyIdx: 0,
      enemyPos: { x: 100, y: 110 },
      enemyFrame: 0,
      anim: enemy,
      playerFrames: [pose],
      fireFrames: 1,
      fx: {
        ...fx,
        placement: 'normal',
        xOffset: 0,
        yOffset: 0,
        layerOffset: undefined,
        fireDelay: 0,
        effectTimes: 0,
        shake: 0,
        preShake: undefined,
        wave: 0,
        sound: undefined,
      },
      targetPos: { x: 240, y: 170 },
      damageNums: [],
    })
    const firstFire = frames.findIndex((frame) => frame.overlays?.length)
    expect(
      frames
        .slice(0, firstFire)
        .flatMap(({ fighters }) => fighters ?? [])
        .map(({ frame }) => frame)
        .filter((frame) => frame !== undefined),
    ).toEqual([0, 2, 2, 3, 4])
    expect(frames[firstFire]?.overlays).toEqual([
      { sheet: 'magic', frameIdx: 0, x: 240, y: 170, layerOffset: 0 },
    ])
    expect(
      frames.filter(
        (frame) =>
          frame.sound ||
          frame.waveAdd ||
          frame.screenShake ||
          frame.frameShakeOffsetY !== undefined,
      ),
    ).toEqual([])
    expect(frames.some((frame) => frame.damageNums)).toBe(false)
  })

  test.each([
    {
      placement: 'attackAll',
      points: [
        { x: 183, y: 176 },
        { x: 237, y: 166 },
        { x: 273, y: 142 },
      ],
    },
    { placement: 'attackField', points: [{ x: 163, y: 196 }] },
  ] as const)('$placement 使用原版敌法落点和统一深度偏移', ({ placement, points }) => {
    const frames = buildEnemyCast({
      enemyIdx: 0,
      enemyPos: { x: 100, y: 110 },
      enemyFrame: 0,
      anim: enemy,
      playerFrames: [pose],
      fireFrames: 1,
      fx: { ...fx, placement, fireDelay: 0, effectTimes: 0, shake: 0, wave: 0 },
      damageNums: [],
    })
    expect(frames.find((frame) => frame.overlays?.length)?.overlays).toEqual(
      points.map((pos) => ({ sheet: 'magic', frameIdx: 0, ...pos, layerOffset: 2 })),
    )
  })
})
