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
  sound: 'sound.second-magic',
}

describe('当前召唤型施法与 OffMagic 特效落点', () => {
  test('召唤全队亮起→神将入场/定格→二次法术→敌受击→退场，二级音不重播', () => {
    const input = {
      casterFrames: pose,
      casterIdx: 1,
      casterPos: { x: 130, y: 140 },
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
    expect(frames).toHaveLength(28)
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
    expect(frames.slice(22, 26).map((frame) => frame.fighters?.[0]?.pos?.x)).toEqual([
      82, 86, 84, 90,
    ])
    expect(frames.slice(22, 26).map((frame) => frame.summonPhase)).toEqual([
      'hold',
      'hold',
      'hold',
      'hold',
    ])
    expect(frames[26]).toMatchObject({ summonPhase: 'out', durationMs: 1152 })
    expect(frames[27]).toMatchObject({
      damageNums: [{ target: { side: 'enemy', idx: 0 }, value: 43 }],
      fighters: [{ side: 'player', idx: 1, frame: 0, pos: { x: 130, y: 140 } }],
    })
    expect(input).toEqual(before)
  })

  test('召唤帧数为零不进入变亮和溶出；普通施法在 fireDelay 帧切姿势并保留音效', () => {
    const frames = buildPlayerCast({
      casterFrames: pose,
      casterIdx: 0,
      casterPos: { x: 120, y: 130 },
      castEffectBase: -1,
      fireFrames: 3,
      fx: { ...fx, placement: 'normal', fireDelay: 1 },
      summon: { frames: 0, frameTimeMs: 60, x: 150, y: 60 },
      targetPos: { x: 90, y: 80 },
      damageNums: [],
    })
    expect(frames).toHaveLength(11)
    expect(frames.every((frame) => frame.summonPhase === undefined)).toBe(true)
    expect(frames.filter((frame) => frame.sound).map((frame) => frame.sound)).toEqual([
      'sound.second-magic',
    ])
    expect(frames[8]?.fighters).toEqual([{ side: 'player', idx: 0, frame: 6 }])
    expect(frames[8]?.overlays).toEqual([
      { sheet: 'magic', frameIdx: 1, x: 92, y: 77, layerOffset: 0 },
    ])
    expect(frames.at(-1)?.damageNums).toBeUndefined()
  })

  test('非召唤施法先播十帧角色前摇，再让两名受伤敌人同步后震并于末帧结算', () => {
    const frames = buildPlayerCast({
      casterFrames: pose,
      casterIdx: 0,
      casterPos: { x: 120, y: 130 },
      castEffectBase: 20,
      fireFrames: 1,
      fx: { ...fx, placement: 'normal', sound: 'sound.fire' },
      targetPos: { x: 90, y: 80 },
      postTargets: [
        { idx: 0, pos: { x: 90, y: 80 } },
        { idx: 2, pos: { x: 150, y: 75 } },
      ],
      damageNums: [
        { target: { side: 'enemy', idx: 0 }, value: 12 },
        { target: { side: 'enemy', idx: 2 }, value: 18 },
      ],
    })
    expect(frames).toHaveLength(23)
    expect(frames.slice(6, 16).map((frame) => frame.overlays?.[0]?.frameIdx)).toEqual([
      20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
    ])
    expect(frames[17]).toMatchObject({
      sound: 'sound.fire',
      fighters: [{ side: 'player', idx: 0, frame: 6 }],
      overlays: [{ sheet: 'magic', frameIdx: 0, x: 92, y: 77 }],
    })
    expect(
      frames.slice(18, 22).map((frame) => frame.fighters?.map((fighter) => fighter.pos?.x)),
    ).toEqual([
      [82, 142],
      [86, 146],
      [84, 144],
      [90, 150],
    ])
    expect(
      frames.slice(18, 22).map((frame) => frame.fighters?.map((fighter) => fighter.colorShift)),
    ).toEqual([
      [0, 0],
      [6, 6],
      [0, 0],
      [0, 0],
    ])
    expect(frames[22]?.damageNums).toEqual([
      { target: { side: 'enemy', idx: 0 }, value: 12 },
      { target: { side: 'enemy', idx: 2 }, value: 18 },
    ])
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
