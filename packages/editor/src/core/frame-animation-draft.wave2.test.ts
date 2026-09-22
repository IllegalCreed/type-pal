/** C03/C04: complete frame IO, nonempty history forks and rejected operations. */
import { expect, test, vi } from 'vitest'
import {
  commitDraftHistory,
  createDraftHistory,
  createFrameAnimationDraft,
  deleteDraftFrames,
  draftFrameDurationMs,
  draftFrameMetadata,
  duplicateDraftFrame,
  type FrameAnimationDraft,
  frameSelectionAfterReorder,
  insertDraftFrames,
  moveDraftFrame,
  redoDraftHistory,
  replaceDraftFrame,
  resolveDraftFrame,
  setDraftColorTreatment,
  setDraftDefaultFrameMs,
  setDraftFrameDuration,
  undoDraftHistory,
} from './frame-animation-draft.js'

function draft(): FrameAnimationDraft {
  return createFrameAnimationDraft({
    width: 1,
    height: 1,
    defaultFrameMs: 40.5,
    frames: [
      { id: 'a', source: { kind: 'pixels', rgba: new Uint8Array([1, 2, 3, 4]) } },
      { id: 'b', source: { kind: 'asset', asset: 'frames.b', frameIndex: 2 }, durationMs: 20.25 },
    ],
  })
}
test('asset frame waits for the real reader, preserves its byte view and propagates the same failure', async () => {
  const input = draft(),
    before = structuredClone(input)
  let release!: (value: { width: number; height: number; rgba: Uint8ClampedArray }) => void
  const gate = new Promise<{ width: number; height: number; rgba: Uint8ClampedArray }>(
    (resolve) => {
      release = resolve
    },
  )
  const reader = { frame: vi.fn(() => gate) }
  const pending = resolveDraftFrame(input, 1, reader)
  const observed = { settled: false }
  const consumed = pending.then(() => {
    observed.settled = true
  })
  const bytes = new Uint8ClampedArray([99, 5, 6, 7, 8, 99]).subarray(1, 5)
  try {
    expect(reader.frame).toHaveBeenCalledExactlyOnceWith('frames.b', 2)
    expect(observed.settled).toBe(false)
  } finally {
    release({ width: 1, height: 1, rgba: bytes })
    await consumed
  }
  expect(await pending).toEqual(new Uint8Array([5, 6, 7, 8]))
  const failure = new Error('read failed')
  await expect(
    resolveDraftFrame(input, 1, {
      frame: async () => {
        throw failure
      },
    }),
  ).rejects.toBe(failure)
  expect(input).toEqual(before)
})
test.each([
  {
    label: 'dimensions',
    loaded: { width: 2, height: 1, rgba: new Uint8Array(8) },
    error: '来源帧尺寸 2x1',
  },
  {
    label: 'byte length',
    loaded: { width: 1, height: 1, rgba: new Uint8Array(3) },
    error: '应为 4 字节',
  },
])('asset frame rejects $label and leaves the real draft unchanged', async ({ loaded, error }) => {
  const input = draft(),
    before = structuredClone(input)
  await expect(resolveDraftFrame(input, 1, { frame: async () => loaded })).rejects.toThrow(error)
  expect(input).toEqual(before)
})
test('fractional frame durations are valid; removing an override inherits the new default', () => {
  const input = draft(),
    before = structuredClone(input)
  expect(draftFrameDurationMs(input, 1)).toBe(20.25)
  expect(setDraftDefaultFrameMs(input, 40.5)).toBe(input)
  expect(setDraftColorTreatment(input, 'preserve')).toBe(input)
  expect(setDraftFrameDuration(input, 1, 20.25)).toBe(input)
  const changed = setDraftDefaultFrameMs(setDraftFrameDuration(input, 1), 60.5)
  expect(draftFrameDurationMs(changed, 1)).toBe(60.5)
  expect(draftFrameMetadata(changed)).toEqual([{}, {}])
  expect(setDraftColorTreatment(changed, 'project-standard').colorTreatment).toBe(
    'project-standard',
  )
  expect(input).toEqual(before)
})
test('a new edit after undo clears nonempty redo, while same-present commits and empty undo/redo are no-ops', () => {
  const a = draft(),
    b = setDraftDefaultFrameMs(a, 80),
    c = setDraftColorTreatment(b, 'project-standard')
  const initial = createDraftHistory(a)
  expect(undoDraftHistory(initial)).toBe(initial)
  expect(redoDraftHistory(initial)).toBe(initial)
  const withFuture = undoDraftHistory(commitDraftHistory(commitDraftHistory(initial, b), c))
  const before = structuredClone(withFuture)
  expect(withFuture.future).toEqual([c])
  expect(commitDraftHistory(withFuture, withFuture.present)).toBe(withFuture)
  const d = setDraftDefaultFrameMs(b, 120)
  const branch = commitDraftHistory(withFuture, d, 1)
  expect(branch).toEqual({ past: [b], present: d, future: [] })
  expect(redoDraftHistory(branch)).toBe(branch)
  expect(redoDraftHistory(undoDraftHistory(branch))).toEqual(branch)
  expect(withFuture).toEqual(before)
})
test.each([
  ['insert', (d: FrameAnimationDraft) => insertDraftFrames(d, -1, [])],
  ['duplicate', (d: FrameAnimationDraft) => duplicateDraftFrame(d, 2, 'new')],
  [
    'replace',
    (d: FrameAnimationDraft) =>
      replaceDraftFrame(d, 2, { kind: 'pixels', rgba: new Uint8Array(4) }),
  ],
  ['delete', (d: FrameAnimationDraft) => deleteDraftFrames(d, [0.5])],
  ['move', (d: FrameAnimationDraft) => moveDraftFrame(d, 0, 2)],
  ['duration', (d: FrameAnimationDraft) => setDraftFrameDuration(d, 2, 1)],
] as const)('invalid %s preserves every frame and metadata field', (_label, operation) => {
  const input = draft(),
    before = structuredClone(input)
  expect(() => operation(input)).toThrow('越界')
  expect(input).toEqual(before)
})
test('empty structural edits reuse the draft and unknown selection source is rejected', () => {
  const input = draft(),
    before = structuredClone(input)
  expect(insertDraftFrames(input, 0, [])).toBe(input)
  expect(deleteDraftFrames(input, [])).toBe(input)
  expect(moveDraftFrame(input, 0, 0)).toBe(input)
  expect(() => frameSelectionAfterReorder(input.frames, 'missing', new Set(['a']))).toThrow(
    '来源帧 missing 不存在',
  )
  expect(input).toEqual(before)
})
