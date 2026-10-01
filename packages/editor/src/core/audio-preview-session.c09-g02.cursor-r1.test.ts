/**
 * C09-G02：audio-preview-session owner 分支（排重单测 combined 场景，逐轴拆分）。
 */
import { describe, expect, test, vi } from 'vitest'
import {
  claimEditorAudioPreview,
  isEditorAudioPreviewOwner,
  releaseEditorAudioPreview,
  stopEditorAudioPreview,
} from './audio-preview-session.js'

describe('C09-G02 编辑器试听 owner', () => {
  test('C09-G02-01 首次 claim 不调用 stop', () => {
    const owner = { stop: vi.fn() }
    claimEditorAudioPreview(owner)
    expect(owner.stop).not.toHaveBeenCalled()
    stopEditorAudioPreview()
  })

  test('C09-G02-02 重复 claim 同一 owner 幂等', () => {
    const owner = { stop: vi.fn() }
    claimEditorAudioPreview(owner)
    claimEditorAudioPreview(owner)
    expect(owner.stop).not.toHaveBeenCalled()
    stopEditorAudioPreview()
  })

  test('C09-G02-03 新 owner 停止旧 owner', () => {
    const first = { stop: vi.fn() }
    const second = { stop: vi.fn() }
    claimEditorAudioPreview(first)
    claimEditorAudioPreview(second)
    expect(first.stop).toHaveBeenCalledOnce()
    expect(isEditorAudioPreviewOwner(second)).toBe(true)
    stopEditorAudioPreview()
  })

  test('C09-G02-04 release 活动 owner 后 isOwner 为 false', () => {
    const owner = { stop: vi.fn() }
    claimEditorAudioPreview(owner)
    releaseEditorAudioPreview(owner)
    expect(isEditorAudioPreviewOwner(owner)).toBe(false)
    stopEditorAudioPreview()
  })

  test('C09-G02-05 release 非活动 owner 不影响当前 owner', () => {
    const active = { stop: vi.fn() }
    const other = { stop: vi.fn() }
    claimEditorAudioPreview(active)
    releaseEditorAudioPreview(other)
    expect(isEditorAudioPreviewOwner(active)).toBe(true)
    stopEditorAudioPreview()
  })

  test('C09-G02-06 stop 在无 owner 时安全', () => {
    stopEditorAudioPreview()
    stopEditorAudioPreview()
  })

  test('C09-G02-07 stop 后新 claim 可立即生效', () => {
    const first = { stop: vi.fn() }
    const second = { stop: vi.fn() }
    claimEditorAudioPreview(first)
    stopEditorAudioPreview()
    claimEditorAudioPreview(second)
    expect(isEditorAudioPreviewOwner(second)).toBe(true)
    stopEditorAudioPreview()
  })

  test('C09-G02-08 三连 claim 只停止上一个', () => {
    const a = { stop: vi.fn() }
    const b = { stop: vi.fn() }
    const c = { stop: vi.fn() }
    claimEditorAudioPreview(a)
    claimEditorAudioPreview(b)
    claimEditorAudioPreview(c)
    expect(a.stop).toHaveBeenCalledOnce()
    expect(b.stop).toHaveBeenCalledOnce()
    expect(c.stop).not.toHaveBeenCalled()
    stopEditorAudioPreview()
  })

  test('C09-G02-09 release 后 stop 不再调用已释放 owner', () => {
    const owner = { stop: vi.fn() }
    claimEditorAudioPreview(owner)
    releaseEditorAudioPreview(owner)
    stopEditorAudioPreview()
    expect(owner.stop).not.toHaveBeenCalled()
  })

  test('C09-G02-10 stop 对活动 owner 只 stop 一次', () => {
    const owner = { stop: vi.fn() }
    claimEditorAudioPreview(owner)
    stopEditorAudioPreview()
    stopEditorAudioPreview()
    expect(owner.stop).toHaveBeenCalledOnce()
  })
})
