import { afterEach, expect, test, vi } from 'vitest'
import { ScriptConfirmModalQueue } from './script-confirm-modal.js'

afterEach(() => vi.restoreAllMocks())
const NOOP_SIGNAL = new AbortController().signal
const flush = async (turns = 5) => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}
/** Settlement journal: a later assertion must observe real settle events, not assume them. */
function journal(promise: Promise<boolean>) {
  const entry = { count: 0, value: undefined as boolean | undefined, error: undefined as unknown }
  void promise.then(
    (value) => {
      entry.count += 1
      entry.value = value
    },
    (error: unknown) => {
      entry.count += 1
      entry.error = error
    },
  )
  return entry
}

// KM-LIFE-M01 captureFrame 是激活 port:拒绝激活(blocked/已有 active)零 IO,真激活恰一次。
test('M01 refused activations never touch the capture port; a real activation captures exactly once', async () => {
  const queue = new ScriptConfirmModalQueue<string>()
  const capture = vi.fn(() => 'captured')
  const answer = queue.enqueue('original', NOOP_SIGNAL)
  expect(queue.activateIfPossible(false, capture)).toBe(false)
  expect(queue.activateIfPossible(false, capture)).toBe(false)
  expect(capture).not.toHaveBeenCalled()
  expect(queue.pendingCount).toBe(1)
  expect(queue.view).toBeUndefined()

  expect(queue.activateIfPossible(true, capture)).toBe(true)
  expect(capture).toHaveBeenCalledTimes(1)
  expect(queue.view).toMatchObject({ token: 1, frame: 'captured' })

  expect(queue.activateIfPossible(true, capture)).toBe(false)
  expect(queue.activateIfPossible(true, capture)).toBe(false)
  expect(capture).toHaveBeenCalledTimes(1)
  expect(queue.view).toMatchObject({ token: 1, frame: 'captured' })
  expect(queue.pendingCount).toBe(1)

  queue.submitNo()
  queue.presented()
  queue.presented()
  await expect(answer).resolves.toBe(false)
  expect(queue.pendingCount).toBe(0)
  expect(queue.view).toBeUndefined()
})

// KM-LIFE-M02 公开 view 是包装快照:改写返回对象不污染内部状态、下一 view 与最终答案。
test('M02 mutating a handed-out view wrapper never leaks into the next view or the final answer', async () => {
  const queue = new ScriptConfirmModalQueue<string>()
  const answer = queue.enqueue('question', NOOP_SIGNAL)
  expect(queue.activateIfPossible(true)).toBe(true)
  const handed = queue.view
  if (!handed) throw new Error('expected an active view')
  handed.selectedYes = true
  handed.answerPending = true
  handed.presentedFrames = 99

  expect(queue.view).toMatchObject({
    selectedYes: false,
    answerPending: false,
    presentedFrames: 0,
  })
  queue.toggle() // 内部仍从真实 false 起步,而不是被改写的 true
  expect(queue.view?.selectedYes).toBe(true)
  queue.presented()
  expect(queue.view?.presentedFrames).toBe(1)
  queue.presented()
  queue.submit()
  await expect(answer).resolves.toBe(true)
})

// KM-LIFE-M03 默认 No 先提交:帧门未满的待兑现期 toggle/submit/submitNo 锁不住也改不了 false。
test('M03 an early default-No submit stays false through the pending window', async () => {
  const queue = new ScriptConfirmModalQueue<string>()
  const answer = queue.enqueue('question', NOOP_SIGNAL)
  expect(queue.activateIfPossible(true)).toBe(true)
  queue.submit()
  expect(queue.view?.answerPending).toBe(true)
  queue.toggle()
  queue.submitNo()
  queue.submit()
  expect(queue.view?.answerPending).toBe(true)
  expect(queue.view?.selectedYes).toBe(false)
  queue.presented()
  queue.presented()
  await expect(answer).resolves.toBe(false)
})

// KM-LIFE-M04 两帧只代表可兑现:没有提交时 Promise 保持 pending,显式 submit 才结算。
test('M04 two presented frames without a submit keep the answer pending until an explicit submit', async () => {
  const queue = new ScriptConfirmModalQueue<string>()
  const answer = queue.enqueue('question', NOOP_SIGNAL)
  const entry = journal(answer)
  expect(queue.activateIfPossible(true)).toBe(true)
  queue.presented()
  queue.presented()
  await flush()
  expect(entry.count).toBe(0)
  expect(queue.active).toBe(true)
  expect(queue.view).toMatchObject({ answerPending: false, presentedFrames: 2 })

  queue.submit()
  await expect(answer).resolves.toBe(false)
  expect(entry.count).toBe(1)
  expect(entry.value).toBe(false)
  expect(queue.active).toBe(false)
  expect(queue.view).toBeUndefined()
})

// KM-LIFE-M05 激活前取消中间排队项:正索引 splice 不误删首/尾,FIFO/token/答案保持。
test('M05 cancelling the middle queued request before activation preserves first and third in FIFO order', async () => {
  const queue = new ScriptConfirmModalQueue<string>()
  const middle = new AbortController()
  const first = queue.enqueue('first', NOOP_SIGNAL)
  const second = queue.enqueue('second', middle.signal)
  const third = queue.enqueue('third', NOOP_SIGNAL)
  expect(queue.pendingCount).toBe(3)

  middle.abort()
  await expect(second).rejects.toMatchObject({ name: 'AbortError' })
  expect(queue.pendingCount).toBe(2)

  expect(queue.activateIfPossible(true)).toBe(true)
  expect(queue.view).toMatchObject({ token: 1, frame: 'first' })
  queue.submitNo()
  queue.presented()
  queue.presented()
  await expect(first).resolves.toBe(false)
  expect(queue.pendingCount).toBe(1)

  expect(queue.activateIfPossible(true)).toBe(true)
  expect(queue.view).toMatchObject({ token: 3, frame: 'third' })
  queue.toggle()
  queue.submit()
  queue.presented()
  queue.presented()
  await expect(third).resolves.toBe(true)
  expect(queue.pendingCount).toBe(0)
})

