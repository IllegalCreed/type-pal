import { describe, expect, test } from 'vitest'
import { ScriptConfirmModalQueue } from './script-confirm-modal.js'

describe('ScriptConfirmModalQueue', () => {
  test('is FIFO, defaults to No and settles only after two presented frames', async () => {
    const modal = new ScriptConfirmModalQueue<string>()
    const first = modal.enqueue('question-1', new AbortController().signal)
    const second = modal.enqueue('question-2', new AbortController().signal)

    expect(modal.activateIfPossible(false)).toBe(false)
    expect(modal.activateIfPossible(true)).toBe(true)
    expect(modal.view).toMatchObject({
      frame: 'question-1',
      selectedYes: false,
      presentedFrames: 0,
    })

    modal.submit()
    modal.presented()
    expect(modal.active).toBe(true)
    modal.presented()
    await expect(first).resolves.toBe(false)

    expect(modal.activateIfPossible(true)).toBe(true)
    expect(modal.view?.frame).toBe('question-2')
    modal.toggle()
    modal.presented()
    modal.presented()
    modal.submit()
    await expect(second).resolves.toBe(true)
  })

  test('Esc is always No and double-submit cannot change the answer', async () => {
    const modal = new ScriptConfirmModalQueue<string>()
    const answer = modal.enqueue('question', new AbortController().signal)
    modal.activateIfPossible(true)
    modal.toggle()
    modal.presented()
    modal.presented()
    modal.submitNo()
    modal.submit()
    await expect(answer).resolves.toBe(false)
  })

  test('aborting active and queued requests rejects without choosing either branch', async () => {
    const modal = new ScriptConfirmModalQueue<string>()
    const activeController = new AbortController()
    const queuedController = new AbortController()
    const active = modal.enqueue('active', activeController.signal)
    const queued = modal.enqueue('queued', queuedController.signal)
    modal.activateIfPossible(true)

    activeController.abort()
    queuedController.abort()
    await expect(active).rejects.toMatchObject({ name: 'AbortError' })
    await expect(queued).rejects.toMatchObject({ name: 'AbortError' })
    expect(modal.pendingCount).toBe(0)
  })

  test('session replacement rejects every request and late input is inert', async () => {
    const modal = new ScriptConfirmModalQueue<string>()
    const first = modal.enqueue('first', new AbortController().signal)
    const second = modal.enqueue('second', new AbortController().signal)
    modal.activateIfPossible(true)

    modal.cancelAll()
    modal.toggle()
    modal.submit()
    modal.presented()
    await expect(first).rejects.toMatchObject({ name: 'AbortError' })
    await expect(second).rejects.toMatchObject({ name: 'AbortError' })
    expect(modal.view).toBeUndefined()
  })
})
