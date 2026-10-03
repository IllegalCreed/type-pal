import { emptyProjectedWorldScriptState, type ScriptCondition } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import { evalCondition, type ScriptHost } from './script-runner.js'

function query(): ScriptHost['query'] {
  return {
    hasItem: vi.fn((id: string, count: number) => id === 'herb' && count <= 2),
    ownsItem: vi.fn((id: string, count: number) => id === 'ring' && count <= 3),
    money: vi.fn(() => 30),
    inParty: vi.fn((id: string) => id === 'hero'),
    allFullHp: vi.fn(() => false),
    itemEquipped: vi.fn((id: string, count: number) => id === 'ring' && count <= 1),
    entityInScene: vi.fn((id: string) => id === 'npc'),
    entitiesNear: () => false,
    facingEntity: vi.fn((id: string, range: number) => id === 'npc' && range === 2),
    sceneId: vi.fn(() => 's001'),
  }
}

describe('当前编辑器预览 ScriptRunner 的组合条件读取', () => {
  test('六种数值比较精确使用同一世界变量；未登记变量只在当前投影按 0 读', () => {
    const world = emptyProjectedWorldScriptState()
    world.vars.score = 5
    const before = structuredClone(world)
    const q = query()
    const cases: Array<{ op: Extract<ScriptCondition, { kind: 'var' }>['op']; value: number }> = [
      { op: '==', value: 5 },
      { op: '!=', value: 4 },
      { op: '>=', value: 5 },
      { op: '<=', value: 5 },
      { op: '>', value: 4 },
      { op: '<', value: 6 },
    ]
    for (const entry of cases) {
      expect(evalCondition({ kind: 'var', var: 'score', ...entry }, world, q)).toBe(true)
    }
    expect(evalCondition({ kind: 'var', var: 'missing', op: '==', value: 0 }, world, q)).toBe(true)
    expect(world).toEqual(before)
  })

  test('场景/实体/朝向条件保留稳定身份与缺省距离；缺场景查询 fail-loud', () => {
    const world = emptyProjectedWorldScriptState()
    const q = query()
    expect(evalCondition({ kind: 'currentScene', scene: 's001' }, world, q)).toBe(true)
    expect(evalCondition({ kind: 'currentScene', scene: 's002' }, world, q)).toBe(false)
    expect(evalCondition({ kind: 'entityInScene', entity: 'npc' }, world, q)).toBe(true)
    expect(evalCondition({ kind: 'facingEntity', entity: 'npc', range: 2 }, world, q)).toBe(true)
    expect(evalCondition({ kind: 'facingEntity', entity: 'npc' }, world, q)).toBe(false)
    expect(q.facingEntity).toHaveBeenLastCalledWith('npc', 0)
    const { sceneId: _drop, ...withoutScene } = q
    expect(() =>
      evalCondition({ kind: 'currentScene', scene: 's001' }, world, withoutScene),
    ).toThrow('currentScene 条件缺当前场景查询')
  })

  test('装备、背包、拥有数、金钱、满血与队伍条件各调用自己的 live 查询而不串源', () => {
    const world = emptyProjectedWorldScriptState()
    const q = query()
    expect(evalCondition({ kind: 'hasItem', itemId: 'herb' }, world, q)).toBe(true)
    expect(evalCondition({ kind: 'ownsItem', itemId: 'ring', atLeast: 3 }, world, q)).toBe(true)
    expect(evalCondition({ kind: 'itemEquipped', itemId: 'ring' }, world, q)).toBe(true)
    expect(evalCondition({ kind: 'hasMoney', atLeast: 31 }, world, q)).toBe(false)
    expect(evalCondition({ kind: 'allFullHp' }, world, q)).toBe(false)
    expect(evalCondition({ kind: 'inParty', actorId: 'hero' }, world, q)).toBe(true)
    expect(q.hasItem).toHaveBeenCalledExactlyOnceWith('herb', 1)
    expect(q.ownsItem).toHaveBeenCalledExactlyOnceWith('ring', 3)
    expect(q.itemEquipped).toHaveBeenCalledExactlyOnceWith('ring', 1)
    expect(q.money).toHaveBeenCalledTimes(1)
    expect(q.allFullHp).toHaveBeenCalledTimes(1)
    expect(q.inParty).toHaveBeenCalledExactlyOnceWith('hero')
  })

  test('all/any/not 保持短路，未知实体状态不被 0 误认并可读取显式 0', () => {
    const world = emptyProjectedWorldScriptState()
    const q = query()
    world.flags.opened = false
    expect(evalCondition({ kind: 'entityState', entity: 'missing', is: 0 }, world, q)).toBe(false)
    world.entityState.npc = 0
    expect(evalCondition({ kind: 'entityState', entity: 'npc', is: 0 }, world, q)).toBe(true)
    expect(
      evalCondition(
        {
          kind: 'all',
          of: [
            { kind: 'flag', flag: 'opened', is: true },
            { kind: 'hasMoney', atLeast: 1 },
          ],
        },
        world,
        q,
      ),
    ).toBe(false)
    expect(q.money).not.toHaveBeenCalled()
    expect(
      evalCondition(
        {
          kind: 'any',
          of: [
            { kind: 'flag', flag: 'opened', is: false },
            { kind: 'hasMoney', atLeast: 999 },
          ],
        },
        world,
        q,
      ),
    ).toBe(true)
    expect(q.money).not.toHaveBeenCalled()
    expect(
      evalCondition({ kind: 'not', cond: { kind: 'flag', flag: 'opened', is: true } }, world, q),
    ).toBe(true)
  })
})
