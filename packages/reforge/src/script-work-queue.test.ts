import { expect, test } from 'vitest'
import { frameFixture } from './__tests__/runtime-frame-fixture.js'
import {
  inheritScriptWork,
  ScriptWorkQueue,
  scriptWorkIO,
  scriptWorkWait,
} from './script-work-queue.js'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

test('a frame waits for immediate continuations and outer cleanup, not an arbitrary number of Promise hops', async () => {
  const queue = new ScriptWorkQueue()
  const signal = new AbortController().signal
  const end = queue.begin(signal)
  let pose = 'down'
  const execution = (async () => {
    try {
      for (let i = 0; i < 400; i++) await Promise.resolve()
      // Execution-budget yields remain ready across a task boundary.
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
      pose = 'up'
    } finally {
      pose += ':released'
      end()
    }
  })()
  await queue.whenIdle(() => expect(pose).toBe('up:released'))
  await execution
})

test('a nested sequential signal parks once and wakes before its movement continuation', async () => {
  const queue = new ScriptWorkQueue()
  const signal = new AbortController().signal
  const end = queue.begin(signal)
  const endNested = queue.begin(signal)
  const child = new AbortController()
  const detach = inheritScriptWork(signal, child.signal)
  let arrive!: () => void
  let facing = 'down'
  const execution = (async () => {
    try {
      await scriptWorkWait<void>(child.signal, (resolve) => {
        arrive = resolve
      })
      for (let i = 0; i < 80; i++) await Promise.resolve()
      facing = 'up'
    } finally {
      detach()
      endNested()
      end()
    }
  })()
  await queue.whenIdle(() => expect(facing).toBe('down'))
  arrive()
  await queue.whenIdle(() => expect(facing).toBe('up'))
  await execution
})

test('readiness is rechecked in the same stack as drawing when a new root races with drain', async () => {
  const queue = new ScriptWorkQueue()
  const a = new AbortController().signal
  const endA = queue.begin(a)
  const rendered: string[] = []
  let pose = 'old'
  const drawing = queue.whenIdle(() => rendered.push(pose))
  let finishA!: () => void
  const waitA = scriptWorkWait<void>(a, (resolve) => {
    finishA = resolve
  })
  let execution!: Promise<void>
  queueMicrotask(() => {
    const endB = queue.begin(new AbortController().signal)
    execution = (async () => {
      for (let i = 0; i < 60; i++) await Promise.resolve()
      pose = 'new'
      endB()
    })()
  })
  await drawing
  expect(rendered).toEqual(['new'])
  finishA()
  await waitA
  endA()
  await execution
})

test('cached IO stays in the current turn while cold aggregated IO yields and abort releases its exact receipt', async () => {
  const queue = new ScriptWorkQueue()
  const controller = new AbortController()
  const end = queue.begin(controller.signal)
  const a = deferred<number>(),
    b = deferred<number>()
  let phase = 'cache'
  let io: Promise<number[]> | undefined
  const execution = (async () => {
    try {
      await scriptWorkIO(
        (async () => {
          for (let i = 0; i < 400; i++) await Promise.resolve()
          phase = 'cold'
        })(),
        controller.signal,
      )
      io = scriptWorkIO(Promise.all([a.promise, b.promise]), controller.signal)
      await io
    } catch {
      phase = 'cleanup'
      for (let i = 0; i < 80; i++) await Promise.resolve()
      phase = 'done'
    } finally {
      end()
    }
  })()
  await queue.whenIdle(() => expect(phase).toBe('cold'))
  a.reject(new Error('resource failed'))
  if (!io) throw new Error('aggregate IO was not registered')
  await expect(io).rejects.toThrow('resource failed')
  // B still pending must not mask the parent's ready failure/cleanup continuation.
  await queue.whenIdle(() => expect(phase).toBe('done'))
  await execution
  b.resolve(2)

  const next = new AbortController()
  const endNext = queue.begin(next.signal)
  const cold = deferred<void>()
  const waiting = scriptWorkIO(cold.promise, next.signal).finally(endNext)
  await queue.whenIdle(() => {})
  next.abort()
  await expect(waiting).rejects.toMatchObject({ name: 'AbortError' })
  await queue.whenIdle(() => {})
  cold.resolve()
})

test('the real frame grants touch ownership before motion wake, drains input effects, and moves once', async () => {
  const queue = new ScriptWorkQueue()
  const f = frameFixture()
  f.ports.afterScriptWork = (action) => queue.whenIdle(action)
  const sequence: string[] = []
  const signal = new AbortController().signal
  const end = queue.begin(signal)
  let wake!: () => void
  let closeTouch!: () => void
  const moving = (async () => {
    await scriptWorkWait<void>(signal, (resolve) => {
      wake = resolve
    })
    sequence.push('move:face')
    end()
  })()
  let touch!: Promise<void>
  f.ports.advanceMoves = () => {
    sequence.push('world')
    const touchSignal = new AbortController().signal
    const endTouch = queue.begin(touchSignal)
    touch = (async () => {
      for (let i = 0; i < 40; i++) await Promise.resolve()
      sequence.push('touch:take')
      await scriptWorkWait<void>(touchSignal, (resolve) => {
        closeTouch = resolve
      })
      sequence.push('input:close')
      endTouch()
    })()
  }
  f.ports.settleMotionContinuations = wake
  f.ports.routeInput = () => closeTouch()
  f.ports.presentWorld = () => sequence.push('draw')
  await f.tick(100)
  expect(sequence).toEqual(['world', 'touch:take', 'move:face', 'input:close', 'draw'])
  expect(f.events.filter(([name]) => name === 'keys')).toHaveLength(1)
  await moving
  await touch
})
