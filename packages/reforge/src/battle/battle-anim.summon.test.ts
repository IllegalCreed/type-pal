import type { PlayerFighterFrames } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { enemyProfile } from '../__tests__/battle-workflows/catalog.js'
import { buildEnemySummon, buildPlayerCast, type CastFxParams } from './battle-anim.js'

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
  sound: 'sound.second-magic',
}

describe('玩家和敌方召唤的演出阶段', () => {
  test('召唤的新敌从各自初始闲站计时，施法者在高亮保持期恢复闲站', () => {
    const input = {
      casterIdx: 1,
      spawns: [
        { idx: 0, idle: { start: 0, count: 4 }, idleTicksPerFrame: 3 },
        { idx: 2, idle: { start: 0, count: 4 }, idleTicksPerFrame: 1 },
      ],
      profile: enemyProfile('boss.magic'),
      sound: 'sound.summon',
    }
    const frames = buildEnemySummon(input)
    const arrival = frames.find(({ enemySummonFade }) => enemySummonFade?.phase === 'arrival')
    const restoreColor = frames.findIndex(
      ({ enemySummonFade }) => enemySummonFade?.phase === 'settle',
    )
    expect(frames[0]?.fighters).toMatchObject([{ idx: 1, frame: 2 }])
    expect(arrival).toMatchObject({
      sound: 'sound.summon',
      fighters: [
        { idx: 0, frame: 0, holdFrame: true, showSpawn: true, colorShift: 8 },
        { idx: 2, frame: 0, holdFrame: true, showSpawn: true, colorShift: 8 },
      ],
    })
    expect(frames[restoreColor - 3]?.enemySummonFade).toMatchObject({ phase: 'arrival', step: 72 })
    expect(frames.slice(restoreColor - 2, restoreColor)).toMatchObject([
      {
        durationMs: 40,
        fighters: [
          { idx: 0, frame: 0 },
          { idx: 2, frame: 0 },
          { idx: 1, frame: 0, holdFrame: true },
        ],
      },
      {
        durationMs: 40,
        fighters: [
          { idx: 0, frame: 0 },
          { idx: 2, frame: 1 },
          { idx: 1, holdFrame: false },
        ],
      },
    ])
    expect(frames[restoreColor]).toMatchObject({
      fighters: [
        { idx: 0, frame: 0, holdFrame: true, colorShift: 0 },
        { idx: 2, frame: 2, holdFrame: true, colorShift: 0 },
      ],
    })
  })

  test('召唤全队亮起→神将入场/定格→二次法术→敌受击→退场，二级音不重播', () => {
    const input = {
      casterFrames: pose,
      casterIdx: 1,
      casterPos: { x: 234, y: 170 },
      magicSound: 'sound.caster',
      castEffectBase: -1,
      fireFrames: 2,
      fx,
      summon: { frames: 3, frameTimeMs: 60, x: 160, y: 75, sound: 'sound.summon' },
      partyIdxs: [0, 1, 2],
      targetPos: { x: 90, y: 80 },
      postTargets: [{ idx: 0, pos: { x: 90, y: 80 } }],
      damageNums: [{ target: { side: 'enemy' as const, idx: 0 }, value: 43 }],
      keepEffect: true,
    }
    const before = structuredClone(input)
    const frames = buildPlayerCast(input)
    expect(frames).toHaveLength(29)
    expect(frames.filter((frame) => frame.sound).map((frame) => frame.sound)).toEqual([
      'sound.caster',
      'sound.summon',
    ])
    expect(frames[7]).toMatchObject({
      sound: 'sound.summon',
      fighters: [
        { side: 'player', idx: 0, colorShift: 1 },
        { side: 'player', idx: 1, colorShift: 1 },
        { side: 'player', idx: 2, colorShift: 1 },
      ],
    })
    expect(frames[16]?.fighters?.map((fighter) => fighter.colorShift)).toEqual([10, 10, 10])
    expect(frames[17]).toMatchObject({
      summonPhase: 'in',
      durationMs: 1152,
      overlays: [{ sheet: 'summon', frameIdx: 0, x: 160, y: 75 }],
    })
    expect(frames.slice(18, 20).map((frame) => frame.overlays?.[0]?.frameIdx)).toEqual([0, 1])
    expect(frames.slice(20, 22).map((frame) => frame.summonPhase)).toEqual(['hold', 'hold'])
    expect(frames.slice(20, 22).map((frame) => frame.overlays?.at(-1)?.frameIdx)).toEqual([2, 2])
    expect(frames[21]?.overlays?.slice(0, 3).map((overlay) => [overlay.x, overlay.y])).toEqual([
      [72, 137],
      [102, 107],
      [162, 97],
    ])
    expect(frames[21]?.burnBg?.map((overlay) => overlay.sheet)).toEqual(['magic', 'magic', 'magic'])
    expect(frames[22]).toMatchObject({
      damageNums: [{ target: { side: 'enemy', idx: 0 }, value: 43 }],
    })
    expect(frames.slice(23, 27).map((frame) => frame.fighters?.[0]?.pos?.x)).toEqual([
      82, 86, 84, 90,
    ])
    expect(frames.slice(23, 27).map((frame) => frame.summonPhase)).toEqual([
      'hold',
      'hold',
      'hold',
      'hold',
    ])
    expect(frames[27]).toMatchObject({ summonPhase: 'out', durationMs: 1152 })
    expect(frames.filter((frame) => frame.damageNums)).toHaveLength(1)
    expect(frames[28]).toMatchObject({
      fighters: [{ side: 'player', idx: 1, frame: 0, pos: { x: 234, y: 170 } }],
    })
    expect(input).toEqual(before)
  })
})
