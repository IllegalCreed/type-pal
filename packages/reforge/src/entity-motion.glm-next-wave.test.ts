/**
 * TEST-GLM-NEW-G-1 G04：entity-motion 输入契约与公平钟残差（纯模块，无 DOM/IO）。
 * 旧证（entity-motion.test.ts 四个 describe）已证几何/仲裁/让位/side-stick 主链与
 * duplicate/stale/时长=4 守卫；本文件只补旧题未覆盖的公开输入契约臂与公平钟边界
 * （不裁决碰撞/走位语义，遇争议即停）：
 *   1) planEntityMotion 输入守卫尾：非安全整数 tick、非法 quantum/epoch、
 *      intent/side-stick 引用缺失 actor、side-stick 时长 <1（entity-motion.ts:1041、
 *      :422-425、:419、:441-449）；
 *   2) MotionFairnessClock 批次记账、离场成员记录剪除与 clear 复位（:123-147）。
 */
import type { GridPos } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  type MotionActor,
  MotionFairnessClock,
  type MotionIntent,
  type MotionSnapshotActor,
  motionActorKey,
  planEntityMotion,
  type SideStick,
} from './entity-motion.js'

const foot = [{ dcol: 0, drow: 0 }] as const
const open = () => false

function pos(col: number, row = 0, height = 0): GridPos {
  return { col, row, height }
}

function entity(id: string): MotionActor {
  return { kind: 'entity', id }
}

function snapshot(id: string, at: GridPos): MotionSnapshotActor {
  return {
    actor: entity(id),
    pos: at,
    facing: 'down',
    footprints: foot,
    hasBody: true,
    yieldable: true,
  }
}

function party(at: GridPos): MotionSnapshotActor {
  return {
    actor: { kind: 'party' },
    pos: at,
    facing: 'down',
    footprints: foot,
    hasBody: true,
    yieldable: false,
  }
}

function intent(
  id: string,
  from: GridPos,
  desired: GridPos,
  options: Partial<MotionIntent> = {},
): MotionIntent {
  return {
    actor: entity(id),
    source: 'auto',
    collision: 'dynamic',
    from,
    desired,
    desiredFacing: 'right',
    floating: false,
    epoch: 1,
    quantum: Math.max(Math.abs(desired.col - from.col), Math.abs(desired.row - from.row)),
    allowSidestep: false,
    ...options,
  }
}

function stick(id: string, overrides: Partial<Omit<SideStick, 'actor'>> = {}): SideStick {
  return { actor: entity(id), epoch: 1, side: 'negative', remainingEligibleTicks: 2, ...overrides }
}

describe('G04 entity-motion 输入契约残差', () => {
  test('非安全整数 tick 在计划入口 fail-loud（含 NaN/Infinity/小数）', () => {
    const input = {
      actors: [party(pos(0))],
      intents: [],
      terrainBlocked: open,
    }
    for (const tick of [1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53]) {
      expect(() => planEntityMotion({ ...input, tick })).toThrowError(
        'entity-motion: tick must be a safe integer',
      )
    }
    expect(() => planEntityMotion({ ...input, tick: 0 })).not.toThrow()
  })

  test('intent 的 quantum/epoch 守卫与缺失 actor 引用逐臂拒绝', () => {
    const actors = [snapshot('mover', pos(0))]
    const base = { tick: 1, actors, terrainBlocked: open }
    const badQuantum = intent('mover', pos(0), pos(1), { quantum: 0 })
    expect(() => planEntityMotion({ ...base, intents: [badQuantum] })).toThrowError(
      'entity-motion: invalid quantum for 1:mover',
    )
    const nanQuantum = intent('mover', pos(0), pos(1), { quantum: Number.NaN })
    expect(() => planEntityMotion({ ...base, intents: [nanQuantum] })).toThrowError(
      /invalid quantum/,
    )
    const badEpoch = intent('mover', pos(0), pos(1), { epoch: 1.5 })
    expect(() => planEntityMotion({ ...base, intents: [badEpoch] })).toThrowError(
      'entity-motion: invalid command epoch for 1:mover',
    )
    // intent 指向不存在的 actor：合法 actor 列表的单点缺失。
    const ghost = intent('ghost', pos(5), pos(6))
    expect(() =>
      planEntityMotion({ tick: 1, actors, intents: [ghost], terrainBlocked: open }),
    ).toThrowError('entity-motion: intent references missing actor 1:ghost')
  })

  test('side-stick 守卫尾：缺失 actor / 非安全整数 epoch / 时长 <1 与 ≥4', () => {
    const actors = [snapshot('holder', pos(0))]
    const base = { tick: 1, actors, intents: [], terrainBlocked: open }
    expect(() => planEntityMotion({ ...base, sideSticks: [stick('ghost')] })).toThrowError(
      'entity-motion: side-stick references missing actor 1:ghost',
    )
    expect(() =>
      planEntityMotion({ ...base, sideSticks: [stick('holder', { epoch: Number.NaN })] }),
    ).toThrowError('entity-motion: invalid side-stick epoch for 1:holder')
    for (const duration of [0, -1]) {
      expect(() =>
        planEntityMotion({
          ...base,
          sideSticks: [stick('holder', { remainingEligibleTicks: duration })],
        }),
      ).toThrowError('entity-motion: invalid side-stick duration for 1:holder')
    }
    // 对照：时长 1..3 是现行合法窗口（4 即 SIDE_STICK_TICKS 越界臂，旧题已证）。
    for (const duration of [1, 2, 3]) {
      expect(() =>
        planEntityMotion({
          ...base,
          sideSticks: [stick('holder', { remainingEligibleTicks: duration })],
        }),
      ).not.toThrow()
    }
  })

  test('MotionFairnessClock：批次记账、离场成员剪除、clear 复位到 0', () => {
    const clock = new MotionFairnessClock()
    const a = entity('a')
    const b = entity('b')
    const c = entity('c')
    // 同一批内同组成员多次 tick 只记一批。
    clock.beginBatch()
    expect(
      clock.tickForGroup([
        { actor: a, epoch: 1 },
        { actor: b, epoch: 1 },
      ]),
    ).toBe(0)
    expect(
      clock.tickForGroup([
        { actor: b, epoch: 1 },
        { actor: a, epoch: 1 },
      ]),
    ).toBe(0) // 顺序无关
    clock.commitBatch(new Set([motionActorKey(a), motionActorKey(b)]))
    clock.beginBatch()
    expect(
      clock.tickForGroup([
        { actor: a, epoch: 1 },
        { actor: b, epoch: 1 },
      ]),
    ).toBe(1) // 记账 +1
    // c 离场（从未 live）→ 含 c 的组记录在 commit 时被剪除。
    expect(clock.tickForGroup([{ actor: c, epoch: 1 }])).toBe(0)
    clock.commitBatch(new Set([motionActorKey(a), motionActorKey(b)]))
    clock.beginBatch()
    expect(clock.tickForGroup([{ actor: c, epoch: 1 }])).toBe(0) // 剪除后从 0 重来
    clock.commitBatch(new Set([motionActorKey(a)]))
    // clear 复位：a/b 组记账清零。
    clock.clear()
    clock.beginBatch()
    expect(
      clock.tickForGroup([
        { actor: a, epoch: 1 },
        { actor: b, epoch: 1 },
      ]),
    ).toBe(0)
    clock.commitBatch(new Set([motionActorKey(a), motionActorKey(b)]))
  })
})
