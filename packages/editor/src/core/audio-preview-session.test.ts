import { describe, expect, test, vi } from 'vitest'
import {
  claimEditorAudioPreview,
  isEditorAudioPreviewOwner,
  releaseEditorAudioPreview,
  stopEditorAudioPreview,
} from './audio-preview-session.js'

describe('编辑器试听 owner', () => {
  test('新 owner 会先停止旧 owner，释放和全局停止保持幂等', () => {
    const first = { stop: vi.fn() }
    const second = { stop: vi.fn() }

    claimEditorAudioPreview(first)
    claimEditorAudioPreview(first)
    expect(first.stop).not.toHaveBeenCalled()

    claimEditorAudioPreview(second)
    expect(first.stop).toHaveBeenCalledOnce()
    expect(isEditorAudioPreviewOwner(first)).toBe(false)
    expect(isEditorAudioPreviewOwner(second)).toBe(true)

    releaseEditorAudioPreview(first)
    expect(isEditorAudioPreviewOwner(second)).toBe(true)
    stopEditorAudioPreview()
    stopEditorAudioPreview()
    expect(second.stop).toHaveBeenCalledOnce()
  })
})
