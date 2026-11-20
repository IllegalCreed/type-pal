import { expect, test, vi } from 'vitest'
import {
  exampleFrameAsset as asset,
  frameGate,
  frameSequenceBytes,
  listedFrameSequence,
} from './__tests__/frame-sequence-fixture.js'
import {
  decompressFrameSequenceBlock,
  FrameSequenceReader,
  playFrameAnimation,
} from './frame-animation-player.js'

async function previewReader(colors = [0, 1, 2]) {
  return new FrameSequenceReader(await listedFrameSequence(await frameSequenceBytes(colors)))
}

function keydown(code: string): Event {
  return Object.assign(new Event('keydown', { cancelable: true }), { code })
}

const noDelay = async () => {}

test('presentation installs the first pixel before reveal and waits for reveal before its own frame timing', async () => {
  const reader = await previewReader([0, 1])
  const atReveal = frameGate(),
    reveal = frameGate(),
    atFirstWait = frameGate(),
    firstWait = frameGate()
  const events: string[] = []
  let waitCount = 0
  const pending = playFrameAnimation({
    reader,
    asset,
    frameRate: 16,
    onFrame(frame) {
      events.push(`pixel:${frame.rgba[0]}`)
    },
    async onFirstFrameReady() {
      events.push('reveal:start')
      atReveal.release()
      await reveal.promise
      events.push('reveal:end')
    },
    async wait(ms) {
      events.push(`wait:${ms}`)
      if (++waitCount === 1) {
        atFirstWait.release()
        await firstWait.promise
      }
    },
  })
  try {
    await atReveal.promise
    expect(events).toEqual(['pixel:0', 'reveal:start'])
    reveal.release()
    await atFirstWait.promise
    expect(events).toEqual(['pixel:0', 'reveal:start', 'reveal:end', 'wait:62.5'])
    firstWait.release()
    await pending
    expect(events).toEqual([
      'pixel:0',
      'reveal:start',
      'reveal:end',
      'wait:62.5',
      'pixel:1',
      'wait:62.5',
    ])
  } finally {
    reveal.release()
    firstWait.release()
    await pending.catch(() => undefined)
  }
})

test('the bounded range is inclusive, with FPS override or individual authored durations', async () => {
  const reader = await previewReader([0, 1, 2, 3])
  for (const mode of [
    { frameRate: 25, durations: [40, 40, 40] },
    { frameRate: undefined, durations: [75, 40, 40] },
  ]) {
    const frames: number[] = [],
      waits: number[] = []
    const result = await playFrameAnimation({
      reader,
      asset,
      startFrame: 1,
      endFrame: 3,
      ...(mode.frameRate === undefined ? {} : { frameRate: mode.frameRate }),
      onFrame(frame) {
        frames.push(frame.rgba[0] ?? -1)
      },
      async wait(ms) {
        waits.push(ms)
      },
    })
    expect(frames).toEqual([1, 2, 3])
    expect(waits).toEqual(mode.durations)
    expect(result?.rgba).toEqual(Uint8Array.of(3, 4, 5, 255))
  }
})

test('an invalid range and a missing registered file each propagate without presenting a frame', async () => {
  const reader = await previewReader([0, 1])
  const onFrame = vi.fn()
  await expect(
    playFrameAnimation({ reader, asset, endFrame: 2, onFrame, wait: noDelay }),
  ).rejects.toThrow('越界')
  const broken = new FrameSequenceReader(
    await listedFrameSequence(await frameSequenceBytes([0, 1]), async () => {
      throw new DOMException('file missing', 'NotFoundError')
    }),
  )
  await expect(
    playFrameAnimation({ reader: broken, asset, onFrame, wait: noDelay }),
  ).rejects.toThrow(/frame-fixture.*frame-animation\.opening.*file missing/u)
  expect(onFrame).not.toHaveBeenCalled()
})

test('story playback does not consume Space or skip frames without a preview binding', async () => {
  const reader = await previewReader()
  const target = new EventTarget()
  const frames: number[] = []
  const event = keydown('Space')
  await playFrameAnimation({
    reader,
    asset,
    eventTarget: target,
    onFrame(frame) {
      frames.push(frame.rgba[0] ?? -1)
    },
    async wait() {
      if (frames.length === 1) target.dispatchEvent(event)
    },
  })
  expect(event.defaultPrevented).toBe(false)
  expect(frames).toEqual([0, 1, 2])
})

