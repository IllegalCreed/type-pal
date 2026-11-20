import type { DialogueCue } from '@type-pal/content'
import { expect, test, vi } from 'vitest'
import { CutsceneController, type CutsceneExecutor } from './cutscene-controller.js'

const cue: DialogueCue = { rows: [{ text: 'opening.line' }], slot: 'top' }

function holdEffect() {
  let release = () => {}
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  return { promise, release }
}

function presentationFixture(isRunnerActive = () => false) {
  const immediate = async () => {}
  const ports = {
    dialog: vi.fn<CutsceneExecutor['dialog']>(immediate),
    clearDialog: vi.fn<CutsceneExecutor['clearDialog']>(),
    clearFrameAnimation: vi.fn<CutsceneExecutor['clearFrameAnimation']>(),
    fade: vi.fn<CutsceneExecutor['fade']>(immediate),
    cameraPan: vi.fn<CutsceneExecutor['cameraPan']>(immediate),
    cameraSnap: vi.fn<CutsceneExecutor['cameraSnap']>(),
    frameAnimation: vi.fn<CutsceneExecutor['frameAnimation']>(immediate),
    video: vi.fn<CutsceneExecutor['video']>(immediate),
    wait: vi.fn<CutsceneExecutor['wait']>(immediate),
    resetPresentation: vi.fn<CutsceneExecutor['resetPresentation']>(),
  }
  return { ports, presentation: new CutsceneController(ports, { isRunnerActive }) }
}

test('a held dialogue blocks later effects and the same runner signal reaches every asynchronous port', async () => {
  const { ports, presentation } = presentationFixture()
  const releaseDialog = holdEffect(),
    entered = holdEffect()
  const signal = new AbortController().signal
  const order: string[] = []
  ports.dialog.mockImplementation(async () => {
    entered.release()
    await releaseDialog.promise
    order.push('dialog settled')
  })
  ports.fade.mockImplementation(async () => {
    order.push('fade')
  })
  ports.cameraPan.mockImplementation(async () => {
    order.push('pan')
  })
  ports.wait.mockImplementation(async () => {
    order.push('wait')
  })
  const running = presentation.run(
    [
      { kind: 'dialog', cue },
      { kind: 'fade', dir: 'out', ms: 100 },
      { kind: 'cameraPan', dx: 1, dy: 0, frames: 2 },
      { kind: 'wait', ms: 10 },
    ],
    signal,
  )
  try {
    await entered.promise
    expect(presentation.busy()).toBe(true)
    expect(order).toEqual([])
    expect(ports.dialog).toHaveBeenCalledExactlyOnceWith(cue, signal)
    releaseDialog.release()
    await running
    expect(order).toEqual(['dialog settled', 'fade', 'pan', 'wait'])
    expect(ports.fade).toHaveBeenCalledExactlyOnceWith('out', 100, undefined, signal)
    expect(ports.cameraPan).toHaveBeenCalledExactlyOnceWith(1, 0, 2, signal)
    expect(ports.wait).toHaveBeenCalledExactlyOnceWith(10, signal)
    expect(presentation.busy()).toBe(false)
  } finally {
    releaseDialog.release()
    await running.catch(() => undefined)
  }
})

test('runner activity owns the presentation even between effects', () => {
  let running = true
  const { presentation } = presentationFixture(() => running)
  expect(presentation.busy()).toBe(true)
  running = false
  expect(presentation.busy()).toBe(false)
})

test('background waits receive the same clock input without making presentation busy', async () => {
  const { ports, presentation } = presentationFixture()
  const release = holdEffect()
  const signal = new AbortController().signal
  ports.wait.mockReturnValue(release.promise)
  const pending = presentation.waitPassive(320, signal)
  try {
    expect(ports.wait).toHaveBeenCalledExactlyOnceWith(320, signal)
    expect(presentation.busy()).toBe(false)
  } finally {
    release.release()
    await pending
  }
  expect(presentation.busy()).toBe(false)
})

test('aborting a held effect prevents subsequent dispatch and host reset remains explicit', async () => {
  const { ports, presentation } = presentationFixture()
  const owner = new AbortController()
  const release = holdEffect()
  ports.dialog.mockReturnValue(release.promise)
  const running = presentation.run([{ kind: 'dialog', cue }, { kind: 'clearDialog' }], owner.signal)
  try {
    expect(ports.dialog).toHaveBeenCalledExactlyOnceWith(cue, owner.signal)
    owner.abort()
    release.release()
    await expect(running).rejects.toBe(owner.signal.reason)
    expect(ports.clearDialog).not.toHaveBeenCalled()
    expect(presentation.busy()).toBe(false)
    expect(ports.resetPresentation).not.toHaveBeenCalled()
    presentation.cancelAll()
    expect(ports.resetPresentation).toHaveBeenCalledTimes(1)
  } finally {
    release.release()
    await running.catch(() => undefined)
  }
})

