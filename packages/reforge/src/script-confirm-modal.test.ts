import { expect, test, vi } from 'vitest'
import { expectDefined } from './defined.js'
import { ScriptConfirmModalQueue } from './script-confirm-modal.js'

test('prompts activate in request order and only an activation captures a new frame', async () => {
  const queue = new ScriptConfirmModalQueue<string>()
  const pending = ['first', 'second', 'third'].map((frame) =>
    queue.enqueue(frame, new AbortController().signal),
  )
  const capture = vi.fn(() => 'frame at activation')
  expect(queue.activateIfPossible(false, capture)).toBe(false)
  expect(queue.view).toBeUndefined()
  expect(queue.pendingCount).toBe(3)
  expect(capture).not.toHaveBeenCalled()

  expect(queue.activateIfPossible(true, capture)).toBe(true)
  expect(queue.view).toStrictEqual({
    token: 1,
    frame: 'frame at activation',
    selectedYes: false,
    presentedFrames: 0,
    answerPending: false,
  })
  expect(queue.activateIfPossible(true, capture)).toBe(false)
  expect(capture).toHaveBeenCalledTimes(1)
  expect(queue.pendingCount).toBe(3)
  queue.presented()
  queue.presented()
  queue.submit()
  await expect(pending[0]).resolves.toBe(false)

  for (const [index, frame] of ['second', 'third'].entries()) {
    expect(queue.activateIfPossible(true)).toBe(true)
    expect(queue.view).toMatchObject({ token: index + 2, frame })
    queue.presented()
    queue.presented()
    queue.toggle()
    queue.submit()
    await expect(pending[index + 1]).resolves.toBe(true)
  }
  expect(queue.pendingCount).toBe(0)
  expect(queue.view).toBeUndefined()
})

test.each([
  false,
  true,
])('an early answer (%s) is locked and released on the second drawn frame', async (yes) => {
  const queue = new ScriptConfirmModalQueue<string>()
  const pending = queue.enqueue('question', new AbortController().signal)
  const resolved = vi.fn()
  void pending.then(resolved)
  queue.activateIfPossible(true)
  queue.presented()
  if (yes) queue.toggle()
  expect(queue.view).toMatchObject({ selectedYes: yes, answerPending: false })
  queue.submit()
  queue.toggle()
  queue.submitNo()
  queue.submit()
  await Promise.resolve()
  expect(queue.view).toMatchObject({ selectedYes: yes, answerPending: true, presentedFrames: 1 })
  expect(resolved).not.toHaveBeenCalled()
  queue.presented()
  await expect(pending).resolves.toBe(yes)
  expect(queue.active).toBe(false)
})

test('drawing the second frame never chooses an answer for the player', async () => {
  const queue = new ScriptConfirmModalQueue<string>()
  const pending = queue.enqueue('question', new AbortController().signal)
  const resolved = vi.fn()
  void pending.then(resolved)
  queue.activateIfPossible(true)
  queue.presented()
  queue.presented()
  await Promise.resolve()
  expect(queue.view).toMatchObject({ presentedFrames: 2, answerPending: false })
  expect(resolved).not.toHaveBeenCalled()
  queue.submit()
  await expect(pending).resolves.toBe(false)
  expect(queue.view).toBeUndefined()
})

test('Esc chooses No even when the highlighted answer is Yes', async () => {
  const queue = new ScriptConfirmModalQueue<string>()
  const pending = queue.enqueue('question', new AbortController().signal)
  queue.activateIfPossible(true)
  queue.toggle()
  expect(queue.view?.selectedYes).toBe(true)
  queue.submitNo()
  queue.presented()
  queue.presented()
  await expect(pending).resolves.toBe(false)
})

test('a rendered view wrapper cannot alter the queued answer or frame count', async () => {
  const queue = new ScriptConfirmModalQueue<string>()
  const pending = queue.enqueue('question', new AbortController().signal)
  queue.activateIfPossible(true)
  const view = expectDefined(queue.view)
  view.selectedYes = true
  view.answerPending = true
  view.presentedFrames = 99
  expect(queue.view).toMatchObject({ selectedYes: false, answerPending: false, presentedFrames: 0 })
  queue.toggle()
  queue.presented()
  queue.presented()
  queue.submit()
  await expect(pending).resolves.toBe(true)
})
