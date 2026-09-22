/**
 * TEST-NONVISUAL-COVERAGE-2 W2-A A04：script-world 页/钩子/游标机械与条件求值（wave2）。
 * 既有 script-world.test.ts 已证 page selection 原子清理/inherit/单槽/state-map handoff；
 * 本文件补冻结定位中的 assertFlowCursor 拒绝、initialFlowCursor 两态、assertEntityTarget
 * 不匹配 throw、trigger 激活、hook 解析/选择、evalAuthorCondition 全条件臂（含
 * currentScene 缺查询 throw、chance 随机注入、query 委托与 atLeast 缺省）。
 */
import { emptyWorldScriptState } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  assertFlowCursor,
  evalAuthorCondition,
  initialFlowCursor,
  resolveEntityBehavior,
  resolveSceneHook,
  selectEntityBehavior,
} from './script-world.js'
import type { BaseSceneDef } from '@type-pal/content'

const stagesFlow = {
  kind: 'stages',
  initial: 's-a',
  stages: [
    { id: 's-a', label: 'A', commands: [] },
    { id: 's-b', label: 'B', commands: [] },
  ],
} as never

const machineFlow = {
  kind: 'stateMachine',
  machine: { id: 'm1', initial: 'idle', states: { idle: {}, run: {} } },
} as never

const entity = {
  id: 'npc1',
  pages: [
    { id: 'p1', trigger: 't-1' },
    { id: 'p2', trigger: 't-2' },
  ],
  behaviors: {
    trigger: {
      't-1': { label: '一', order: 1, flow: stagesFlow },
      't-2': { label: '二', order: 2, flow: machineFlow },
    },
  },
} as never

const address = { scene: 's1', entity: 'npc1' }

describe('W2-A A04 flow 游标机械', () => {
  test('initialFlowCursor：stages → stage 游标；stateMachine → state 游标带 machine id', () => {
    expect(initialFlowCursor(stagesFlow)).toEqual({ kind: 'stage', stage: 's-a' })
    expect(initialFlowCursor(machineFlow)).toEqual({
      kind: 'state',
      machine: 'm1',
      state: 'idle',
    })
  })

  test('assertFlowCursor 四类拒绝：错 kind/不存在 stage/机器不匹配/不存在 state', () => {
    expect(() => assertFlowCursor(stagesFlow, { kind: 'state', machine: 'm', state: 'x' })).toThrow(
      'stages flow 不能使用 state cursor',
    )
    expect(() => assertFlowCursor(stagesFlow, { kind: 'stage', stage: 'nope' })).toThrow(
      'stage cursor 不存在 nope',
    )
    expect(() => assertFlowCursor(machineFlow, { kind: 'stage', stage: 's-a' })).toThrow(
      'stateMachine flow 不能使用 stage cursor',
    )
    expect(() =>
      assertFlowCursor(machineFlow, { kind: 'state', machine: 'other', state: 'idle' }),
    ).toThrow('machine cursor other 不匹配 m1')
    expect(() =>
      assertFlowCursor(machineFlow, { kind: 'state', machine: 'm1', state: 'void' }),
    ).toThrow('state cursor 不存在 void')
    // 合法游标不抛
    expect(() => assertFlowCursor(stagesFlow, { kind: 'stage', stage: 's-b' })).not.toThrow()
    expect(() =>
      assertFlowCursor(machineFlow, { kind: 'state', machine: 'm1', state: 'run' }),
    ).not.toThrow()
  })

  test('resolveEntityBehavior：target 与定义不匹配即 throw（assertEntityTarget）', () => {
    const world = emptyWorldScriptState()
    expect(() =>
      resolveEntityBehavior(entity, world, { scene: 's1', entity: 'OTHER' }, 'trigger'),
    ).toThrow('entity address OTHER 与定义 npc1 不匹配')
  })

  test('selectEntityBehavior use 不存在行为即 throw；合法 use 提交并保留另一通道', () => {
    const world = emptyWorldScriptState()
    expect(() =>
      selectEntityBehavior(world, entity, address, 'trigger', { kind: 'use', value: 't-x' }),
    ).toThrow('npc1: trigger behavior 不存在 t-x')
    const committed = selectEntityBehavior(world, entity, address, 'trigger', {
      kind: 'use',
      value: 't-2',
    })
    expect(committed).toBe(true)
    const resolved = resolveEntityBehavior(entity, world, address, 'trigger')
    expect(resolved?.behaviorId).toBe('t-2')
    expect(resolved?.cursor).toEqual({ kind: 'state', machine: 'm1', state: 'idle' }) // 初始游标随行为
  })
})

describe('W2-A A04 场景钩子解析', () => {
  const scene = {
    id: 's1',
    mapId: 'map.root',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [],
    hooks: {
      onEnter: { initial: 'h-1', variants: { 'h-1': { label: '进', order: 1, flow: stagesFlow } } },
    },
  } as unknown as BaseSceneDef

  test('resolveSceneHook 默认 initial 变体；禁用后 undefined', () => {
    const world = emptyWorldScriptState()
    expect(resolveSceneHook(scene, world, 'onEnter')?.hookId).toBe('h-1')
    expect(resolveSceneHook(scene, world, 'onTeleport')).toBeUndefined() // 未声明通道
    // 禁用选择（WorldSceneHookSlot 直接挂在 scenes[s1].onEnter）
    const worldOff = emptyWorldScriptState()
    worldOff.behaviors.scenes = {
      s1: { onEnter: { selection: { kind: 'disabled' } } } as never,
    }
    expect(resolveSceneHook(scene, worldOff, 'onEnter')).toBeUndefined()
  })
})

