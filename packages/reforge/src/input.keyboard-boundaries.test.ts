/**
 * TEST-REFORGE-RUNTIME-CONTRACTS-1 A1-A3：真实键盘事件合同（input.ts Keyboard）。
 * 用真实 Event 构造 keydown/keyup（cancelable 才能核 preventDefault 真语义）；
 * 不伪造 defaultPrevented、不测移动/碰撞结果。
 * 测试宿主为 node：Keyboard 构造参数是 Window，这里以 EventTarget 充当事件源（类型桥仅限测试）。
 */
import { describe, expect, test } from 'vitest'
import { Keyboard } from './input.js'

type KeyInit = { key: string; repeat?: boolean; cancelable?: boolean }

/** 真实 Event 派发到 EventTarget；Keyboard 只用 addEventListener/key/repeat/preventDefault。 */
function keyboardHost(): {
  target: EventTarget
  press: (init: KeyInit) => void
  release: (key: string) => void
} {
  const target = new EventTarget()
  const fire = (type: 'keydown' | 'keyup', init: KeyInit): void => {
    const event = new Event(type, { cancelable: init.cancelable ?? true })
    Object.defineProperty(event, 'key', { value: init.key })
    Object.defineProperty(event, 'repeat', { value: init.repeat ?? false })
    target.dispatchEvent(event)
  }
  return {
    target,
    press: (init) => fire('keydown', init),
    release: (key) => fire('keyup', { key }),
  }
}

/** 测试宿主无 window：以 EventTarget 满足 Keyboard 所需的事件源面（类型桥，见文件头）。 */
function makeKeyboard(target: EventTarget): Keyboard {
  return new Keyboard(target as unknown as Window)
}

describe('A1 keydown→consumePressed→仍 held→keyup 边沿合同', () => {
  test('按下→边沿消费一次→held 保持→释放才消失；返回 Set 与内部状态不别名', () => {
    const host = keyboardHost()
    const kb = makeKeyboard(host.target)
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
    const kb = makeKeyboard(host.target)
    host.press({ key: 'ArrowUp' })
    host.press({ key: 'Enter' })
    host.press({ key: 'ArrowUp', repeat: true }) // OS 连发：无新边沿
    expect([...kb.consumePressed()].sort()).toEqual(['ArrowUp', 'Enter'])
    expect(kb.consumePressed().size).toBe(0)
    expect(kb.isDown('ArrowUp')).toBe(true)
    expect(kb.isDown('Enter')).toBe(true)
  })
})

describe('A2 lastDownOf 后按优先与 repeat 不重排', () => {
  const ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
  test('交错方向键取最后首次按下；repeat 不把旧键顶回；释放后回退剩余键', () => {
    const host = keyboardHost()
    const kb = makeKeyboard(host.target)
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
    const kb = makeKeyboard(host.target)
    host.press({ key: 'a' })
    expect(kb.lastDownOf(ARROWS)).toBeUndefined()
    host.press({ key: 'ArrowDown' })
    host.press({ key: 'ArrowLeft' })
    host.release('ArrowLeft')
    expect(kb.lastDownOf(ARROWS)).toBe('ArrowDown')
  })
})

describe('A3 preventDefault 域与真实事件语义', () => {
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
    const host = keyboardHost()
    const kb = makeKeyboard(host.target)
    host.press({ key })
    expect(kb.consumePressed().size).toBe(1) // 先证真实事件确实到达
    const events: boolean[] = []
    host.target.addEventListener('keydown', (e) => {
      events.push(e.defaultPrevented)
    })
    host.press({ key })
    expect(events).toEqual([true]) // preventDefault 在真实 cancelable 事件上生效
  })
  test('普通键不阻止默认；不可取消事件 preventDefault 为 no-op（真实事件语义）', () => {
    const host = keyboardHost()
    makeKeyboard(host.target)
    const observed: boolean[] = []
    host.target.addEventListener('keydown', (e) => {
      observed.push(e.defaultPrevented)
    })
    host.press({ key: 'a' })
    host.press({ key: 'ArrowDown', cancelable: false }) // 浏览器层面不可取消
    expect(observed).toEqual([false, false])
  })
})
