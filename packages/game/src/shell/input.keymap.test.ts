import { describe, expect, it } from 'vitest'
import { codeToAbstractKey } from './input.js'

describe('physical-key mapping', () => {
  it('方向键映射', () => {
    expect(codeToAbstractKey('ArrowUp')).toBe('Up')
    expect(codeToAbstractKey('ArrowDown')).toBe('Down')
    expect(codeToAbstractKey('ArrowLeft')).toBe('Left')
    expect(codeToAbstractKey('ArrowRight')).toBe('Right')
  })

  // user 2026-05-31 决策"以原版为准":WASD 还原 sdlpal input.c:84-90 原义,**不再**当方向键。
  it('WASD = sdlpal 原义(input.c:84-90),不是方向', () => {
    expect(codeToAbstractKey('KeyW')).toBe('ThrowItem') // input.c:87
    expect(codeToAbstractKey('KeyA')).toBe('Auto') // input.c:84
    expect(codeToAbstractKey('KeyS')).toBe('Status') // input.c:90
    expect(codeToAbstractKey('KeyD')).toBe('Defend') // input.c:85
  })

  it('确认 / 菜单(sdlpal input.c:66-74 真值)', () => {
    expect(codeToAbstractKey('Space')).toBe('Confirm')
    expect(codeToAbstractKey('Enter')).toBe('Confirm')
    expect(codeToAbstractKey('NumpadEnter')).toBe('Confirm')
    expect(codeToAbstractKey('ControlLeft')).toBe('Confirm')
    expect(codeToAbstractKey('Escape')).toBe('Menu')
    expect(codeToAbstractKey('AltLeft')).toBe('Menu')
    expect(codeToAbstractKey('AltRight')).toBe('Menu')
    expect(codeToAbstractKey('Insert')).toBe('Menu')
    expect(codeToAbstractKey('Numpad0')).toBe('Menu')
    expect(codeToAbstractKey('KeyM')).toBe('Menu') // KeyM = 本项目 dev 追加(sdlpal 键表无 m→Menu)
  })

  it('Numpad 方向键(sdlpal input.c:58-65)', () => {
    expect(codeToAbstractKey('Numpad8')).toBe('Up')
    expect(codeToAbstractKey('Numpad2')).toBe('Down')
    expect(codeToAbstractKey('Numpad4')).toBe('Left')
    expect(codeToAbstractKey('Numpad6')).toBe('Right')
  })

  it('翻页 / Home/End(sdlpal input.c:75-82)', () => {
    expect(codeToAbstractKey('PageUp')).toBe('PgUp')
    expect(codeToAbstractKey('Numpad9')).toBe('PgUp')
    expect(codeToAbstractKey('PageDown')).toBe('PgDn')
    expect(codeToAbstractKey('Numpad3')).toBe('PgDn')
    expect(codeToAbstractKey('Home')).toBe('Home')
    expect(codeToAbstractKey('Numpad7')).toBe('Home')
    expect(codeToAbstractKey('End')).toBe('End')
    expect(codeToAbstractKey('Numpad1')).toBe('End')
  })

  it('战斗 / 大世界专用键(sdlpal input.c:83-90)', () => {
    expect(codeToAbstractKey('KeyR')).toBe('Repeat') // input.c:83
    expect(codeToAbstractKey('KeyA')).toBe('Auto') // input.c:84
    expect(codeToAbstractKey('KeyD')).toBe('Defend') // input.c:85
    expect(codeToAbstractKey('KeyE')).toBe('UseItem') // input.c:86
    expect(codeToAbstractKey('KeyW')).toBe('ThrowItem') // input.c:87
    expect(codeToAbstractKey('KeyQ')).toBe('Flee') // input.c:88
    expect(codeToAbstractKey('KeyF')).toBe('Force') // input.c:89
    expect(codeToAbstractKey('KeyS')).toBe('Status') // input.c:90
  })

  it('未知键 → null', () => {
    expect(codeToAbstractKey('KeyZ')).toBeNull()
  })

  it('ControlRight 不是确认键', () => {
    expect(codeToAbstractKey('ControlRight')).toBeNull()
  })
})
