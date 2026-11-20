import { afterEach, expect, test, vi } from 'vitest'
import {
  claimEditorAudioPreview,
  type EditorAudioPreviewOwner,
  isEditorAudioPreviewOwner,
  releaseEditorAudioPreview,
  stopEditorAudioPreview,
} from './audio-preview-session.js'

afterEach(stopEditorAudioPreview)

test('claiming the current preview again leaves it playing', () => {
  const preview = { stop: vi.fn() }
  claimEditorAudioPreview(preview)
  claimEditorAudioPreview(preview)

  expect(isEditorAudioPreviewOwner(preview)).toBe(true)
  expect(preview.stop).not.toHaveBeenCalled()
})

test('switching previews invalidates the old owner before stopping it, then passes ownership', () => {
  const incoming = { stop: vi.fn() }
  const ownershipDuringStop: boolean[][] = []
  const previous: EditorAudioPreviewOwner = {
    stop() {
      ownershipDuringStop.push([
        isEditorAudioPreviewOwner(previous),
        isEditorAudioPreviewOwner(incoming),
      ])
    },
  }
  const another = { stop: vi.fn() }

  claimEditorAudioPreview(previous)
  claimEditorAudioPreview(incoming)
  expect(ownershipDuringStop).toEqual([[false, false]])
  expect(isEditorAudioPreviewOwner(incoming)).toBe(true)

  claimEditorAudioPreview(another)
  expect(ownershipDuringStop).toHaveLength(1)
  expect(incoming.stop).toHaveBeenCalledOnce()
  expect(another.stop).not.toHaveBeenCalled()
  expect(isEditorAudioPreviewOwner(another)).toBe(true)
})

test('finishing an old preview cannot revoke the new one; finishing the new one frees it', () => {
  const previous = { stop: vi.fn() }
  const current = { stop: vi.fn() }
  claimEditorAudioPreview(previous)
  claimEditorAudioPreview(current)

  releaseEditorAudioPreview(previous)
  expect(isEditorAudioPreviewOwner(current)).toBe(true)

  releaseEditorAudioPreview(current)
  expect(isEditorAudioPreviewOwner(current)).toBe(false)
  stopEditorAudioPreview()
  expect(current.stop).not.toHaveBeenCalled()
})

test('a project-wide stop releases the owner once and leaves the next preview free to start', () => {
  const prior = { stop: vi.fn() }
  const next = { stop: vi.fn() }
  claimEditorAudioPreview(prior)

  stopEditorAudioPreview()
  stopEditorAudioPreview()
  expect(isEditorAudioPreviewOwner(prior)).toBe(false)
  expect(prior.stop).toHaveBeenCalledOnce()

  claimEditorAudioPreview(next)
  expect(isEditorAudioPreviewOwner(next)).toBe(true)
  expect(prior.stop).toHaveBeenCalledOnce()
  expect(next.stop).not.toHaveBeenCalled()
})
