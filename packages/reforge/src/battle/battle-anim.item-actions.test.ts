import { describe, expect, test } from 'vitest'
import {
  finishRecordedAnimation,
  recordBattleAnimation,
} from '../__tests__/battle-workflows/animation-observer.js'
import { PLAYER_PROFILE } from '../__tests__/battle-workflows/catalog.js'
import { type BuildThrowItemInput, buildThrowItem, buildUseItem } from './battle-anim.js'

const PLAYER_FRAMES = PLAYER_PROFILE.frames
const casterPos = { x: 240, y: 170 }

describe('战斗用品和投掷的呈现', () => {
  test('使用物品:举物(-15,-7)frame5+音28 → 目标 colorShift 0..6..0 呼吸 → 复位(fight.c:2266)', () => {
    const frames = buildUseItem({
      casterFrames: PLAYER_FRAMES,
      casterIdx: 1,
      casterPos,
      targetIdxs: [1],
      itemName: '观音符',
      sound: 'sound.pal.028',
      gains: [{ idx: 1, value: 50, tone: 'yellow' }],
    })
    const { events, player } = recordBattleAnimation(frames)
    finishRecordedAnimation(player, 50)
    // 走近 = 原版通用位移形制:6 步线性插值 ×40ms、整数除法(合击聚拢
    // fight.c:3881-3890 同构;作者六轮对照原版收口 —— 非 ease/密帧/渲染平滑)
    const walk = events.filter((e) => /^f:player1@/.test(e))
    expect(walk).toEqual([
      'f:player1@237,168',
      'f:player1@235,167',
      'f:player1@232,166',
      'f:player1@230,165',
      'f:player1@227,164',
      'f:player1@225,163',
    ])
    expect(events).toContain('f:player1#5@225,163') // 到位举物姿(无渲染平滑标记)
    expect(events).toContain('snd:sound.pal.028') // 用品音(fight.c:2300)
    expect(events).toContain('f:player1c6') // 呼吸峰值
    expect(events).toContain('f:player1c0') // 降回
    expect(events).toContain('f:player1#0@240,170') // 归位帧**不带**平滑 = 瞬移直落
    expect(events.filter((e) => /^f:player1c\d$/.test(e))).toEqual(
      [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1, 0].map((shift) => `f:player1c${shift}`),
    )
    // The label, raised item pose and use sound must all be on the same frame.
    expect(frames.filter((frame) => frame.banner)).toEqual([
      {
        durationMs: 40,
        fighters: [
          { side: 'player', idx: 1, pos: { x: 225, y: 163 }, frame: 5 },
          { side: 'player', idx: 1, colorShift: 0 },
        ],
        banner: { text: '观音符', durationMs: 520 },
        sound: 'sound.pal.028',
      },
    ])
    // 先归位再从目标当前位置取数字锚点，且一次用药只出一次数字。
    const returnAt = events.indexOf('f:player1#0@240,170')
    expect(events.slice(returnAt)).toEqual(['f:player1#0@240,170', 'dmg:player1:50'])
    expect(events.filter((event) => event === 'dmg:player1:50')).toHaveLength(1)
  })

  test('投掷物品:零伤不弹数字；有伤时按目标显示且受术者姿态不变', () => {
    const poison = recordBattleAnimation(
      buildThrowItem({
        casterFrames: PLAYER_FRAMES,
        casterIdx: 0,
        casterPos,
        hits: [{ idx: 1, damage: 0 }],
      }),
    )
    finishRecordedAnimation(poison.player, 50)
    expect(poison.events.some((event) => event.startsWith('dmg:'))).toBe(false)

    const damage = recordBattleAnimation(
      buildThrowItem({
        casterFrames: PLAYER_FRAMES,
        casterIdx: 0,
        casterPos,
        sound: 'sound.pal.028',
        hits: [{ idx: 1, damage: 1000 }],
      }),
    )
    finishRecordedAnimation(damage.player, 50)
    expect(damage.events).toContain('dmg:enemy1:1000')
    expect(damage.events.filter((event) => event.startsWith('f:enemy'))).toEqual([])
  })

  test('投掷法术物品:投掷姿后复用 OffMagic，传递 special 层序，结果数字最后出现', () => {
    const input = {
      casterFrames: PLAYER_FRAMES,
      casterIdx: 0,
      casterPos,
      sound: 'sound.pal.028',
      presentation: {
        fireFrames: 3,
        fx: {
          placement: 'normal',
          xOffset: -12,
          yOffset: 0,
          layerOffset: 1,
          speed: -1,
          fireDelay: 0,
          effectTimes: 0,
          shake: 0,
          wave: 0,
          sound: 'sound.pal.157',
        },
        targetPos: { x: 100, y: 80 },
      },
      hits: [{ idx: 1, damage: 1000 }],
    } satisfies BuildThrowItemInput
    const frames = buildThrowItem(input)

    expect(frames[5]?.fighters).toEqual([{ side: 'player', idx: 0, frame: 5 }])
    expect(frames[6]?.fighters).toEqual([{ side: 'player', idx: 0, frame: 6 }])
    expect(frames[7]).toEqual({ durationMs: 40 })
    expect(frames.slice(8, 11).map((frame) => frame.overlays?.[0])).toEqual([
      { sheet: 'magic', frameIdx: 0, x: 88, y: 80, layerOffset: 1 },
      { sheet: 'magic', frameIdx: 1, x: 88, y: 80, layerOffset: 1 },
      { sheet: 'magic', frameIdx: 2, x: 88, y: 80, layerOffset: 1 },
    ])
    expect(frames[8]?.sound).toBe('sound.pal.157')
    expect(frames.slice(8, 11).some((frame) => frame.fighters?.length)).toBe(false)
    const damageNum = {
      target: { side: 'enemy', idx: 1 },
      value: 1000,
    }
    expect(frames[11]?.damageNum).toEqual(damageNum)

    const withoutFire = buildThrowItem({
      ...input,
      presentation: { ...input.presentation, fireFrames: 0 },
    })
    expect(withoutFire[7]?.damageNum).toEqual(damageNum)
  })

  test('无任何目标直接 fail-loud，不产出时间线', () => {
    expect(() =>
      buildThrowItem({ casterIdx: 0, casterFrames: PLAYER_FRAMES, casterPos, hits: [] }),
    ).toThrow('buildThrowItem: 至少需要一个目标')
  })

  test('两敌同时受击：各自独立伤害数字挂同一命中帧，零伤目标不产数字', () => {
    const frames = buildThrowItem({
      casterIdx: 0,
      casterFrames: PLAYER_FRAMES,
      casterPos,
      hits: [
        { idx: 0, damage: 12 },
        { idx: 1, damage: 0 },
        { idx: 2, damage: 7 },
      ],
    })
    const numbered = frames.filter((frame) => frame.damageNums)
    expect(numbered).toHaveLength(1)
    expect(numbered[0]?.damageNums).toEqual([
      { target: { side: 'enemy', idx: 0 }, value: 12 },
      { target: { side: 'enemy', idx: 2 }, value: 7 },
    ])
    const reset = frames[frames.length - 1]
    expect(reset?.fighters).toEqual([
      { side: 'player', idx: 0, frame: PLAYER_FRAMES.idle, pos: casterPos },
    ])
  })

  test('单目标正伤保持单数字形态（damageNum 而非 damageNums）', () => {
    const frames = buildThrowItem({
      casterIdx: 1,
      casterFrames: PLAYER_FRAMES,
      casterPos,
      hits: [{ idx: 2, damage: 9 }],
    })
    const numbered = frames.filter((frame) => frame.damageNum || frame.damageNums)
    expect(numbered).toHaveLength(1)
    expect(numbered[0]?.damageNum).toEqual({
      target: { side: 'enemy', idx: 2 },
      value: 9,
    })
    expect(numbered[0]?.damageNums).toBeUndefined()
  })
})
