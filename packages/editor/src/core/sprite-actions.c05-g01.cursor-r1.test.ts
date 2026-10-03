/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C05-G01：core/sprite-actions.ts 公共合同新轴。
 * 排重：sprite-actions.test.ts / sprite-actions.wave2.test.ts 已证 order→label→id 三级回退、
 * 缺省 order 垫底、首个空闲 action-N 后缀、actor/prop/zone 默认目标解析。本文件只补
 * 排序比较器的非字典序细节、index 与 order 值解耦、返回值与入参的引用同一性、
 * 后缀空洞/非数字占用以及默认目标的“sprite 身份而非列表位置”选择。
 * 所有 SpriteDef/EntityDef 先过 content 的 validateSprites/validateActors（合法输入）。
 */
import {
  type ActorDef,
  type EntityDef,
  type SpriteActionDef,
  type SpriteDef,
  validateActors,
  validateSprites,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  defaultActionTargetForEntity,
  nextSpriteActionId,
  sortedSpriteActions,
} from './sprite-actions.js'

function action(label: string, order?: number): SpriteActionDef {
  return {
    label,
    ...(order === undefined ? {} : { order }),
    steps: [{ frame: 0, durationMs: 40 }],
  }
}

function sprite(id: string, poses?: Record<string, SpriteActionDef>): SpriteDef {
  const value: SpriteDef = {
    id,
    asset: 'asset.c05',
    label: id,
    layout: { kind: 'static' },
    ...(poses ? { poses } : {}),
  }
  validateSprites([value])
  return value
}

