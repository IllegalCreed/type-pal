import { describe, expect, test } from 'vitest'
import { resolveSceneFacing } from './scene-transition.js'

describe('resolveSceneFacing', () => {
  test('普通跨场景未显式指定时继承上一场景朝向', () => {
    expect(resolveSceneFacing(undefined, 'left', 'down')).toBe('left')
    expect(resolveSceneFacing(undefined, 'right', 'up')).toBe('right')
  })

  test('loadScene 显式朝向优先于继承值', () => {
    expect(resolveSceneFacing('up', 'left', 'down')).toBe('up')
  })

  test('首次启动没有继承值时使用入口默认朝向', () => {
    expect(resolveSceneFacing(undefined, undefined, 'down')).toBe('down')
  })
})
