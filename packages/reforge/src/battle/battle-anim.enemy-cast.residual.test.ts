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
  idle: { start: 3, count: 2 },
  magic: { start: 5, count: 0 },
  attack: { start: 5, count: 2 },
  idleTicksPerFrame: 1,
  actTicksPerFrame: 1,
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
  preShake: { frames: 2, level: 4 },
  wave: 3,
  sound: 'sound.enemy-magic',
}

describe('当前敌法术时间线的复合屏幕效果', () => {
  test('敌无专属施法帧回落 idle，前震/后震/波幅/烙背景各留精确帧', () => {
    const input = {
      enemyIdx: 2,
      anim: enemy,
      playerFrames: [pose],
      magicSound: 'sound.windup',
      fireFrames: 2,
      fx,
      targetPos: { x: 88, y: 71 },
      damageNums: [{ target: { side: 'player' as const, idx: 0 }, value: 13 }],
      keepEffect: true,
    }
    const before = structuredClone(input)
    const frames = buildEnemyCast(input)
    expect(frames).toHaveLength(7)
    expect(frames[0]).toMatchObject({
      sound: 'sound.windup',
      fighters: [{ side: 'enemy', idx: 2, frame: 3 }],
    })
    expect(frames.slice(1, 6).map((frame) => frame.overlays?.[0])).toEqual([
      { sheet: 'magic', frameIdx: 0, x: 163, y: 96, layerOffset: 2 },
      { sheet: 'magic', frameIdx: 1, x: 163, y: 96, layerOffset: 2 },
      { sheet: 'magic', frameIdx: 1, x: 163, y: 96, layerOffset: 2 },
      { sheet: 'magic', frameIdx: 0, x: 163, y: 96, layerOffset: 2 },
      { sheet: 'magic', frameIdx: 0, x: 163, y: 96, layerOffset: 2 },
    ])
    expect(frames.slice(1, 6).map((frame) => frame.sound)).toEqual([
      undefined,
      'sound.enemy-magic',
      undefined,
      'sound.enemy-magic',
      undefined,
    ])
    expect(frames[1]).toMatchObject({
      durationMs: 60,
      waveAdd: 3,
      screenShake: true,
      screenShakeLevel: 4,
    })
    expect(frames[2]).toMatchObject({ screenShake: true, screenShakeLevel: 4 })
    expect(frames[3]?.screenShake).toBeUndefined()
    expect(frames.slice(4, 6).map((frame) => frame.screenShake)).toEqual([true, true])
    expect(frames[5]?.burnBg).toEqual([
      { sheet: 'magic', frameIdx: 0, x: 163, y: 96, layerOffset: 2 },
    ])
    expect(frames[6]).toMatchObject({
      damageNums: [{ target: { side: 'player', idx: 0 }, value: 13 }],
      fighters: [{ side: 'enemy', idx: 2, frame: 3 }],
    })
    expect(input).toEqual(before)
  })

  test('单目标缺坐标时采用敌方施法中心缺省，零波幅/无声音不制造屏幕效果', () => {
    const frames = buildEnemyCast({
      enemyIdx: 0,
      anim: { ...enemy, magic: { start: 5, count: 1 } },
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
      damageNums: [],
    })
    expect(frames).toHaveLength(3)
    expect(frames[1]?.overlays).toEqual([
      { sheet: 'magic', frameIdx: 0, x: 160, y: 130, layerOffset: 0 },
    ])
    expect(frames.filter((frame) => frame.sound || frame.waveAdd || frame.screenShake)).toEqual([])
    expect(frames[2]?.damageNums).toBeUndefined()
  })
})
