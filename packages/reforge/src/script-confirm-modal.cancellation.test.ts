import { afterEach, expect, test, vi } from 'vitest'
import { nextTestTask } from './__tests__/deferred.js'
import { ScriptConfirmModalQueue } from './script-confirm-modal.js'

afterEach(() => vi.restoreAllMocks())

test('an already cancelled runner never claims the prompt queue', async () => {
  const queue = new ScriptConfirmModalQueue<string>()
  const controller = new AbortController()
  controller.abort()
  await expect(queue.enqueue('cancelled', controller.signal)).rejects.toMatchObject({
    name: 'AbortError',
  })
  expect(queue.pendingCount).toBe(0)
  expect(queue.activateIfPossible(true)).toBe(false)
})

test('a failed frame capture rejects its own prompt and leaves the next prompt available', async () => {
  const queue = new ScriptConfirmModalQueue<string>()
  const owner = new AbortController()
  const registered = vi.spyOn(owner.signal, 'addEventListener')
  const removed = vi.spyOn(owner.signal, 'removeEventListener')
  const first = queue.enqueue('waiting to be captured', owner.signal)
  const next = queue.enqueue('next prompt', new AbortController().signal)
  const result = first.then(
    (value) => ({ status: 'answered', value }),
    (error: unknown) => ({ status: 'rejected', error }),
  )
  const failure = new Error('unable to capture this frame')
  let activation: boolean | undefined
  let escaped: unknown
  try {
    try {
      activation = queue.activateIfPossible(true, () => {
        throw failure
      })
    } catch (error) {
      escaped = error
    }
    const settled = await Promise.race([result, nextTestTask().then(() => ({ status: 'pending' }))])
    expect(settled.status).toBe('rejected')
    expect('error' in settled && settled.error).toBe(failure)
    expect(activation).toBe(false)
    expect(escaped).toBeUndefined()
    expect(removed).toHaveBeenCalledExactlyOnceWith('abort', registered.mock.calls[0]?.[1])
    expect(queue.activateIfPossible(true)).toBe(true)
    expect(queue.view?.frame).toBe('next prompt')
    queue.presented()
    queue.presented()
    queue.submitNo()
    await expect(next).resolves.toBe(false)
  } finally {
    const nextSettled = next.catch(() => undefined)
    queue.cancelAll()
    owner.abort()
    await Promise.all([result, nextSettled])
  }
})

test.each([
  { cancelled: 0, remaining: [1, 2] },
  { cancelled: 1, remaining: [0, 2] },
])('cancelling queued prompt $cancelled preserves the other prompts in order', async ({
  cancelled,
  remaining,
}) => {
  const queue = new ScriptConfirmModalQueue<string>()
  const controller = new AbortController()
  const pending = [0, 1, 2].map((index) =>
    queue.enqueue(
      `prompt-${index}`,
      index === cancelled ? controller.signal : new AbortController().signal,
    ),
  )
  controller.abort()
  await expect(pending[cancelled]).rejects.toMatchObject({ name: 'AbortError' })
  expect(queue.pendingCount).toBe(2)
  for (const index of remaining) {
    expect(queue.activateIfPossible(true)).toBe(true)
    expect(queue.view).toMatchObject({ token: index + 1, frame: `prompt-${index}` })
    queue.presented()
    queue.presented()
    queue.submit()
    await expect(pending[index]).resolves.toBe(false)
  }
  expect(queue.pendingCount).toBe(0)
})

test('cancelling a submitted prompt before presentation rejects its answer and preserves the next prompt', async () => {
  const queue = new ScriptConfirmModalQueue<string>()
  const controller = new AbortController()
  const first = queue.enqueue('first', controller.signal)
  const next = queue.enqueue('next', new AbortController().signal)
  queue.activateIfPossible(true)
  queue.toggle()
  queue.submit()
  expect(queue.view?.answerPending).toBe(true)
  controller.abort()
  await expect(first).rejects.toMatchObject({ name: 'AbortError' })
  expect(queue.view).toBeUndefined()
  expect(queue.pendingCount).toBe(1)
  queue.activateIfPossible(true)
  expect(queue.view?.frame).toBe('next')
  queue.presented()
  queue.presented()
  queue.submitNo()
  await expect(next).resolves.toBe(false)
})

test.each([
  undefined,
  '会话轮换',
])('replacing the session rejects both active and queued prompts (%s)', async (reason) => {
  const queue = new ScriptConfirmModalQueue<string>()
  const first = queue.enqueue('active', new AbortController().signal)
  const next = queue.enqueue('queued', new AbortController().signal)
  queue.activateIfPossible(true)
  queue.cancelAll(reason)
  queue.toggle()
  queue.submit()
  queue.submitNo()
  queue.presented()
  const error = { name: 'AbortError', message: reason ?? '脚本确认框会话已替换' }
  await expect(first).rejects.toMatchObject(error)
  await expect(next).rejects.toMatchObject(error)
  expect(queue.view).toBeUndefined()
  expect(queue.pendingCount).toBe(0)
})

test.each([
  'answered',
  'aborted',
  'replaced',
] as const)('a prompt %s releases its own abort listener exactly once', async (outcome) => {
  const queue = new ScriptConfirmModalQueue<string>()
  const controller = new AbortController()
  const add = vi.spyOn(controller.signal, 'addEventListener')
  const remove = vi.spyOn(controller.signal, 'removeEventListener')
  const pending = queue.enqueue('question', controller.signal)
  expect(add).toHaveBeenCalledOnce()
  const registered = add.mock.calls[0]?.[1]
  expect(registered).toBeTypeOf('function')
  expect(add).toHaveBeenCalledWith('abort', registered, { once: true })
  if (outcome === 'answered') {
    queue.activateIfPossible(true)
    queue.presented()
    queue.presented()
    queue.submit()
    await expect(pending).resolves.toBe(false)
  } else {
    if (outcome === 'aborted') controller.abort()
    else queue.cancelAll()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  }
  controller.abort()
  expect(remove).toHaveBeenCalledExactlyOnceWith('abort', registered)
  expect(queue.pendingCount).toBe(0)
})

test('late cancellation of a settled prompt leaves the active successor untouched', async () => {
  const queue = new ScriptConfirmModalQueue<string>()
  const controller = new AbortController()
  const first = queue.enqueue('first', controller.signal)
  const next = queue.enqueue('next', new AbortController().signal)
  queue.activateIfPossible(true)
  queue.presented()
  queue.presented()
  queue.submit()
  await expect(first).resolves.toBe(false)
  queue.activateIfPossible(true)
  controller.abort()
  expect(queue.view).toMatchObject({ token: 2, frame: 'next', answerPending: false })
  queue.presented()
  queue.presented()
  queue.toggle()
  queue.submit()
  await expect(next).resolves.toBe(true)
})
