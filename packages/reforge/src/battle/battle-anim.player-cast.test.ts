import type { PlayerFighterFrames } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { buildOffMagic, buildPlayerCast, type CastFxParams } from './battle-anim.js'

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
  placement: 'attackAll',
  xOffset: 2,
  yOffset: -3,
  speed: 0,
  fireDelay: 0,
  effectTimes: 0,
  shake: 0,
  wave: 0,
}

describe('玩家进攻法术的落点与收招', () => {
  test('前摇之后按顺序绘制群攻特效、结果数字、双目标受击和停留', () => {
    const frames = buildPlayerCast({
      casterFrames: pose,
      casterIdx: 0,
      casterPos: { x: 240, y: 170 },
      castEffectBase: 20,
      fireFrames: 1,
      fx: { ...fx, sound: 'sound.fire' },
      offensive: true,
      postTargets: [
        { idx: 0, pos: { x: 70, y: 140 } },
        { idx: 2, pos: { x: 160, y: 100 } },
      ],
      damageNums: [
        { target: { side: 'enemy', idx: 0 }, value: 12 },
        { target: { side: 'enemy', idx: 2 }, value: 18 },
      ],
    })
    expect(frames.slice(6, 16).map((frame) => frame.overlays?.[0]?.frameIdx)).toEqual([
      20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
    ])
    const fireStart = frames.findIndex((frame) => frame.overlays?.[0]?.sheet === 'magic')
    expect(frames[fireStart]).toMatchObject({
      sound: 'sound.fire',
      fighters: [{ side: 'player', idx: 0, frame: 6 }],
      overlays: [
        { sheet: 'magic', frameIdx: 0, x: 72, y: 137 },
        { sheet: 'magic', frameIdx: 0, x: 102, y: 107 },
        { sheet: 'magic', frameIdx: 0, x: 162, y: 97 },
      ],
    })
    const [result, ...recovery] = frames.slice(fireStart + 1)
    expect(result).toEqual({
      durationMs: 0,
      waveAdd: 0,
      revealEnemyConfusion: true,
      damageNums: [
        { target: { side: 'enemy', idx: 0 }, value: 12 },
        { target: { side: 'enemy', idx: 2 }, value: 18 },
      ],
    })
    expect(
      recovery
        .slice(0, 4)
        .map(({ fighters }) =>
          fighters?.map(({ idx, pos, colorShift }) => [idx, pos?.x, colorShift]),
        ),
    ).toEqual([
      [
        [0, 62, 0],
        [2, 152, 0],
      ],
      [
        [0, 66, 6],
        [2, 156, 6],
      ],
      [
        [0, 64, 0],
        [2, 154, 0],
      ],
      [
        [0, 70, 0],
        [2, 160, 0],
      ],
    ])
    expect(recovery.slice(4)).toEqual([{ durationMs: 200 }])
    expect(frames.filter(({ damageNums }) => damageNums)).toHaveLength(1)
  })

  test('四种正式法术落点各按自身规则和同一偏移定位；无 fire 帧返回空时间线', () => {
    const targetPos = { x: 91, y: 82 }
    const positions = (placement: CastFxParams['placement']) =>
      buildOffMagic({
        fireFrames: 1,
        fx: { ...fx, placement, sound: undefined },
        targetPos,
      })[0]?.overlays?.map((overlay) => [overlay.x, overlay.y])
    expect(positions('normal')).toEqual([[93, 79]])
    expect(positions('attackWhole')).toEqual([[122, 97]])
    expect(positions('attackField')).toEqual([[162, 197]])
    expect(positions('attackAll')).toEqual([
      [72, 137],
      [102, 107],
      [162, 97],
    ])
    expect(buildOffMagic({ fireFrames: 0, fx, targetPos })).toEqual([])
  })
})
