// TEST-COVERAGE85-GLM-REFORGE-1 — entity-motion.ts 输入验证与残留分支臂测试。
// 公开 planEntityMotion 纯函数;非法输入按 fail-loud 合同逐条区分。
import type { GridPos } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { motionActorKey, motionFootprintsOverlap, planEntityMotion } from './entity-motion.js'

const pos = (col: number, row: number, height = 0): GridPos => ({ col, row, height: height })

const actor = (id: string, at: GridPos) => ({
  actor: { kind: 'entity' as const, id },
  pos: at,
  facing: 'down' as const,
  footprints: [{ dcol: 0, drow: 0 }],
  hasBody: true,
  yieldable: true,
})

const intent = (
  id: string,
  from: GridPos,
  desired: GridPos,
  over: Record<string, unknown> = {},
) => ({
  actor: { kind: 'entity' as const, id },
  source: 'auto' as const,
  collision: 'dynamic' as const,
  from,
  desired,
  desiredFacing: 'down' as const,
  floating: false,
  epoch: 1,
  quantum: 1,
  allowSidestep: true,
  ...over,
})

const openTerrain = (): ((p: GridPos) => boolean) => () => false

test('非法快照臂:重复 actor 与空足迹各自 fail-loud', () => {
  expect(() =>
    planEntityMotion({
      tick: 0,
      actors: [actor('e1', pos(0, 0)), actor('e1', pos(1, 0))],
      intents: [],
      terrainBlocked: openTerrain(),
    }),
  ).toThrow('entity-motion: duplicate snapshot actor 1:e1')
  expect(() =>
    planEntityMotion({
      tick: 0,
      actors: [{ ...actor('e1', pos(0, 0)), footprints: [] }],
      intents: [],
      terrainBlocked: openTerrain(),
    }),
  ).toThrow('entity-motion: actor 1:e1 has no footprint')
})

test('非法意图臂:重复/缺 actor、过期原点、非法 quantum 与 epoch 各自 fail-loud', () => {
  const a = actor('e1', pos(0, 0))
  const base = { tick: 0, actors: [a], terrainBlocked: openTerrain() }
  expect(() =>
    planEntityMotion({
      ...base,
      intents: [intent('e1', pos(0, 0), pos(1, 0)), intent('e1', pos(0, 0), pos(2, 0))],
    }),
  ).toThrow('entity-motion: duplicate intent for 1:e1')
  expect(() =>
    planEntityMotion({ ...base, intents: [intent('ghost', pos(0, 0), pos(1, 0))] }),
  ).toThrow('entity-motion: intent references missing actor 1:ghost')
  expect(() =>
    planEntityMotion({ ...base, intents: [intent('e1', pos(5, 0), pos(1, 0))] }),
  ).toThrow('entity-motion: stale intent origin for 1:e1')
  expect(() =>
    planEntityMotion({
      ...base,
      intents: [intent('e1', pos(0, 0), pos(1, 0), { quantum: 0 })],
    }),
  ).toThrow('entity-motion: invalid quantum for 1:e1')
  expect(() =>
    planEntityMotion({
      ...base,
      intents: [intent('e1', pos(0, 0), pos(1, 0), { epoch: 1.5 })],
    }),
  ).toThrow('entity-motion: invalid command epoch for 1:e1')
})

test('非法侧杖臂:缺 actor、重复、非法 epoch 与越界时长各自 fail-loud', () => {
  const a = actor('e1', pos(0, 0))
  const base = { tick: 0, actors: [a], terrainBlocked: openTerrain() }
  const stick = (over: Record<string, unknown> = {}) => ({
    actor: { kind: 'entity' as const, id: 'e1' },
    epoch: 1,
    side: 'negative' as const,
    remainingEligibleTicks: 2,
    ...over,
  })
  expect(() =>
    planEntityMotion({
      ...base,
      intents: [intent('e1', pos(0, 0), pos(1, 0))],
      sideSticks: [{ ...stick(), actor: { kind: 'entity', id: 'ghost' } }],
    }),
  ).toThrow('entity-motion: side-stick references missing actor 1:ghost')
  expect(() =>
    planEntityMotion({
      ...base,
      intents: [intent('e1', pos(0, 0), pos(1, 0))],
      sideSticks: [stick(), stick()],
    }),
  ).toThrow('entity-motion: duplicate side-stick for 1:e1')
  expect(() =>
    planEntityMotion({
      ...base,
      intents: [intent('e1', pos(0, 0), pos(1, 0))],
      sideSticks: [stick({ epoch: 0.5 })],
    }),
  ).toThrow('entity-motion: invalid side-stick epoch for 1:e1')
  expect(() =>
    planEntityMotion({
      ...base,
      intents: [intent('e1', pos(0, 0), pos(1, 0))],
      sideSticks: [stick({ remainingEligibleTicks: 0 })],
    }),
  ).toThrow('entity-motion: invalid side-stick duration for 1:e1')
})

