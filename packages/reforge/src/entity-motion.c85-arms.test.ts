// TEST-COVERAGE85-GLM-REFORGE-1 — entity-motion.ts 输入验证与残留分支臂测试。
// 公开 planEntityMotion 纯函数;非法输入按 fail-loud 合同逐条区分。
import type { GridPos } from '@type-pal/content'
import { expect, test } from 'vitest'
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
