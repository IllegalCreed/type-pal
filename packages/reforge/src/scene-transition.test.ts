import { describe, expect, test } from 'vitest'
import { resolveSceneFacing, resolveSceneSpawn } from './scene-transition.js'

describe('resolveSceneFacing', () => {
  test('普通跨场景未显式指定时继承上一场景朝向', () => {
    expect(resolveSceneFacing(undefined, undefined, 'left', 'down')).toBe('left')
    expect(resolveSceneFacing(undefined, undefined, 'right', 'up')).toBe('right')
  })

  test('loadScene 显式朝向优先于继承值', () => {
    expect(resolveSceneFacing('up', 'right', 'left', 'down')).toBe('up')
  })

  test('命名落点朝向优先于继承值', () => {
    expect(resolveSceneFacing(undefined, 'right', 'left', 'down')).toBe('right')
  })

  test('首次启动没有继承值时使用入口默认朝向', () => {
    expect(resolveSceneFacing(undefined, undefined, undefined, 'down')).toBe('down')
  })
})

describe('resolveSceneSpawn', () => {
  const scene = {
    entry: { pos: { col: 10, row: 20, height: 0 }, facing: 'down' as const },
    entries: {
      west: { pos: { col: 1, row: 2, height: 0 }, facing: 'up' as const },
      east: { pos: { col: 8, row: 9, height: 1 } },
    },
  }

  test('同场景两扇门分别解析到稳定命名落点', () => {
    expect(resolveSceneSpawn('s001', scene, { entryId: 'west', inheritFacing: 'left' })).toEqual({
      pos: { col: 1, row: 2, height: 0 },
      facing: 'up',
    })
    expect(resolveSceneSpawn('s001', scene, { entryId: 'east', inheritFacing: 'right' })).toEqual({
      pos: { col: 8, row: 9, height: 1 },
      facing: 'right',
    })
  })

  test('显式坐标/朝向覆盖；默认模式继承朝向', () => {
    expect(
      resolveSceneSpawn('s001', scene, {
        pos: { col: 4, row: 5, height: 2 },
        facing: 'left',
        inheritFacing: 'right',
      }),
    ).toEqual({ pos: { col: 4, row: 5, height: 2 }, facing: 'left' })
    expect(resolveSceneSpawn('s001', scene, { inheritFacing: 'right' })).toEqual({
      pos: { col: 10, row: 20, height: 0 },
      facing: 'right',
    })
  })

  test('缺失命名落点与 entryId+pos 均 fail-loud', () => {
    expect(() => resolveSceneSpawn('s001', scene, { entryId: 'missing' })).toThrow(
      /找不到命名落点 missing/,
    )
    expect(() =>
      resolveSceneSpawn('s001', scene, {
        entryId: 'west',
        pos: { col: 0, row: 0, height: 0 },
      } as unknown as NonNullable<Parameters<typeof resolveSceneSpawn>[2]>),
    ).toThrow(/entryId 与 pos 不能同时存在/)
  })
})
