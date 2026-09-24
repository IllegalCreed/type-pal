import { expect, test, vi } from 'vitest'
import { frameFixture } from './__tests__/runtime-frame-fixture.js'
import { RuntimeFrameSession } from './runtime-frame-session.js'

test('frame phases preserve synchronous order and route once after world advancement', () => {
  const f = frameFixture()
  f.state.pressed.add('Enter')
  f.tick(100)
  expect(f.events).toEqual([
    ['activate'],
    ['resume'],
    ['fade', 100],
    ['dialogue'],
    ['keys'],
    ['hostiles', 0],
    ['moves', 0, ['Enter']],
    ['mounts'],
    ['lifecycle', false, false],
    ['actions', 0],
    ['battle', 0, ['Enter'], 100],
    ['input', ['Enter'], 100],
    ['world'],
  ])
  expect(f.session.now).toBe(100)
})

test('battle ownership is sampled after world advancement and consumes rendering and input', () => {
  const f = frameFixture()
  f.ports.advanceMoves = () => {
    f.events.push(['moves'])
    f.state.battle = true
  }
  f.tick(100)
  expect(f.events.map((e) => e[0])).toEqual([
    'activate',
    'resume',
    'fade',
    'dialogue',
    'keys',
    'hostiles',
    'moves',
    'mounts',
    'lifecycle',
    'actions',
    'battle',
  ])
})

test('modal activation freezes the current frame while key consumption and world presentation continue', () => {
  const f = frameFixture()
  f.tick(100)
  f.events.length = 0
  f.ports.activateConfirm = () => {
    f.events.push(['activate'])
    f.state.frozen = true
  }
  f.tick(9100)
  expect(f.session.now).toBe(100)
  expect(f.events).toEqual([
    ['activate'],
    ['resume'],
    ['dialogue'],
    ['keys'],
    ['clearTicks'],
    ['battle', 0, [], 100],
    ['input', [], 9100],
    ['world'],
  ])
})

test('pause consumes wall time without catch-up and ordinary long frames stay capped', () => {
  const f = frameFixture()
  f.tick(100)
  f.state.frozen = true
  f.tick(10000)
  expect(f.session.now).toBe(100)
  f.state.frozen = false
  f.events.length = 0
  f.tick(10010)
  expect(f.session.now).toBe(110)
  expect(f.events).toContainEqual(['moves', 10, []])
  f.tick(30000)
  expect(f.session.now).toBe(210)
})

test('single step is consumed once and advances world but not fade or entity presentation', () => {
  const f = frameFixture()
  f.tick(100)
  f.session.setStepActive(true)
  f.tick(9000)
  expect(f.session.now).toBe(100)
  f.events.length = 0
  f.session.requestStep()
  f.tick(9001)
  expect(f.session.now).toBe(200)
  expect(f.events).toEqual([
    ['activate'],
    ['resume'],
    ['dialogue'],
    ['keys'],
    ['hostiles', 100],
    ['moves', 100, []],
    ['mounts'],
    ['lifecycle', false, true],
    ['battle', 100, [], 200],
    ['input', [], 9001],
    ['world'],
  ])
  f.events.length = 0
  f.tick(9500)
  expect(f.events).toContainEqual(['clearTicks'])
  expect(f.events.some((e) => e[0] === 'moves')).toBe(false)
  expect(f.session.now).toBe(200)
})

test.each([
  'disable',
  'reset',
] as const)('%s step mode clears a queued step without replay', (mode) => {
  const f = frameFixture()
  f.tick(100)
  f.session.setStepActive(true)
  f.session.requestStep()
  if (mode === 'disable') f.session.setStepActive(false)
  else f.session.resetStep()
  f.tick(110)
  expect(f.session.stepActive).toBe(false)
  expect(f.session.now).toBe(110)
})

test('step request under a modal preserves existing lifecycle arguments without advancing presentation', () => {
  const f = frameFixture()
  f.tick(100)
  f.state.frozen = true
  f.session.setStepActive(true)
  f.session.requestStep()
  f.events.length = 0
  f.tick(1000)
  expect(f.events).toContainEqual(['lifecycle', true, true])
  expect(f.events.some((e) => e[0] === 'fade' || e[0] === 'actions')).toBe(false)
  expect(f.session.now).toBe(200)
})

