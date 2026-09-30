// @vitest-environment jsdom
// Q03 · video-player / SfxPlayer 构造门残差（排重：N03 视频生命周期七例与 sfx readiness/
// staged-failures 旧测已证；本文件只补 muted 静音臂、pause 异常容忍臂与 maxDecoded 校验臂）。
// jsdom HTMLMediaElement 无 play/毫无事件吞吐 → 沿用 N03 原型替身补外部媒体 IO。
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { AssetRecordV1 } from '@type-pal/content'
import { playVideo } from './video-player.js'
import { SfxPlayer } from './audio/sfx.js'

let videos: HTMLVideoElement[] = []
let pauseSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  videos = []
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLVideoElement) {
    videos.push(this)
    return Promise.resolve()
  })
  pauseSpy = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

const liveVideo = (): HTMLVideoElement => {
  const found = videos.at(-1)
  if (!found) throw new Error('no video created yet')
  return found
}

test('Q03 视频静音播放：video.muted 置真、ended 后清理兑现', async () => {
  const done = playVideo({ src: 'videos/q3.mp4', muted: true })
  const video = liveVideo()
  expect(video.muted).toBe(true)
  video.dispatchEvent(new Event('ended'))
  await done
  expect(document.querySelector('video')).toBeNull()
})

test('Q03 cleanup 中 video.pause 抛错被容忍：层移除且 Promise 照常兑现', async () => {
  const done = playVideo({ src: 'videos/q3.mp4' })
  const video = liveVideo()
  pauseSpy.mockImplementationOnce(() => {
    throw new DOMException('already paused', 'InvalidStateError')
  })
  video.dispatchEvent(new Event('ended'))
  await done
  expect(document.querySelector('video')).toBeNull()
})

test('Q03 SfxPlayer maxDecoded 非正整数逐臂精确拒绝；无适配器给出降级告警', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const record: AssetRecordV1 = {
    kind: 'effect-sprite',
    path: 'assets/generated/fx.rle',
    mediaType: 'application/vnd.type-pal.rle',
    bytes: 0,
    sha256: '',
    origin: { kind: 'generated' },
  }
  const reader = {
    record: (): AssetRecordV1 => record,
    readBytes: async (): Promise<ArrayBuffer> => new ArrayBuffer(0),
  }
  for (const bad of [0, -1, 1.5, Number.NaN]) {
    expect(() => new SfxPlayer(reader, undefined, bad)).toThrow(
      `SfxPlayer maxDecoded 必须是正整数，收到 ${String(bad)}`,
    )
  }
  expect(new SfxPlayer(reader, undefined, 1)).toBeDefined()
  expect(warn).toHaveBeenCalledWith('[sfx] AudioContext 不可用，音效播放器停用')
})