// KM-LIFE-M06 真实监听清理:兑现/abort/cancelAll 各移除自己注册的 handler,同一引用且只一次。
test('M06 every settlement path removes exactly its own registered abort listener once', async () => {
  const resolvedSignal = new AbortController()
  const addResolve = vi.spyOn(resolvedSignal.signal, 'addEventListener')
  const removeResolve = vi.spyOn(resolvedSignal.signal, 'removeEventListener')
  const resolvedQueue = new ScriptConfirmModalQueue<string>()
  const resolvedAnswer = resolvedQueue.enqueue('q', resolvedSignal.signal)
  expect(addResolve).toHaveBeenCalledTimes(1)
  expect(addResolve.mock.calls[0]?.[0]).toBe('abort')
  expect(addResolve.mock.calls[0]?.[2]).toMatchObject({ once: true })
  resolvedQueue.activateIfPossible(true)
  resolvedQueue.submitNo()
  resolvedQueue.presented()
  resolvedQueue.presented()
  await expect(resolvedAnswer).resolves.toBe(false)
  expect(removeResolve).toHaveBeenCalledTimes(1)
  expect(removeResolve.mock.calls[0]?.[0]).toBe('abort')
  expect(removeResolve.mock.calls[0]?.[1]).toBe(addResolve.mock.calls[0]?.[1])
  resolvedSignal.abort() // 已结算后迟到 abort 不再重复移除
  await flush()
  expect(removeResolve).toHaveBeenCalledTimes(1)

  const abortedSignal = new AbortController()
  const addAbort = vi.spyOn(abortedSignal.signal, 'addEventListener')
  const removeAbort = vi.spyOn(abortedSignal.signal, 'removeEventListener')
  const abortedQueue = new ScriptConfirmModalQueue<string>()
  const abortedAnswer = abortedQueue.enqueue('q', abortedSignal.signal)
  abortedSignal.abort()
  await expect(abortedAnswer).rejects.toMatchObject({ name: 'AbortError' })
  expect(removeAbort).toHaveBeenCalledTimes(1)
  expect(removeAbort.mock.calls[0]?.[1]).toBe(addAbort.mock.calls[0]?.[1])

  const cancelledSignal = new AbortController()
  const addCancel = vi.spyOn(cancelledSignal.signal, 'addEventListener')
  const removeCancel = vi.spyOn(cancelledSignal.signal, 'removeEventListener')
  const cancelledQueue = new ScriptConfirmModalQueue<string>()
  const cancelledAnswer = cancelledQueue.enqueue('q', cancelledSignal.signal)
  cancelledQueue.cancelAll()
  await expect(cancelledAnswer).rejects.toMatchObject({ name: 'AbortError' })
  expect(removeCancel).toHaveBeenCalledTimes(1)
  expect(removeCancel.mock.calls[0]?.[1]).toBe(addCancel.mock.calls[0]?.[1])
})

// KM-LIFE-M07 已结算项的迟到 abort 不越权:真实 active 的第二项 token/view/答案/pending 保留。
test('M07 a late abort of a settled first request leaves the truly active second request intact', async () => {
  const queue = new ScriptConfirmModalQueue<string>()
  const first = new AbortController()
  const firstAnswer = queue.enqueue('one', first.signal)
  const secondAnswer = queue.enqueue('two', NOOP_SIGNAL)
  expect(queue.activateIfPossible(true)).toBe(true)
  queue.toggle()
  queue.submit()
  queue.presented()
  queue.presented()
  await expect(firstAnswer).resolves.toBe(true)

  expect(queue.activateIfPossible(true)).toBe(true)
  expect(queue.view?.token).toBe(2)
  first.abort()
  await flush()
  expect(queue.active).toBe(true)
  expect(queue.view).toMatchObject({ token: 2, frame: 'two', answerPending: false })
  expect(queue.pendingCount).toBe(1)

  queue.submitNo()
  queue.presented()
  queue.presented()
  await expect(secondAnswer).resolves.toBe(false)
  expect(queue.pendingCount).toBe(0)
})

// KM-LIFE-M08 初检后/真实 addEventListener 前的 abort 窗口由 enqueue 尾检承接。
test('M08 an abort landing between the enqueue pre-check and listener registration still rejects cleanly', async () => {
  const queue = new ScriptConfirmModalQueue<string>()
  const controller = new AbortController()
  const originalAdd = controller.signal.addEventListener.bind(controller.signal)
  vi.spyOn(controller.signal, 'addEventListener').mockImplementation((type, listener, options) => {
    if (type === 'abort') controller.abort() // 窗口:初检已过、监听尚未注册
    return originalAdd(type, listener, options)
  })
  const answer = queue.enqueue('window', controller.signal)
  await expect(answer).rejects.toMatchObject({
    name: 'AbortError',
    message: '脚本确认框所属 runner 已取消',
  })
  expect(queue.pendingCount).toBe(0)
  expect(queue.view).toBeUndefined()
  expect(queue.activateIfPossible(true)).toBe(false)
})