test('during a preview wait only the bound key is consumed and the first frame is retained', async () => {
  const reader = await previewReader()
  const target = new EventTarget()
  const firstWait = frameGate(),
    release = frameGate()
  const frames: number[] = [],
    seen: string[] = []
  const unrelated = keydown('KeyX'),
    bound = keydown('Space')
  const running = playFrameAnimation({
    reader,
    asset,
    skipKeys: ['Space'],
    eventTarget: target,
    onFrame(frame) {
      frames.push(frame.rgba[0] ?? -1)
    },
    wait() {
      firstWait.release()
      return release.promise
    },
  })
  try {
    await firstWait.promise
    target.addEventListener('keydown', (event) => seen.push((event as KeyboardEvent).code))
    expect(target.dispatchEvent(unrelated)).toBe(true)
    expect(target.dispatchEvent(bound)).toBe(false)
    release.release()
    expect((await running)?.rgba).toEqual(Uint8Array.of(0, 1, 2, 255))
    expect(frames).toEqual([0])
    expect(seen).toEqual(['KeyX'])
  } finally {
    release.release()
    await running.catch(() => undefined)
  }
})

test('a renderer error propagates unchanged and releases the capturing preview key listener', async () => {
  const reader = await previewReader()
  const target = new EventTarget()
  const remove = target.removeEventListener.bind(target)
  // Node 22 only honors object capture options on removal; adapt the browser boolean form.
  target.removeEventListener = (type, listener, options) =>
    remove(type, listener, typeof options === 'boolean' ? { capture: options } : options)
  const broken = new Error('renderer crashed')
  const onKeyAfterFailure = vi.fn()
  await expect(
    playFrameAnimation({
      reader,
      asset,
      eventTarget: target,
      skipKeys: ['Space'],
      wait: noDelay,
      onFrame() {
        throw broken
      },
    }),
  ).rejects.toBe(broken)
  target.addEventListener('keydown', onKeyAfterFailure)
  const event = keydown('Space')
  expect(target.dispatchEvent(event)).toBe(true)
  expect(onKeyAfterFailure).toHaveBeenCalledExactlyOnceWith(event)
})

// Observe whether the outer player has settled while the actual underlying port remains blocked.
function untilNextTurn(): Promise<'still-pending'> {
  return new Promise((resolve) => setTimeout(() => resolve('still-pending'), 0))
}

test.each([
  'container',
  'inflate',
  'wait',
] as const)('aborting during %s releases playback before the blocked port completes', async (step) => {
  const bytes = await frameSequenceBytes([0, 1, 2])
  const controller = new AbortController()
  const entered = frameGate(),
    releasePort = frameGate(),
    portCompleted = frameGate()
  const frames: number[] = []
  async function block() {
    entered.release()
    await releasePort.promise
    portCompleted.release()
  }
  const reader = new FrameSequenceReader(
    await listedFrameSequence(bytes, async () => {
      if (step === 'container') await block()
      return bytes.slice(0)
    }),
    async (raw) => {
      if (step === 'inflate') await block()
      return decompressFrameSequenceBlock(raw)
    },
  )
  const running = playFrameAnimation({
    reader,
    asset,
    signal: controller.signal,
    onFrame(frame) {
      frames.push(frame.rgba[0] ?? -1)
    },
    async wait() {
      if (step === 'wait') await block()
    },
  })
  const outcome = running.then(
    () => 'resolved',
    (error: unknown) => (error instanceof DOMException ? error.name : error),
  )
  try {
    await entered.promise
    controller.abort()
    expect(await Promise.race([outcome, untilNextTurn()])).toBe('AbortError')
    releasePort.release()
    await portCompleted.promise
    // Await real inflight buffer work before checking that nothing can land from the prior owner.
    expect([...(await reader.frame(asset, 0)).rgba]).toEqual([0, 1, 2, 255])
    expect(frames).toEqual(step === 'wait' ? [0] : [])
    if (step === 'container') {
      const replay: number[] = []
      await playFrameAnimation({
        reader,
        asset,
        endFrame: 0,
        wait: noDelay,
        onFrame(frame) {
          replay.push(frame.rgba[0] ?? -1)
        },
      })
      expect(replay).toEqual([0])
    }
  } finally {
    controller.abort()
    releasePort.release()
    await outcome
  }
})
