import { expect, test, vi } from 'vitest'
import {
  commitDraftHistory,
  createDraftHistory,
  createFrameAnimationDraft,
  deleteDraftFrames,
  draftDurationMs,
  draftFrameDurationMs,
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

function draftWithBorrowedFrame(): FrameAnimationDraft {
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
test('asset frame awaits its reader and keeps the exact RGBA view', async () => {
  const input = draftWithBorrowedFrame(),
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
  expect(input).toEqual(before)
})

test('a reader failure reaches the caller unchanged without publishing a new draft', async () => {
  const input = draftWithBorrowedFrame()
  const before = structuredClone(input)
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
  const input = draftWithBorrowedFrame(),
    before = structuredClone(input)
  await expect(resolveDraftFrame(input, 1, { frame: async () => loaded })).rejects.toThrow(error)
  expect(input).toEqual(before)
})
test('fractional frame durations are valid; removing an override inherits the new default', () => {
  const input = draftWithBorrowedFrame(),
    before = structuredClone(input)
  expect(draftFrameDurationMs(input, 1)).toBe(20.25)
  expect(setDraftDefaultFrameMs(input, 40.5)).toBe(input)
  expect(setDraftColorTreatment(input, 'preserve')).toBe(input)
  expect(setDraftFrameDuration(input, 1, 20.25)).toBe(input)
  const changed = setDraftDefaultFrameMs(setDraftFrameDuration(input, 1), 60.5)
  expect(draftFrameDurationMs(changed, 1)).toBe(60.5)
  expect(changed.frames[1]).not.toHaveProperty('durationMs')
  expect(setDraftColorTreatment(changed, 'project-standard').colorTreatment).toBe(
    'project-standard',
  )
  expect(input).toEqual(before)
})
test('a new edit after undo clears nonempty redo, while same-present commits and empty undo/redo are no-ops', () => {
  const a = draftWithBorrowedFrame(),
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
  [
    'replace',
    (d: FrameAnimationDraft) =>
      replaceDraftFrame(d, 2, { kind: 'pixels', rgba: new Uint8Array(4) }),
  ],
  ['delete', (d: FrameAnimationDraft) => deleteDraftFrames(d, [0.5])],
  ['move', (d: FrameAnimationDraft) => moveDraftFrame(d, 0, 2)],
  ['duration', (d: FrameAnimationDraft) => setDraftFrameDuration(d, 2, 1)],
] as const)('invalid %s preserves every frame and metadata field', (_label, operation) => {
  const input = draftWithBorrowedFrame(),
    before = structuredClone(input)
  expect(() => operation(input)).toThrow('越界')
  expect(input).toEqual(before)
})
test('empty structural edits reuse the draft and unknown selection source is rejected', () => {
  const input = draftWithBorrowedFrame(),
    before = structuredClone(input)
  expect(insertDraftFrames(input, 0, [])).toBe(input)
  expect(deleteDraftFrames(input, [])).toBe(input)
  expect(moveDraftFrame(input, 0, 0)).toBe(input)
  expect(() => frameSelectionAfterReorder(input.frames, 'missing', new Set(['a']))).toThrow(
    '来源帧 missing 不存在',
  )
  expect(input).toEqual(before)
})

const localFrame = (id: string, shade: number, durationMs?: number) => ({
  id,
  source: { kind: 'pixels', rgba: Uint8Array.of(shade, 0, 0, 255) } as const,
  ...(durationMs === undefined ? {} : { durationMs }),
})

function timeline() {
  return createFrameAnimationDraft({
    width: 1,
    height: 1,
    defaultFrameMs: 40,
    frames: [localFrame('a', 1), localFrame('b', 2, 70), localFrame('c', 3)],
  })
}

test('inserting frame groups at the front, middle or end retains each timing override', () => {
  const original = timeline()
  const inserted = insertDraftFrames(original, 0, [localFrame('first', 9, 25)])
  const middle = insertDraftFrames(inserted, 3, [localFrame('m1', 7, 11), localFrame('m2', 8)])
  const extended = insertDraftFrames(middle, middle.frames.length, [localFrame('last', 6)])
  expect(draftDurationMs(original)).toBe(150)
  expect(draftDurationMs(inserted)).toBe(175)
  expect(draftDurationMs(middle)).toBe(226)
  expect(draftDurationMs(extended)).toBe(266)
  expect(
    extended.frames.map((frame, index) => [frame.id, draftFrameDurationMs(extended, index)]),
  ).toEqual([
    ['first', 25],
    ['a', 40],
    ['b', 70],
    ['m1', 11],
    ['m2', 40],
    ['c', 40],
    ['last', 40],
  ])
  expect(original.frames.map(({ id }) => id)).toEqual(['a', 'b', 'c'])
})

test('deleting an override removes its time; nonadjacent removal preserves the remaining frame identities', () => {
  const original = timeline()
  const trimmed = deleteDraftFrames(original, [1])
  expect(trimmed.frames).toEqual([original.frames[0], original.frames[2]])
  expect(draftDurationMs(trimmed)).toBe(80)

  const extended = insertDraftFrames(original, 3, [localFrame('d', 5, 90)])
  const selected = deleteDraftFrames(extended, [0, 2, 0])
  expect(selected.frames.map(({ id, durationMs }) => [id, durationMs])).toEqual([
    ['b', 70],
    ['d', 90],
  ])
  expect(draftDurationMs(selected)).toBe(160)
})

test('replacing a frame preserves its timing and leaves the unchanged frame objects shared', async () => {
  const original = timeline()
  const replacement = localFrame('unused', 99)
  const edited = replaceDraftFrame(original, 1, replacement.source)
  expect(edited.frames.map(({ id, durationMs }) => [id, durationMs])).toEqual([
    ['a', undefined],
    ['b', 70],
    ['c', undefined],
  ])
  expect(draftDurationMs(edited)).toBe(150)
  expect(edited.frames[0]).toBe(original.frames[0])
  expect(edited.frames[2]).toBe(original.frames[2])
  expect(original.frames[1]?.source).not.toBe(replacement.source)
  const readFromDisk = vi.fn<() => Promise<never>>(() =>
    Promise.reject(new Error('local frame must not load a resource')),
  )
  await expect(resolveDraftFrame(edited, 1, { frame: readFromDisk })).resolves.toEqual(
    Uint8Array.of(99, 0, 0, 255),
  )
  expect(readFromDisk).not.toHaveBeenCalled()
})

test('reorder follows the dragged frame id, retains a multi-selection and is a single undo step', () => {
  const original = timeline()
  const moved = moveDraftFrame(original, 0, 2)
  expect(moved.frames.map(({ id, durationMs }) => [id, durationMs])).toEqual([
    ['b', 70],
    ['c', undefined],
    ['a', undefined],
  ])
  expect(draftDurationMs(moved)).toBe(150)
  expect(frameSelectionAfterReorder(moved.frames, 'a', new Set(['a', 'c']))).toEqual({
    selectedFrameIds: new Set(['a', 'c']),
    selectedIndex: 2,
    selectionAnchor: 2,
  })
  expect(frameSelectionAfterReorder(moved.frames, 'b', new Set(['a', 'c']))).toEqual({
    selectedFrameIds: new Set(['b']),
    selectedIndex: 0,
    selectionAnchor: 0,
  })
  const committed = commitDraftHistory(createDraftHistory(original), moved)
  const undone = undoDraftHistory(committed)
  expect(undone.present).toBe(original)
  expect(undoDraftHistory(undone)).toBe(undone)
  expect(redoDraftHistory(undone).present).toBe(moved)
})

test('structure edits reject duplicate ids, short RGBA frames or deletion of the entire draft', () => {
  const original = timeline()
  const before = structuredClone(original)
  expect(() => insertDraftFrames(original, 1, [localFrame('a', 4)])).toThrow(
    '帧 1 的内部 id 为空或重复',
  )
  expect(() =>
    replaceDraftFrame(original, 0, { kind: 'pixels', rgba: Uint8Array.of(1, 2, 3) }),
  ).toThrow('帧 0 像素 应为 4 字节')
  expect(() => deleteDraftFrames(original, [0, 1, 2])).toThrow('帧动画至少需要一帧')
  expect(original).toEqual(before)
})