test('公平拍臂:同争用环的 fairnessTickForGroup 返回非整数即 fail-loud', () => {
  const party = {
    actor: { kind: 'party' as const },
    pos: pos(2, 2),
    facing: 'down' as const,
    footprints: [{ dcol: 0, drow: 0 }],
    hasBody: true,
    yieldable: true,
  }
  const a1 = actor('a', pos(0, 2))
  const a2 = actor('b', pos(4, 2))
  expect(() =>
    planEntityMotion({
      tick: 0,
      actors: [party, a1, a2],
      intents: [intent('a', pos(0, 2), pos(2, 2)), intent('b', pos(4, 2), pos(2, 2))],
      fairnessTickForGroup: () => 1.25,
      terrainBlocked: openTerrain(),
    }),
  ).toThrow('entity-motion: fairness tick must be a safe integer')
})

test('原地意图臂:desired 等于 from 的动态意图零位移成功且朝向回落 desiredFacing', () => {
  const a = actor('e1', pos(3, 3))
  const plan = planEntityMotion({
    tick: 0,
    actors: [a],
    intents: [intent('e1', pos(3, 3), pos(3, 3), { desiredFacing: 'up' as const })],
    terrainBlocked: openTerrain(),
  })
  expect(plan.outcomes[0]).toMatchObject({
    kind: 'moved',
    from: pos(3, 3),
    to: pos(3, 3),
    facing: 'up',
    actualDirection: 'up',
  })
})

test('悬浮臂:floating 意图无视全图地形封锁照常移动', () => {
  const a = actor('e1', pos(1, 1))
  const plan = planEntityMotion({
    tick: 0,
    actors: [a],
    intents: [intent('e1', pos(1, 1), pos(2, 1), { floating: true })],
    terrainBlocked: () => true,
  })
  expect(plan.outcomes[0]).toMatchObject({ kind: 'moved', to: pos(2, 1) })
})

test('移动键臂:party 键恒为 0:party 且排序先于实体键', () => {
  expect(motionActorKey({ kind: 'party' })).toBe('0:party')
  expect(motionActorKey({ kind: 'entity', id: 'aaa' })).toBe('1:aaa')
  expect(motionActorKey({ kind: 'party' }) < motionActorKey({ kind: 'entity', id: 'a' })).toBe(true)
})

test('足迹重叠臂:精确相邻不重叠,任何分量靠近一格即重叠;高度不参与', () => {
  expect(motionFootprintsOverlap(pos(0, 0), pos(1, 0))).toBe(false)
  expect(motionFootprintsOverlap(pos(0, 0), pos(0.5, 0))).toBe(true)
  expect(motionFootprintsOverlap(pos(0, 0), pos(1, 1))).toBe(false)
  expect(motionFootprintsOverlap(pos(0, 0, 5), pos(0.5, 0, 0))).toBe(true)
})

