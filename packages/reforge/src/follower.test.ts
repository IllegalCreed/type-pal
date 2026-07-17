import { describe, expect, test } from 'vitest'
import {
  computeFollowerPos,
  type FollowerPosState,
  pushTrail,
  seedFormationTrail,
  type TrailEntry,
} from './follower.js'

const g = (col: number, row: number) => ({ col, row, height: 0 })
const walkable = () => true

/** 造一条直线行走轨迹:队长在 head,沿 dir 反向铺 n 个历史格(trail[0]=最新)。 */
function straightTrail(
  head: { col: number; row: number },
  dir: 'left' | 'right' | 'up' | 'down',
  n = 6,
): TrailEntry[] {
  const back = {
    left: { c: 1, r: 0 },
    right: { c: -1, r: 0 },
    up: { c: 0, r: 1 },
    down: { c: 0, r: -1 },
  }[dir]
  return Array.from({ length: n }, (_, i) => ({
    pos: g(head.col + back.c * i, head.row + back.r * i),
    dir,
  }))
}

function state(trail: TrailEntry[], walking = true): FollowerPosState {
  return { party: { ...trail[0]!.pos }, trail, walking, frozenOffset: [] }
}

describe('computeFollowerPos —— 间距校准(phase-1 live 实测:m1=队长后3格 m2=(2,1))', () => {
  // 真值表:跑一阶段(?skip-intro&dev-party=0,1,2)live 采样,4 方向稳态偏移(相对队长)。
  // ⚠ 基点 = trail[2](非 [1]):原版 1 平铺 tile = reforge 2 菱形格,slot 1 会跟太近(作者报)。
  const TRUTH: Array<['left' | 'right' | 'up' | 'down', [number, number], [number, number]]> = [
    ['left', [3, 0], [2, 1]],
    ['right', [-3, 0], [-2, 1]],
    ['up', [0, 3], [1, 2]],
    ['down', [0, -3], [1, -2]],
  ]
  for (const [dir, m1, m2] of TRUTH) {
    test(`走 ${dir}:m1 rel=(${m1}) m2 rel=(${m2})`, () => {
      const s = state(straightTrail(g(10, 10), dir))
      const p1 = computeFollowerPos(s, 1, walkable)!
      const p2 = computeFollowerPos(s, 2, walkable)!
      expect([p1.pos.col - 10, p1.pos.row - 10]).toEqual(m1)
      expect([p2.pos.col - 10, p2.pos.row - 10]).toEqual(m2)
    })
  }

  test('朝向源 = 基点+1 槽(比位置晚一步转,原版 quirk)', () => {
    // 拐弯:最新 3 步向下,更早向左 → trail[3].dir = left(基点+1)
    const trail: TrailEntry[] = [
      { pos: g(10, 12), dir: 'down' },
      { pos: g(10, 11), dir: 'down' },
      { pos: g(10, 10), dir: 'down' },
      { pos: g(11, 10), dir: 'left' },
      { pos: g(12, 10), dir: 'left' },
    ]
    const p = computeFollowerPos(state(trail), 1, walkable)!
    expect(p.dir).toBe('left') // 位置基点已进拐角段,朝向仍是上一段
  })

  test('偏移位撞墙 → 回退基点格(避障收拢)', () => {
    const s = state(straightTrail(g(10, 10), 'left'))
    const base = s.trail[2]!.pos
    const p1 = computeFollowerPos(s, 1, (c, r) => !(c === base.col + 1 && r === base.row))!
    expect(p1.pos).toEqual(base)
  })

  test('not-walking + 冻结快照:位置 = 队长 + frozenOffset(演出/骑乘期锁死)', () => {
    const s = state(straightTrail(g(10, 10), 'left'), false)
    s.frozenOffset[1] = { dcol: 2, drow: 0, dir: 'left' }
    const p = computeFollowerPos(s, 1, walkable)!
    expect(p.pos).toEqual(g(12, 10))
  })

  test('pushTrail 离开方向语义:回写旧头 dir;同格不记(原地转身)', () => {
    const trail: TrailEntry[] = []
    pushTrail(trail, g(10, 10), 'right')
    pushTrail(trail, g(11, 10), 'right')
    pushTrail(trail, g(11, 10), 'up') // 同格 → 不记且不回写
    expect(trail.length).toBe(2)
    expect(trail[0]!.dir).toBe('right')
    pushTrail(trail, g(11, 9), 'up') // 真步:旧头(11,10)回写离开方向 up
    expect(trail[1]!.dir).toBe('up')
    expect(trail[0]!.pos).toEqual(g(11, 9))
  })

  test('拐弯甩尾(8字实测钉死):拐角格记新方向 → m1 甩到拐角外侧再回落', () => {
    // 队长向右(col+1)走到拐角 (13,10),再向下(row+1)走 2 步。
    // 原版逐行实测:队长离拐角 2 步时,m1 = 拐角 + 新方向背后偏移 = 甩出点(非路径格)。
    const trail: TrailEntry[] = []
    for (let c = 8; c <= 13; c++) pushTrail(trail, g(c, 10), 'right')
    pushTrail(trail, g(13, 11), 'down')
    pushTrail(trail, g(13, 12), 'down')
    const s: FollowerPosState = { party: g(13, 12), trail, walking: true, frozenOffset: [] }
    const p1 = computeFollowerPos(s, 1, () => true)!
    // base = trail[2] = 拐角 (13,10),dir 已回写为离开方向 down → 偏移 (0,-1) → 甩出点 (13,9)
    expect(p1.pos).toEqual(g(13, 9))
  })

  test('walking 捕获冻结快照;trail<=1 返回 null', () => {
    const s = state(straightTrail(g(10, 10), 'left'))
    computeFollowerPos(s, 1, walkable)
    expect(s.frozenOffset[1]).toEqual({ dcol: 3, drow: 0, dir: 'left' })
    expect(computeFollowerPos(state([{ pos: g(0, 0), dir: 'down' }]), 1, walkable)).toBeNull()
  })
})

describe('seedFormationTrail —— 0x46 / 场景出生立即铺开队形', () => {
  const cases: Array<['left' | 'right' | 'up' | 'down', [number, number]]> = [
    ['left', [1, 0]],
    ['right', [-1, 0]],
    ['up', [0, 1]],
    ['down', [0, -1]],
  ]

  for (const [facing, back] of cases) {
    test(`${facing}:每槽向身后铺一步，静止时两名队员无需移动即可分开`, () => {
      const trail = seedFormationTrail(g(10, 10), facing)
      expect(trail).toHaveLength(6)
      expect(trail[1]?.pos).toEqual(g(10 + back[0], 10 + back[1]))
      expect(trail.every((entry) => entry.dir === facing)).toBe(true)

      const s = state(trail, false)
      const first = computeFollowerPos(s, 1, walkable)
      const second = computeFollowerPos(s, 2, walkable)
      expect(first?.pos).toEqual(trail[1]?.pos)
      expect(second?.pos).toEqual(trail[2]?.pos)
      expect(first?.pos).not.toEqual(second?.pos)
      expect(first?.pos).not.toEqual(s.party)
    })
  }
})
