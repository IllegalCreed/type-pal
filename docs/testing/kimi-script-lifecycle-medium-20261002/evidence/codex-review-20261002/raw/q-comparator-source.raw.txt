// Q01 · script-confirm-modal 残差（排重：旧四例已证 FIFO/默认否/两帧门/Esc=No/abort 拒绝/
// 会话替换；本文件只补未覆盖的公开生命周期臂，不重复旧断言形状）。
import { expect, test } from 'vitest'
import { ScriptConfirmModalQueue } from './script-confirm-modal.js'

const NOOP_SIGNAL = new AbortController().signal

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

test('Q01 token 在多次请求间严格单调递增，激活顺序为 FIFO', async () => {
  const queue = new ScriptConfirmModalQueue<number>()
  const tokens: (number | undefined)[] = []
  const settled: boolean[] = []
  const first = queue.enqueue(11, NOOP_SIGNAL)
  const second = queue.enqueue(22, NOOP_SIGNAL)
  const third = queue.enqueue(33, NOOP_SIGNAL)
  expect(queue.pendingCount).toBe(3)
  for (const pending of [first, second, third]) {
    expect(queue.activateIfPossible(true)).toBe(true)
    tokens.push(queue.view?.token)
    queue.submitNo()
    queue.presented()
    queue.presented()
    settled.push(await pending)
  }
  expect(tokens).toEqual([1, 2, 3])
  expect(settled).toEqual([false, false, false])
})

test('Q01 空闲视图为 undefined；激活后视图逐字段反映 prompt 状态', () => {
  const queue = new ScriptConfirmModalQueue<string>()
  expect(queue.view).toBeUndefined()
  expect(queue.active).toBe(false)
  void queue.enqueue('frame-a', NOOP_SIGNAL)
  expect(queue.activateIfPossible(true)).toBe(true)
  expect(queue.view).toMatchObject({
    token: 1,
    frame: 'frame-a',
    selectedYes: false,
    answerPending: false,
    presentedFrames: 0,
  })
  queue.presented()
  expect(queue.view).toMatchObject({ presentedFrames: 1, answerPending: false })
  queue.toggle()
  expect(queue.view).toMatchObject({ selectedYes: true, answerPending: false })
  queue.submit()
  expect(queue.view).toMatchObject({ answerPending: true, presentedFrames: 1 })
  queue.presented()
  expect(queue.view).toBeUndefined()
  expect(queue.active).toBe(false)
})

test('Q01 预取消信号入队同步拒绝：不入队、不占 pending、无请求可激活', async () => {
  const queue = new ScriptConfirmModalQueue<string>()
  const controller = new AbortController()
  controller.abort()
  await expect(queue.enqueue('x', controller.signal)).rejects.toSatisfy(isAbortError)
  expect(queue.pendingCount).toBe(0)
  expect(queue.active).toBe(false)
  expect(queue.activateIfPossible(true)).toBe(false)
})

test('Q01 无活动请求时 toggle/submit/submitNo/presented 全部 no-op', () => {
  const queue = new ScriptConfirmModalQueue<string>()
  expect(() => {
    queue.toggle()
    queue.submit()
    queue.submitNo()
    queue.presented()
  }).not.toThrow()
  expect(queue.view).toBeUndefined()
})

test('Q01 canActivate=false 或已有活动请求时 activate 不动队列', () => {
  const queue = new ScriptConfirmModalQueue<string>()
  void queue.enqueue('held', NOOP_SIGNAL)
  expect(queue.activateIfPossible(false)).toBe(false)
  expect(queue.pendingCount).toBe(1)
  expect(queue.activateIfPossible(true)).toBe(true)
  void queue.enqueue('queued', NOOP_SIGNAL)
  expect(queue.activateIfPossible(true)).toBe(false)
  expect(queue.view?.frame).toBe('held')
  expect(queue.pendingCount).toBe(2)
})

