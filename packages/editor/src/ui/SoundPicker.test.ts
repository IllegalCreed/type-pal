import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  claimEditorAudioPreview,
  isEditorAudioPreviewOwner,
  stopEditorAudioPreview,
} from '../core/audio-preview-session.js'

const soundMocks = vi.hoisted(() => ({
  instances: [] as Array<{
    resume: ReturnType<typeof vi.fn>
    prepare: ReturnType<typeof vi.fn>
    play: ReturnType<typeof vi.fn>
    invalidate: ReturnType<typeof vi.fn>
    dispose: ReturnType<typeof vi.fn>
  }>,
  prepares: [] as Promise<void>[],
}))

vi.mock('@type-pal/reforge', () => ({
  SfxPlayer: class {
    resume = vi.fn().mockResolvedValue(undefined)
    prepare = vi.fn(() => soundMocks.prepares.shift() ?? Promise.resolve())
    play = vi.fn(() => true)
    invalidate = vi.fn()
    dispose = vi.fn().mockResolvedValue(undefined)

    constructor() {
      soundMocks.instances.push(this)
    }
  },
}))

import { disposeSoundPreview, previewSound } from './SoundPicker.js'

function deferred() {
  let resolve!: () => void
  let reject!: (cause: unknown) => void
  const promise = new Promise<void>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

const reader = {
  record: vi.fn((asset: string) => ({ sha256: asset })),
} as never

beforeEach(async () => {
  stopEditorAudioPreview()
  await disposeSoundPreview()
  soundMocks.instances.length = 0
  soundMocks.prepares.length = 0
})

afterEach(async () => {
  stopEditorAudioPreview()
  await disposeSoundPreview()
})

describe('音效选择器的全局试听 ownership', () => {
  test('快速 A→B 会停止 A，旧 prepare 迟到不会播放或释放 B', async () => {
    const firstPrepare = deferred()
    const secondPrepare = deferred()
    soundMocks.prepares.push(firstPrepare.promise, secondPrepare.promise)

    const firstRequest = previewSound(reader, 'sound.a')
    await vi.waitFor(() => expect(soundMocks.instances).toHaveLength(1))
    const first = soundMocks.instances[0]!

    const secondRequest = previewSound(reader, 'sound.b')
    await vi.waitFor(() => expect(soundMocks.instances).toHaveLength(2))
    const second = soundMocks.instances[1]!
    expect(first.dispose).toHaveBeenCalledOnce()

    secondPrepare.resolve()
    await secondRequest
    expect(second.play).toHaveBeenCalledWith('sound.b')

    firstPrepare.reject(new DOMException('选择已变化', 'AbortError'))
    await firstRequest
    expect(first.play).not.toHaveBeenCalled()

    const nextOwner = { stop: vi.fn() }
    claimEditorAudioPreview(nextOwner)
    expect(second.dispose).toHaveBeenCalledOnce()
    expect(isEditorAudioPreviewOwner(nextOwner)).toBe(true)
  })

  test('音效开始前会停止项目页等已有试听 owner', async () => {
    const previousOwner = { stop: vi.fn() }
    claimEditorAudioPreview(previousOwner)

    await previewSound(reader, 'sound.next')

    expect(previousOwner.stop).toHaveBeenCalledOnce()
    expect(soundMocks.instances[0]?.play).toHaveBeenCalledWith('sound.next')
  })
})
