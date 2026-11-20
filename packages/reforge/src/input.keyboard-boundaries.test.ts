// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest'
import { Keyboard } from './input.js'

let hostFrame: HTMLIFrameElement | undefined

afterEach(() => {
  hostFrame?.remove()
  hostFrame = undefined
})

function keyboardHost() {
  hostFrame = document.createElement('iframe')
  document.body.append(hostFrame)
  const target = hostFrame.contentWindow
  if (!target) throw new Error('Keyboard tests require a window')

  const keyboard = new Keyboard(target)
  const dispatch = (type: 'keydown' | 'keyup', init: KeyboardEventInit) => {
    const event = new KeyboardEvent(type, { cancelable: true, ...init })
    target.dispatchEvent(event)
    return event
  }
  return {
    keyboard,
    press: (init: KeyboardEventInit) => dispatch('keydown', init),
    release: (key: string) => dispatch('keyup', { key }),
  }
}

describe('keydown→consumePressed→仍 held→keyup 边沿合同', () => {
  test('按下→边沿消费一次→held 保持→释放才消失；返回 Set 与内部状态不别名', () => {
    const host = keyboardHost()
    const kb = host.keyboard
    host.press({ key: 'ArrowRight' })
    expect(kb.isDown('ArrowRight')).toBe(true)
    const pressed = kb.consumePressed()
    expect([...pressed]).toEqual(['ArrowRight'])
    // 边沿只消费一次；held 不受 consumePressed 影响
    expect(kb.consumePressed().size).toBe(0)
    expect(kb.isDown('ArrowRight')).toBe(true)
    // 返回的 Set 不是内部状态别名：清空它不影响后续边沿
    pressed.clear()
    host.press({ key: 'ArrowDown' })
    expect([...kb.consumePressed()]).toEqual(['ArrowDown'])
    host.release('ArrowRight')
    host.release('ArrowDown')
    expect(kb.isDown('ArrowRight')).toBe(false)
    expect(kb.isDown('ArrowDown')).toBe(false)
  })
  test('非 repeat 多键各只消费一次；repeat 不再产生边沿', () => {
    const host = keyboardHost()
    const kb = host.keyboard
    host.press({ key: 'ArrowUp' })
    host.press({ key: 'Enter' })
    host.press({ key: 'ArrowUp', repeat: true }) // OS 连发：无新边沿
    expect([...kb.consumePressed()].sort()).toEqual(['ArrowUp', 'Enter'])
    expect(kb.consumePressed().size).toBe(0)
    expect(kb.isDown('ArrowUp')).toBe(true)
    expect(kb.isDown('Enter')).toBe(true)
  })
})

describe('lastDownOf 后按优先与 repeat 不重排', () => {
  const ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
  test('交错方向键取最后首次按下；repeat 不把旧键顶回；释放后回退剩余键', () => {
    const host = keyboardHost()
    const kb = host.keyboard
    host.press({ key: 'ArrowUp' })
    expect(kb.lastDownOf(ARROWS)).toBe('ArrowUp')
    host.press({ key: 'ArrowRight' })
    expect(kb.lastDownOf(ARROWS)).toBe('ArrowRight') // 后按优先
    host.press({ key: 'ArrowUp', repeat: true }) // 连发不重排
    expect(kb.lastDownOf(ARROWS)).toBe('ArrowRight')
    host.release('ArrowRight')
    expect(kb.lastDownOf(ARROWS)).toBe('ArrowUp') // 释放后回退剩余
    host.release('ArrowUp')
    expect(kb.lastDownOf(ARROWS)).toBeUndefined()
  })
  test('非方向键不参与命中；多键释放顺序不影响最后剩余者', () => {
    const host = keyboardHost()
    const kb = host.keyboard
    host.press({ key: 'a' })
    expect(kb.lastDownOf(ARROWS)).toBeUndefined()
    host.press({ key: 'ArrowDown' })
    host.press({ key: 'ArrowLeft' })
    host.release('ArrowLeft')
    expect(kb.lastDownOf(ARROWS)).toBe('ArrowDown')
  })
})

describe('preventDefault 域与真实事件语义', () => {
  test.each([
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    ' ',
    'Enter',
    'F5',
    'F9',
  ])('可取消真实事件 %s → defaultPrevented', (key) => {
    const { keyboard, press } = keyboardHost()
    expect(press({ key }).defaultPrevented).toBe(true)
    expect(keyboard.consumePressed()).toEqual(new Set([key]))
  })
  test('普通键不阻止默认；不可取消事件 preventDefault 为 no-op（真实事件语义）', () => {
    const { press } = keyboardHost()
    expect(press({ key: 'a' }).defaultPrevented).toBe(false)
    expect(press({ key: 'ArrowDown', cancelable: false }).defaultPrevented).toBe(false)
  })
})