describe('C85 r6 让位与持杖多拍臂（真实运行时纪律:拍→结果→回喂 nextSideSticks）', () => {
  const body = (id: string, at: GridPos) => ({
    actor: { kind: 'entity' as const, id },
    pos: at,
    facing: 'down' as const,
    footprints: [{ dcol: 0, drow: 0 }],
    hasBody: true,
    yieldable: true,
  })
  const party = (at: GridPos) => ({
    actor: { kind: 'party' as const },
    pos: at,
    facing: 'down' as const,
    footprints: [{ dcol: 0, drow: 0 }],
    hasBody: true,
    yieldable: true,
  })
  const standIntent = (id: string, at: GridPos) => ({
    actor: { kind: 'entity' as const, id },
    source: 'auto' as const,
    collision: 'dynamic' as const,
    from: at,
    desired: at,
    desiredFacing: 'down' as const,
    floating: false,
    epoch: 1,
    quantum: 1,
    allowSidestep: true,
  })

  test('party 绕行回落臂:站立让位者无法侧踏让出时,party 自身 side-only 绕行并产生持杖', () => {
    // 让位者被强制 side-only,但其侧踏候选与 party 冲突未被采纳
    // → everyBlockerYielded=false → 回落 party side-only(实体侧踏臂 + 持杖生成臂)
    const plan = planEntityMotion({
      tick: 0,
      actors: [party(pos(1, 2)), body('npc-yield', pos(2, 2))],
      intents: [
        {
          actor: { kind: 'party' as const },
          source: 'script' as const,
          collision: 'dynamic' as const,
          from: pos(1, 2),
          desired: pos(2, 2),
          desiredFacing: 'right' as const,
          floating: false,
          epoch: 1,
          quantum: 1,
          allowSidestep: true,
        },
        standIntent('npc-yield', pos(2, 2)),
      ],
      terrainBlocked: openTerrain(),
    })
    const partyOutcome = plan.outcomes.find((o) => o.actor.kind === 'party')
    if (!partyOutcome || partyOutcome.kind !== 'sidestepped' || !('to' in partyOutcome))
      throw new Error(`party 应 sidestepped 并带终点,实际 ${JSON.stringify(partyOutcome)}`)
    expect(partyOutcome.kind).toBe('sidestepped')
    // 不进 npc 格,侧向绕行:col 保持 1,row 偏移 ±1,高度不变 —— 逐字段显式匹配
    expect(partyOutcome.to).toEqual({ col: 1, row: 3, height: 0 })
    // 让位者原地不动(主候选零位移被接受),不产生让位侧踏
    const npcOutcome = plan.outcomes.find((o) => o.actor.kind === 'entity')
    expect(npcOutcome).toMatchObject({ kind: 'moved' })
    // party 的绕行持杖入下一拍
    expect(plan.nextSideSticks).toHaveLength(1)
    expect(plan.nextSideSticks[0]).toMatchObject({
      actor: { kind: 'party' },
      epoch: 1,
      remainingEligibleTicks: 3,
    })
  })

  test('持杖多拍臂:回喂 party nextSideSticks 后继续同侧贴边并衰减剩余拍数', () => {
    const partyIntent = {
      actor: { kind: 'party' as const },
      source: 'script' as const,
      collision: 'dynamic' as const,
      from: pos(1, 2),
      desired: pos(2, 2),
      desiredFacing: 'right' as const,
      floating: false,
      epoch: 1,
      quantum: 1,
      allowSidestep: true,
    }
    const tick1 = planEntityMotion({
      tick: 0,
      actors: [party(pos(1, 2)), body('npc-yield', pos(2, 2))],
      intents: [partyIntent, standIntent('npc-yield', pos(2, 2))],
      terrainBlocked: openTerrain(),
    })
    const stick = tick1.nextSideSticks[0]
    if (!stick) throw new Error('expected side stick after fallback sidestep')
    const movedParty = tick1.outcomes.find((o) => o.actor.kind === 'party')
    if (!movedParty || !('to' in movedParty)) throw new Error('party did not sidestep')
    // 拍 2:party 已在侧格,目标仍是 npc 后方;回喂持杖(同 epoch 同侧)
    const tick2 = planEntityMotion({
      tick: 1,
      actors: [
        { ...party(movedParty.to), facing: movedParty.facing },
        body('npc-yield', pos(2, 2)),
      ],
      intents: [{ ...partyIntent, from: movedParty.to }, standIntent('npc-yield', pos(2, 2))],
      sideSticks: [stick],
      terrainBlocked: openTerrain(),
    })
    const nextStick = tick2.nextSideSticks.find((st) => st.actor.kind === 'party')
    expect(nextStick?.side).toBe(stick.side)
    expect(nextStick?.remainingEligibleTicks).toBeLessThan(stick.remainingEligibleTicks)
  })

  test('绕行受限臂:party 侧踏候选全被地形拦死时回落 blocked 并给出地形拒绝', () => {
    const npcAt = pos(2, 2)
    // party 目标格与侧踏去向(1,1)/(1,3) 全部地形封锁
    const plan = planEntityMotion({
      tick: 0,
      actors: [party(pos(1, 2)), body('npc-boxed', npcAt)],
      intents: [
        {
          actor: { kind: 'party' as const },
          source: 'script' as const,
          collision: 'dynamic' as const,
          from: pos(1, 2),
          desired: pos(2, 2),
          desiredFacing: 'right' as const,
          floating: false,
          epoch: 1,
          quantum: 1,
          allowSidestep: true,
        },
        standIntent('npc-boxed', npcAt),
      ],
      terrainBlocked: (p) => p.row === 2 || p.col !== 1,
    })
    const partyOutcome = plan.outcomes.find((o) => o.actor.kind === 'party')
    expect(partyOutcome).toMatchObject({ kind: 'blocked' })
    expect(plan.nextSideSticks).toHaveLength(0)
  })
})