describe('W2-A A04 evalAuthorCondition 全条件臂', () => {
  const baseWorld = () => {
    const w = emptyWorldScriptState()
    w.flags.open = true
    w.vars.gold = 12
    w.entityState.s1 = { npc1: 4 }
    return w
  }
  const query = (calls: string[]) => ({
    hasItem: (id: string, at: number) => {
      calls.push(`hasItem:${id}:${at}`)
      return id === 'key'
    },
    ownsItem: (id: string) => {
      calls.push('owns')
      return id === 'trophy'
    },
    itemEquipped: (id: string) => {
      calls.push('equipped')
      return id === 'sword'
    },
    allFullHp: () => {
      calls.push('hp')
      return true
    },
    money: () => 250,
    inParty: (id: string) => id === 'li',
    entityInScene: (t: { scene: string }) => {
      calls.push('inScene')
      return t.scene === 's1'
    },
    facingEntity: (t: { entity: string }, range: number) => {
      calls.push(`facing:${t.entity}:${range}`)
      return t.entity === 'boss'
    },
  })

  test('flag/var 六算子/缺省值/entityState 命中与缺席', () => {
    const world = baseWorld()
    const args = { world, query: query([]) } as never
    expect(evalAuthorCondition({ kind: 'flag', flag: 'open', is: true } as never, args)).toBe(true)
    expect(evalAuthorCondition({ kind: 'flag', flag: 'open', is: false } as never, args)).toBe(
      false,
    )
    expect(evalAuthorCondition({ kind: 'flag', flag: 'none', is: false } as never, args)).toBe(true) // 缺省 false
    for (const [op, value, expected] of [
      ['==', 12, true],
      ['==', 11, false],
      ['!=', 11, true],
      ['>=', 12, true],
      ['>=', 13, false],
      ['<=', 12, true],
      ['<=', 11, false],
      ['>', 11, true],
      ['>', 12, false],
      ['<', 13, true],
      ['<', 12, false],
    ] as const)
      expect(evalAuthorCondition({ kind: 'var', var: 'gold', op, value } as never, args)).toBe(
        expected,
      )
    expect(
      evalAuthorCondition({ kind: 'var', var: 'missing', op: '==', value: 0 } as never, args),
    ).toBe(true) // 缺省 0
    expect(
      evalAuthorCondition({ kind: 'entityState', target: address, is: 4 } as never, args),
    ).toBe(true)
    expect(Number.isNaN(4)).toBe(false)
    expect(
      evalAuthorCondition(
        { kind: 'entityState', target: { scene: 's9', entity: 'x' }, is: 0 } as never,
        args,
      ),
    ).toBe(false) // 缺席 → NaN !== 0
  })

  test('currentScene：命中/不命中/缺查询 throw', () => {
    const world = baseWorld()
    const withScene = { world, currentSceneId: () => 's1', query: query([]) } as never
    expect(evalAuthorCondition({ kind: 'currentScene', scene: 's1' } as never, withScene)).toBe(
      true,
    )
    expect(evalAuthorCondition({ kind: 'currentScene', scene: 's2' } as never, withScene)).toBe(
      false,
    )
    expect(() =>
      evalAuthorCondition(
        { kind: 'currentScene', scene: 's1' } as never,
        {
          world,
          query: query([]),
        } as never,
      ),
    ).toThrow('currentScene 条件缺当前场景查询')
  })

  test('chance 注入随机/实体查询委托与 atLeast 缺省', () => {
    const world = baseWorld()
    const calls: string[] = []
    const args = { world, query: query(calls), random: () => 0.5 } as never
    expect(evalAuthorCondition({ kind: 'chance', percent: 50 } as never, args)).toBe(false) // 0.5*100=50，50<50 为 false（严格小于）
    expect(evalAuthorCondition({ kind: 'chance', percent: 51 } as never, args)).toBe(true)
    expect(evalAuthorCondition({ kind: 'chance', percent: 49 } as never, args)).toBe(false)
    expect(evalAuthorCondition({ kind: 'entityInScene', target: address } as never, args)).toBe(
      true,
    )
    expect(
      evalAuthorCondition(
        { kind: 'facingEntity', target: { scene: 's1', entity: 'boss' } } as never,
        args,
      ),
    ).toBe(true)
    expect(calls).toContain('facing:boss:0') // range 缺省 0
    expect(evalAuthorCondition({ kind: 'hasItem', itemId: 'key' } as never, args)).toBe(true)
    expect(calls).toContain('hasItem:key:1') // atLeast 缺省 1
    expect(evalAuthorCondition({ kind: 'ownsItem', itemId: 'trophy' } as never, args)).toBe(true)
    expect(evalAuthorCondition({ kind: 'itemEquipped', itemId: 'sword' } as never, args)).toBe(true)
    expect(evalAuthorCondition({ kind: 'allFullHp' } as never, args)).toBe(true)
    expect(evalAuthorCondition({ kind: 'hasMoney', atLeast: 200 } as never, args)).toBe(true)
    expect(evalAuthorCondition({ kind: 'inParty', actorId: 'li' } as never, args)).toBe(true)
  })
})