test('finishing one of two live runner signals does not release the other presentation', async () => {
  const { ports, presentation } = presentationFixture()
  const dialogue = holdEffect(),
    fade = holdEffect()
  const dialogSignal = new AbortController().signal,
    fadeSignal = new AbortController().signal
  ports.dialog.mockReturnValue(dialogue.promise)
  ports.fade.mockReturnValue(fade.promise)
  const first = presentation.run([{ kind: 'dialog', cue }], dialogSignal)
  const second = presentation.run([{ kind: 'fade', dir: 'in', ms: 100 }], fadeSignal)
  try {
    expect(ports.dialog).toHaveBeenCalledExactlyOnceWith(cue, dialogSignal)
    expect(ports.fade).toHaveBeenCalledExactlyOnceWith('in', 100, undefined, fadeSignal)
    dialogue.release()
    await first
    expect(presentation.busy()).toBe(true)
    fade.release()
    await second
    expect(presentation.busy()).toBe(false)
  } finally {
    dialogue.release()
    fade.release()
    await Promise.allSettled([first, second])
  }
})

test('video failure preserves the original error and prevents subsequent presentation', async () => {
  const { ports, presentation } = presentationFixture()
  const error = new Error('codec failed')
  const signal = new AbortController().signal
  ports.video.mockRejectedValueOnce(error)
  const running = presentation.run(
    [{ kind: 'video', asset: 'video.v1' }, { kind: 'clearDialog' }],
    signal,
  )
  expect(presentation.busy()).toBe(true)
  await expect(running).rejects.toBe(error)
  expect(ports.video).toHaveBeenCalledExactlyOnceWith('video.v1', signal)
  expect(ports.clearDialog).not.toHaveBeenCalled()
  expect(presentation.busy()).toBe(false)
})

test('frame, video, camera and clear cues reach different ports with the authored arguments', async () => {
  const { ports, presentation } = presentationFixture()
  const signal = new AbortController().signal
  await presentation.run(
    [
      { kind: 'clearDialog' },
      { kind: 'cameraSnap', to: { row: 2, col: 3, height: 1 } },
      { kind: 'video', asset: 'video.v1' },
      { kind: 'frameAnimation', asset: 'anim.a', startFrame: 2, endFrame: 9, frameRate: 12 },
      { kind: 'clearFrameAnimation' },
    ],
    signal,
  )
  expect(ports.clearDialog).toHaveBeenCalledTimes(1)
  expect(ports.cameraSnap).toHaveBeenCalledExactlyOnceWith({ row: 2, col: 3, height: 1 })
  expect(ports.video).toHaveBeenCalledExactlyOnceWith('video.v1', signal)
  expect(ports.frameAnimation).toHaveBeenCalledExactlyOnceWith(
    { asset: 'anim.a', startFrame: 2, endFrame: 9, frameRate: 12 },
    signal,
  )
  expect(ports.frameAnimation.mock.calls[0]?.[1]).toBe(signal)
  expect(ports.video.mock.calls[0]?.[1]).toBe(signal)
  expect(ports.clearFrameAnimation).toHaveBeenCalledTimes(1)
})

test('explicit zero and false survive dispatch; defaults apply only to absent values', async () => {
  const { ports, presentation } = presentationFixture()
  const signal = new AbortController().signal
  const options = {
    asset: 'anim.a',
    startFrame: 0,
    endFrame: 3,
    holdLastFrame: false,
    initialFadeInMs: 0,
  }
  await presentation.run(
    [
      { kind: 'frameAnimation', ...options },
      { kind: 'fade', dir: 'out' },
      { kind: 'fade', dir: 'in', ms: 0 },
      { kind: 'cameraSnap' },
    ],
    signal,
  )
  expect(ports.frameAnimation).toHaveBeenCalledExactlyOnceWith(options, signal)
  expect(ports.fade.mock.calls).toEqual([
    ['out', 300, undefined, signal],
    ['in', 0, undefined, signal],
  ])
  expect(ports.cameraSnap).toHaveBeenCalledExactlyOnceWith(undefined)
})