describe('C05-G01 sprite-actions 排序与默认目标', () => {
  test('C05-G01-01 index 是排序后的连续位置，与 order 数值大小无关', () => {
    const input = sprite('s', {
      far: action('远', 90),
      near: action('近', 5),
      mid: action('中', 40),
    })
    const sorted = sortedSpriteActions(input)
    expect(sorted.map(({ id, index }) => [id, index])).toEqual([
      ['near', 0],
      ['mid', 1],
      ['far', 2],
    ])
  })

  test('C05-G01-02 order=0 与缺省 order 不等价：显式 0 排在缺省之前，即使标签更靠后', () => {
    const input = sprite('s', {
      none: action('A-缺省'),
      zero: action('Z-零', 0),
    })
    expect(sortedSpriteActions(input).map(({ id }) => id)).toEqual(['zero', 'none'])
  })

  test('C05-G01-03 返回的 action 与入参 poses 条目是同一引用（不复制、不改写）', () => {
    const input = sprite('s', { a: action('甲', 0), b: action('乙', 1) })
    const sorted = sortedSpriteActions(input)
    expect(sorted[0]!.action).toBe(input.poses!.a)
    expect(sorted[1]!.action).toBe(input.poses!.b)
    expect(Object.keys(input.poses!)).toEqual(['a', 'b'])
  })

  test('C05-G01-04 标签比较使用 localeCompare：大小写与 id 数字串按字符序而非数值序', () => {
    const input = sprite('s', {
      a10: action('same', 1),
      a2: action('same', 1),
      a1: action('same', 1),
    })
    // 同 order、同 label，落到 id.localeCompare：'a1' < 'a10' < 'a2'（非自然数序）。
    expect(sortedSpriteActions(input).map(({ id }) => id)).toEqual(['a1', 'a10', 'a2'])
    const labels = sprite('s', {
      x: action('beta', 1),
      y: action('Alpha', 1),
      z: action('alpha', 1),
    })
    // ICU 序：alpha < Alpha < beta；若退化为码点序则会是 Alpha, alpha, beta。
    expect(sortedSpriteActions(labels).map(({ id }) => id)).toEqual(['z', 'y', 'x'])
  })

  test('C05-G01-05 空 poses 容器与缺省 poses 同样得到空序列', () => {
    expect(sortedSpriteActions(sprite('s', {}))).toEqual([])
    expect(sortedSpriteActions(sprite('s'))).toEqual([])
  })

  test('C05-G01-06 nextSpriteActionId：基础 id 空闲时不看后缀占用；后缀空洞取最小空位', () => {
    expect(nextSpriteActionId(sprite('s', { 'action-2': action('二') }))).toBe('action')
    expect(
      nextSpriteActionId(sprite('s', { 'action-2': action('二'), 'action-3': action('三') })),
    ).toBe('action')
    expect(
      nextSpriteActionId(
        sprite('s', {
          action: action('一'),
          'action-3': action('三'),
          'action-4': action('四'),
        }),
      ),
    ).toBe('action-2')
    expect(
      nextSpriteActionId(
        sprite('s', {
          action: action('一'),
          'action-2': action('二'),
          'action-x': action('非数字'),
        }),
      ),
    ).toBe('action-3')
  })

  test('C05-G01-07 nextSpriteActionId 连续落盘 4 次得到互异的 action、action-2、action-3、action-4', () => {
    let poses: Record<string, SpriteActionDef> = {}
    const issued: string[] = []
    for (let round = 0; round < 4; round += 1) {
      const id = nextSpriteActionId(sprite('s', poses))
      issued.push(id)
      poses = { ...poses, [id]: action(`动作 ${round + 1}`, round) }
    }
    expect(issued).toEqual(['action', 'action-2', 'action-3', 'action-4'])
  })

  test('C05-G01-08 默认目标按实体的 sprite 身份取其自身首动作，而非列表第一个有动作的精灵', () => {
    const decoy = sprite('decoy', { first: action('诱饵', 0) })
    const target = sprite('target', { b: action('乙', 1), a: action('甲', 0) })
    const entity: EntityDef = { id: 'p', sprite: 'target', pos: { col: 1, row: 1, height: 0 } }
    const result = defaultActionTargetForEntity(entity, {}, [decoy, target])
    expect(result?.sprite).toBe(target)
    expect(result?.action).toEqual({ id: 'a', action: target.poses!.a, index: 0 })
  })

  test('C05-G01-09 prop 指向不存在的精灵 id 或精灵无动作时返回 undefined', () => {
    const withActions = sprite('has', { a: action('甲', 0) })
    const bare = sprite('bare')
    const dangling: EntityDef = { id: 'p1', sprite: 'ghost', pos: { col: 0, row: 0, height: 0 } }
    const onBare: EntityDef = { id: 'p2', sprite: 'bare', pos: { col: 0, row: 0, height: 0 } }
    expect(defaultActionTargetForEntity(dangling, {}, [withActions, bare])).toBeUndefined()
    expect(defaultActionTargetForEntity(onBare, {}, [withActions, bare])).toBeUndefined()
    expect(defaultActionTargetForEntity(onBare, {}, [bare, { ...bare, poses: {} }])).toBeUndefined()
  })

  test('C05-G01-10 actor 实体经 actors 表换精灵：同一 actor id 指向不同精灵时各取各的首动作', () => {
    const left = sprite('left', { l: action('左', 0) })
    const right = sprite('right', { r: action('右', 0) })
    const actors: Record<string, ActorDef> = {
      hero: { id: 'hero', name: '主角', spriteId: 'left' },
      other: { id: 'other', name: '旁人', spriteId: 'right' },
    }
    validateActors(Object.values(actors))
    const at = (actor: string): EntityDef => ({
      id: `inst-${actor}`,
      actor,
      pos: { col: 0, row: 0, height: 0 },
    })
    expect(defaultActionTargetForEntity(at('hero'), actors, [left, right])?.action.id).toBe('l')
    expect(defaultActionTargetForEntity(at('other'), actors, [left, right])?.action.id).toBe('r')
    expect(defaultActionTargetForEntity(at('hero'), actors, [right])).toBeUndefined()
  })
})
