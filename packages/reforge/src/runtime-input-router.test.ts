import { expect, test } from 'vitest'
import { inputFixture } from './__tests__/runtime-frame-fixture.js'
import { routeRuntimeInput } from './runtime-input-router.js'

test('all 128 active-layer combinations give the complete frame to exactly the highest owner', () => {
  const flags = ['confirm', 'shop', 'reward', 'menu', 'dialogue', 'runner', 'hostile'] as const
  for (let mask = 0; mask < 128; mask++) {
    const f = inputFixture()
    flags.forEach((name, index) => {
      f.state[name] = !!(mask & (1 << index))
    })
    const keys = new Set(['Enter'])
    routeRuntimeInput(keys, 4321, f.ports)
    const byLayer = [
      [['yes']],
      [['shop', ['Enter']]],
      [['reward', ['Enter']]],
      [['menu', ['Enter']]],
      [['dialogue', 4321]],
      [],
      [],
    ]
    const owner = flags.findIndex((_, index) => (mask & (1 << index)) !== 0)
    const expected = owner === -1 ? [['interact']] : byLayer[owner]
    expect(f.events, `active mask ${mask}`).toEqual(expected)
    expect([...keys]).toEqual(['Enter'])
  }
})

test.each([
  [['ArrowUp', 'Enter', 'Escape', 'F5'], 'toggle'],
  [['ArrowLeft'], 'toggle'],
  [['ArrowDown'], 'toggle'],
  [['ArrowRight'], 'toggle'],
  [['Enter', 'Escape', 'F5'], 'yes'],
  [[' ', 'F5'], 'yes'],
  [['Escape', 'F5'], 'no'],
  [['F5'], undefined],
  [['F9'], undefined],
  [[], undefined],
] as const)('confirmation modal priorities for %j', (keys, event) => {
  const f = inputFixture()
  f.state.confirm = true
  routeRuntimeInput(new Set(keys), 99, f.ports)
  expect(f.events).toEqual(event ? [[event]] : [])
})

test.each([
  [['F5', 'F9', 'Escape', 'Enter'], 'save'],
  [['F9', 'Escape', 'Enter'], 'load'],
  [['Escape', 'Enter'], 'open'],
  [['Enter'], 'interact'],
  [[' '], 'interact'],
  [['x'], undefined],
] as const)('exploration priorities for %j', (keys, event) => {
  const f = inputFixture()
  routeRuntimeInput(new Set(keys), 123, f.ports)
  expect(f.events).toEqual(event ? [[event]] : [])
})

test('opening a menu or dialogue immediately blocks same-frame debug navigation', () => {
  const f = inputFixture()
  routeRuntimeInput(new Set(['Escape', ']']), 10, f.ports)
  expect(f.events).toEqual([['open']])
  f.state.menu = false
  f.events.length = 0
  f.ports.interact = () => {
    f.state.dialogue = true
    f.events.push(['interact'])
  }
  routeRuntimeInput(new Set(['Enter', ']']), 20, f.ports)
  expect(f.events).toEqual([['interact']])
})

test('debug navigation uses the same key set after exploration and permits both bracket directions', () => {
  for (const keys of [['F5', ']'], ['['], [']'], ['[', ']']]) {
    const f = inputFixture()
    const pressed = new Set(keys)
    routeRuntimeInput(pressed, 2, f.ports)
    expect(f.events).toEqual(keys.includes('F5') ? [['save'], ['scene', keys]] : [['scene', keys]])
    expect([...pressed]).toEqual(keys)
  }
})

test('closing a shop or reward consumes the key without exposing the layer beneath', () => {
  for (const owner of ['shop', 'reward'] as const) {
    const f = inputFixture()
    f.state[owner] = true
    f.state.menu = true
    f.ports[owner === 'shop' ? 'consumeShop' : 'consumeReward'] = () => {
      f.state[owner] = false
      f.events.push([owner])
      return true
    }
    routeRuntimeInput(new Set(['Enter', 'Escape', ']']), 0, f.ports)
    expect(f.events).toEqual([[owner]])
  }
})

test('dialogue ignores save, escape and debug keys and receives real rather than gameplay time', () => {
  const f = inputFixture()
  f.state.dialogue = true
  routeRuntimeInput(new Set(['Escape', 'F5', 'F9', ']']), 9000, f.ports)
  expect(f.events).toEqual([])
  routeRuntimeInput(new Set([' ']), 9100, f.ports)
  expect(f.events).toEqual([['dialogue', 9100]])
})

test('quick save is available exactly where the manual-save menu can open, across all active layers', () => {
  const flags = ['confirm', 'shop', 'reward', 'menu', 'dialogue', 'runner', 'hostile'] as const
  for (let mask = 0; mask < 128; mask++) {
    const quick = inputFixture(),
      manual = inputFixture()
    flags.forEach((name, index) => {
      quick.state[name] = manual.state[name] = !!(mask & (1 << index))
    })
    routeRuntimeInput(new Set(['F5']), 0, quick.ports)
    routeRuntimeInput(new Set(['Escape']), 0, manual.ports)
    expect(
      quick.events.some(([event]) => event === 'save'),
      `quick save with active mask ${mask}`,
    ).toBe(mask === 0)
    expect(
      manual.events.some(([event]) => event === 'open'),
      `manual save with active mask ${mask}`,
    ).toBe(mask === 0)
  }
})

test('菜单层原样接收完整按键集合,路由器不预滤也不旁路派发任何键', () => {
  const f = inputFixture()
  f.state.menu = true
  const keys = ['ArrowUp', 'Escape', 'F5', 'x']
  routeRuntimeInput(new Set(keys), 77, f.ports)
  // 方向/取消/快速存档键在菜单帧内归菜单自己解释;路由器不得过滤集合或触发 save/open。
  expect(f.events).toEqual([['menu', keys]])

  const single = inputFixture()
  single.state.menu = true
  routeRuntimeInput(new Set(['[']), 78, single.ports)
  // 调试导航键在菜单帧同样只进菜单,不再触发 changeDebugScene。
  expect(single.events).toEqual([['menu', ['[']]])
})