test('Q01 队头取消即离队：pendingCount 同步收缩，激活命中下一个；captureFrame 只替换被激活项', async () => {
  const queue = new ScriptConfirmModalQueue<string>()
  const abortedHead = new AbortController()
  const head = queue.enqueue('first', abortedHead.signal)
  void head.catch(() => {}) // 被取消头请求的拒绝由本测试显式核验
  const next = queue.enqueue('second', NOOP_SIGNAL)
  abortedHead.abort()
  expect(queue.pendingCount).toBe(1) // 取消监听同步把队头移出队列
  expect(queue.activateIfPossible(true, () => 'captured')).toBe(true)
  expect(queue.view?.frame).toBe('captured')
  expect(queue.view?.token).toBe(2)
  await expect(head).rejects.toSatisfy(isAbortError)
  queue.toggle()
  queue.submit()
  queue.presented()
  queue.presented()
  await expect(next).resolves.toBe(true)
})

test('Q01 captureFrame 缺席时保留入队时的原始 frame', () => {
  const queue = new ScriptConfirmModalQueue<string>()
  void queue.enqueue('original', NOOP_SIGNAL)
  expect(queue.activateIfPossible(true)).toBe(true)
  expect(queue.view?.frame).toBe('original')
})

test('Q01 会话替换拒绝排队未激活请求，默认与自定义文案都可观测', async () => {
  const queued = new ScriptConfirmModalQueue<string>()
  const pending = queued.enqueue('q', NOOP_SIGNAL)
  queued.cancelAll()
  await expect(pending).rejects.toMatchObject({ message: '脚本确认框会话已替换' })
  const custom = new ScriptConfirmModalQueue<string>()
  const pendingCustom = custom.enqueue('q', NOOP_SIGNAL)
  custom.cancelAll('会话轮换')
  await expect(pendingCustom).rejects.toMatchObject({ message: '会话轮换' })
})

test('Q01 结算后移除 abort 监听：迟到的信号取消不再改变已 resolve 的结果', async () => {
  const queue = new ScriptConfirmModalQueue<string>()
  const controller = new AbortController()
  const pending = queue.enqueue('stable', controller.signal)
  queue.activateIfPossible(true)
  queue.submitNo()
  queue.presented()
  queue.presented()
  await expect(pending).resolves.toBe(false)
  expect(() => controller.abort()).not.toThrow()
  await expect(pending).resolves.toBe(false)
  expect(queue.view).toBeUndefined()
})

test('Q01 提交后、两帧门满足前 toggle/再次提交/提交否不得改写答案', async () => {
  const queue = new ScriptConfirmModalQueue<string>()
  const pending = queue.enqueue('gate', NOOP_SIGNAL)
  queue.activateIfPossible(true)
  queue.toggle()
  queue.submit() // answer=true，等待第二帧
  queue.toggle()
  queue.submit()
  queue.submitNo()
  queue.presented()
  queue.presented()
  await expect(pending).resolves.toBe(true)
})

test('Q01 中止活动请求后宿主须显式再激活；队列其余项不受牵连', async () => {
  const queue = new ScriptConfirmModalQueue<string>()
  const controller = new AbortController()
  const active = queue.enqueue('active', controller.signal)
  const waiting = queue.enqueue('waiting', NOOP_SIGNAL)
  queue.activateIfPossible(true)
  controller.abort()
  await expect(active).rejects.toSatisfy(isAbortError)
  expect(queue.active).toBe(false)
  expect(queue.pendingCount).toBe(1)
  expect(queue.activateIfPossible(true)).toBe(true)
  expect(queue.view?.frame).toBe('waiting')
  queue.submitNo()
  queue.presented()
  queue.presented()
  await expect(waiting).resolves.toBe(false)
})

test('Q01 已提交答案但帧门未满足时被取消：拒绝而非兑现，且无视图残留', async () => {
  const queue = new ScriptConfirmModalQueue<string>()
  const controller = new AbortController()
  const pending = queue.enqueue('raced', controller.signal)
  queue.activateIfPossible(true)
  queue.toggle()
  queue.submit()
  expect(queue.view?.answerPending).toBe(true)
  controller.abort()
  await expect(pending).rejects.toSatisfy(isAbortError)
  expect(queue.view).toBeUndefined()
})
