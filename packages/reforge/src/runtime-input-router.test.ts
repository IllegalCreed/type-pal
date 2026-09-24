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
    const expected = f.state.confirm
      ? [['yes']]
      : f.state.shop
        ? [['shop', ['Enter']]]
        : f.state.reward
          ? [['reward', ['Enter']]]
          : f.state.menu
            ? [['menu', ['Enter']]]
            : f.state.dialogue
              ? [['dialogue', 4321]]
              : f.state.runner || f.state.hostile
                ? []
                : [['interact']]
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
  [['F5'], 'save'],
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
