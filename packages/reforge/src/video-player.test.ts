// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { type PlayVideoOptions, playVideo } from './video-player.js'

const src = '/assets/opening.mp4'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function mediaPort() {
  return {
    play: vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined),
    pause: vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {}),
  }
}

function requireVideo(root: ParentNode) {
  const video = root.querySelector('video')
  if (!video) throw new Error('playback did not mount the media element')
  return video
}

function dispatchKey(code: string) {
  const event = new KeyboardEvent('keydown', { code, cancelable: true })
  window.dispatchEvent(event)
  return event
}

function startPlayback(options: Partial<PlayVideoOptions> = {}) {
  const owner = new AbortController()
  const pending = playVideo({ src, signal: owner.signal, ...options })
  return {
    owner,
    pending,
    close: async () => {
      owner.abort()
      await pending
    },
  }
}

test('default playback mounts an inline video and releases the global skip key when it ends', async () => {
  const { play, pause } = mediaPort()
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const playback = startPlayback({ muted: true })
  const onKey = vi.fn()
  window.addEventListener('keydown', onKey, { signal: playback.owner.signal })
  try {
    const video = requireVideo(document.body)
    expect(video.getAttribute('src')).toBe(src)
    expect(video.parentElement).toBe(document.body)
    expect([video.muted, video.autoplay, video.controls, video.playsInline]).toEqual([
      true,
      false,
      false,
      true,
    ])
    expect([video.style.position, video.style.objectFit]).toEqual(['fixed', 'contain'])
    expect(play).toHaveBeenCalledTimes(1)
    video.dispatchEvent(new Event('ended'))
    await expect(playback.pending).resolves.toBeUndefined()
    expect(video.isConnected).toBe(false)
    video.dispatchEvent(new Event('error'))
    expect(warn).not.toHaveBeenCalled()
    expect(pause).toHaveBeenCalledTimes(1)
    const key = dispatchKey('Space')
    expect(key.defaultPrevented).toBe(false)
    expect(onKey).toHaveBeenCalledExactlyOnceWith(key)
  } finally {
    await playback.close()
  }
})

test('a decode error reports once, removes the video and completes playback', async () => {
  const { pause } = mediaPort()
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const playback = startPlayback()
  try {
    const video = requireVideo(document.body)
    video.dispatchEvent(new Event('error'))
    await expect(playback.pending).resolves.toBeUndefined()
    expect(video.isConnected).toBe(false)
    video.dispatchEvent(new Event('error'))
    expect(warn.mock.calls).toEqual([[`[video-player] load/decode failed: ${src}`]])
    expect(pause).toHaveBeenCalledTimes(1)
  } finally {
    await playback.close()
  }
})

test.each([
  { mode: 'default', skipKeys: undefined, ignored: 'KeyA', skip: 'Space' },
  { mode: 'configured', skipKeys: ['KeyQ'], ignored: 'Escape', skip: 'KeyQ' },
])('$mode skip blocks only its own key and holds the video for 500 ms', async ({
  skipKeys,
  ignored,
  skip,
}) => {
  mediaPort()
  const container = document.createElement('section')
  document.body.append(container)
  const playback = startPlayback({ containerEl: container, skipKeys })
  const onKey = vi.fn()
  window.addEventListener('keydown', onKey, { signal: playback.owner.signal })
  try {
    const video = requireVideo(container)
    const ignoredEvent = dispatchKey(ignored)
    expect(ignoredEvent.defaultPrevented).toBe(false)
    await vi.advanceTimersByTimeAsync(500)
    expect(video.isConnected).toBe(true)
    const skipEvent = dispatchKey(skip)
    expect(skipEvent.defaultPrevented).toBe(true)
    expect(onKey).toHaveBeenCalledExactlyOnceWith(ignoredEvent)
    await vi.advanceTimersByTimeAsync(499)
    expect(video.isConnected).toBe(true)
    await vi.advanceTimersByTimeAsync(1)
    await expect(playback.pending).resolves.toBeUndefined()
    expect(video.isConnected).toBe(false)
  } finally {
    await playback.close()
    container.remove()
  }
})

test('after autoplay denial, a successful gesture clears the prompt while media is still playing', async () => {
  const { play } = mediaPort()
  play.mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'))
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const container = document.createElement('section')
  document.body.append(container)
  const playback = startPlayback({ containerEl: container })
  try {
    await vi.advanceTimersByTimeAsync(0)
    const prompt = container.querySelector('div')
    if (!prompt) throw new Error('autoplay denial did not display the gesture prompt')
    expect(prompt.textContent).toBe('点击屏幕开始 / Click to start')
    expect(Number(prompt.style.zIndex)).toBeGreaterThan(
      Number(requireVideo(container).style.zIndex),
    )
    prompt.click()
    await vi.advanceTimersByTimeAsync(0)
    expect(play).toHaveBeenCalledTimes(2)
    expect(warn.mock.calls).toEqual([
      ['[video-player] play() rejected (autoplay policy?): NotAllowedError: blocked'],
    ])
    expect(prompt.isConnected).toBe(false)
    requireVideo(container).dispatchEvent(new Event('ended'))
    await expect(playback.pending).resolves.toBeUndefined()
    expect(container.children).toHaveLength(0)
  } finally {
    await playback.close()
    container.remove()
  }
})

test('aborting a live playback releases the media and its prompt', async () => {
  const { play, pause } = mediaPort()
  play.mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'))
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const container = document.createElement('section')
  document.body.append(container)
  const playback = startPlayback({ containerEl: container })
  try {
    await vi.advanceTimersByTimeAsync(0)
    requireVideo(container)
    expect(container.querySelector('div')?.isConnected).toBe(true)
    playback.owner.abort()
    await expect(playback.pending).resolves.toBeUndefined()
    expect(container.children).toHaveLength(0)
    expect(pause).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls).toEqual([
      ['[video-player] play() rejected (autoplay policy?): NotAllowedError: blocked'],
    ])
  } finally {
    await playback.close()
    container.remove()
  }
})

test('an already aborted playback never mounts or starts the video', async () => {
  const { play } = mediaPort()
  await expect(playVideo({ src, signal: AbortSignal.abort() })).resolves.toBeUndefined()
  expect(document.body.querySelector('video')).toBeNull()
  expect(play).not.toHaveBeenCalled()
})