test('waits settle once in reverse registration order at the gameplay deadline and detach abort listeners', async () => {
  const f = frameFixture()
  f.tick(100)
  const signal = new AbortController(),
    remove = vi.spyOn(signal.signal, 'removeEventListener')
  const order: string[] = []
  const a = f.session.wait(100, signal.signal).then(() => order.push('a'))
  const b = f.session.wait(100, signal.signal).then(() => order.push('b'))
  f.tick(199)
  await Promise.resolve()
  expect(order).toEqual([])
  f.tick(200)
  await Promise.all([a, b])
  expect(order).toEqual(['b', 'a'])
  expect(remove).toHaveBeenCalledTimes(2)
  signal.abort()
  f.tick(300)
  f.session.clearWaits()
  expect(order).toEqual(['b', 'a'])
})

test('aborted wait rejects with the existing protocol while unrelated pending wait can finish', async () => {
  const f = frameFixture()
  f.tick(100)
  const a = new AbortController(),
    b = new AbortController()
  const remove = vi.spyOn(a.signal, 'removeEventListener')
  const cancelled = f.session.wait(200, a.signal).catch((error) => error)
  const live = f.session.wait(200, b.signal)
  a.abort()
  expect(await cancelled).toMatchObject({
    name: 'AbortError',
    message: '脚本等待所属 runner 已取消',
  })
  expect(remove).toHaveBeenCalledTimes(1)
  f.tick(200)
  f.tick(300)
  await live
})

test('pre-aborted signal never leaves a waiter and clear keeps that rejection identity', async () => {
  const f = frameFixture(),
    controller = new AbortController()
  controller.abort()
  const result = f.session.wait(100, controller.signal).catch((error) => error)
  f.session.clearWaits()
  f.tick(1000)
  expect(await result).toMatchObject({ name: 'AbortError' })
})

test('clear resolves remaining waits without waiting for time and never replaces an existing abort error', async () => {
  const f = frameFixture(),
    controller = new AbortController()
  const cancelled = f.session.wait(99999, controller.signal).catch((error) => error)
  const live = f.session.wait(99999, new AbortController().signal).then(
    () => 'resolved',
    () => 'rejected',
  )
  controller.abort()
  const failure = await cancelled
  f.session.clearWaits()
  expect(await live).toBe('resolved')
  expect(await cancelled).toBe(failure)
  f.session.clearWaits()
})

test('modal freezes wait completion; leaving it does not accumulate hidden wall time', async () => {
  const f = frameFixture()
  f.tick(100)
  let completed = false
  const wait = f.session.wait(50, new AbortController().signal).then(() => {
    completed = true
  })
  f.state.frozen = true
  f.tick(10000)
  await Promise.resolve()
  expect(completed).toBe(false)
  f.state.frozen = false
  f.tick(10040)
  await Promise.resolve()
  expect(completed).toBe(false)
  f.tick(10050)
  await wait
  expect(completed).toBe(true)
})

test('frame callbacks remain synchronous and propagate errors without later input or render work', () => {
  const f = frameFixture(),
    error = new Error('frame failure')
  f.ports.advanceMoves = () => {
    throw error
  }
  expect(() => f.tick(100)).toThrow(error)
  expect(f.events.map((e) => e[0])).toEqual([
    'activate',
    'resume',
    'fade',
    'dialogue',
    'keys',
    'hostiles',
  ])
})

test('new frame sessions have independent clocks, single-step requests and wait queues', async () => {
  const f = frameFixture(),
    other = new RuntimeFrameSession(100)
  f.tick(100)
  f.session.setStepActive(true)
  f.session.requestStep()
  let settled = false
  const wait = f.session.wait(10, new AbortController().signal).then(() => {
    settled = true
  })
  other.clearWaits()
  await Promise.resolve()
  expect(settled).toBe(false)
  expect(other.now).toBe(0)
  expect(other.stepActive).toBe(false)
  f.tick(200)
  await wait
  expect(f.session.now).toBe(200)
})
