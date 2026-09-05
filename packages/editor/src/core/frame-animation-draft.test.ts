import {
  decodeFrameSequenceFrame,
  encodeFrameSequence,
  parseFrameSequence,
} from '@type-pal/content'
import { describe, expect, it } from 'vitest'
import {
  commitDraftHistory,
  createDraftHistory,
  createFrameAnimationDraft,
  deleteDraftFrames,
  draftDurationMs,
  draftFrameMetadata,
  duplicateDraftFrame,
  frameSelectionAfterReorder,
  insertDraftFrames,
  moveDraftFrame,
  quantizeCompleteFrame,
  redoDraftHistory,
  replaceDraftFrame,
  resolveDraftFrame,
  setDraftFrameDuration,
  undoDraftHistory,
} from './frame-animation-draft.js'

function pixels(...values: number[]): Uint8Array {
  return Uint8Array.from(values)
}

const red = pixels(255, 0, 0, 255)
const green = pixels(0, 255, 0, 255)
const blue = pixels(0, 0, 255, 255)

function draft() {
  return createFrameAnimationDraft({
    width: 1,
    height: 1,
    defaultFrameMs: 40,
    frames: [
      { id: 'a', source: { kind: 'pixels', rgba: red } },
      { id: 'b', source: { kind: 'pixels', rgba: green }, durationMs: 60 },
    ],
  })
}

describe('frame animation draft', () => {
  it('以结构共享完成完整帧编辑和撤销重做', () => {
    const base = draft()
    const changed = setDraftFrameDuration(
      replaceDraftFrame(base, 0, { kind: 'pixels', rgba: blue }),
      0,
      80,
    )
    expect(changed.frames[1]).toBe(base.frames[1])
    const moved = moveDraftFrame(duplicateDraftFrame(changed, 0, 'copy'), 1, 2)
    expect(moved.frames.map((frame) => frame.id)).toEqual(['a', 'b', 'copy'])
    const trimmed = deleteDraftFrames(moved, [1])
    expect(trimmed.frames.map((frame) => frame.id)).toEqual(['a', 'copy'])
    expect(draftDurationMs(trimmed)).toBe(160)

    let history = createDraftHistory(base)
    history = commitDraftHistory(history, changed)
    expect(undoDraftHistory(history).present).toBe(base)
    expect(redoDraftHistory(undoDraftHistory(history)).present).toBe(changed)
  })

  it('一次重排历史让 active/anchor 跟随来源帧，且 undo/redo 对称', () => {
    const base = duplicateDraftFrame(draft(), 1, 'c')
    const moved = moveDraftFrame(base, 0, 2)
    const multi = new Set(['a', 'c'])
    const followed = frameSelectionAfterReorder(moved.frames, 'a', multi)
    expect(followed).toEqual({
      selectedFrameIds: multi,
      selectedIndex: 2,
      selectionAnchor: 2,
    })
    const collapsed = frameSelectionAfterReorder(moved.frames, 'b', new Set(['a']))
    expect([...collapsed.selectedFrameIds]).toEqual(['b'])
    expect(collapsed.selectedIndex).toBe(0)
    expect(collapsed.selectionAnchor).toBe(0)

    const history = commitDraftHistory(createDraftHistory(base), moved)
    expect(history.past).toHaveLength(1)
    expect(undoDraftHistory(history).present.frames.map((frame) => frame.id)).toEqual([
      'a',
      'b',
      'c',
    ])
    expect(
      redoDraftHistory(undoDraftHistory(history)).present.frames.map((frame) => frame.id),
    ).toEqual(['b', 'c', 'a'])
  })

  it('拒绝尺寸错误、重复 id 和删除全部帧', () => {
    expect(() =>
      insertDraftFrames(draft(), 1, [{ id: 'a', source: { kind: 'pixels', rgba: blue } }]),
    ).toThrow(/重复/)
    expect(() => replaceDraftFrame(draft(), 0, { kind: 'pixels', rgba: pixels(1, 2, 3) })).toThrow(
      /4 字节/,
    )
    expect(() => deleteDraftFrames(draft(), [0, 1])).toThrow(/至少需要一帧/)
  })

  it('保存和重开后每张完整帧逐像素一致', async () => {
    const base = draft()
    const reader = {
      async frame() {
        return { width: 1, height: 1, rgba: red }
      },
    }
    const frames = await Promise.all(
      base.frames.map(async (_frame, index) => ({
        rgba: await resolveDraftFrame(base, index, reader),
        ...draftFrameMetadata(base)[index],
      })),
    )
    const encoded = await encodeFrameSequence(
      { width: 1, height: 1, defaultFrameMs: 40, frames },
      (bytes) => bytes,
    )
    const reopened = parseFrameSequence(encoded)
    await expect(decodeFrameSequenceFrame(reopened, 0, (bytes) => bytes)).resolves.toEqual(red)
    await expect(decodeFrameSequenceFrame(reopened, 1, (bytes) => bytes)).resolves.toEqual(green)
    expect(reopened.index.frames).toEqual([{}, { durationMs: 60 }])
  })

  it('按最近色或误差扩散量化完整 RGBA 帧并保留 alpha', () => {
    const source = pixels(220, 10, 10, 255, 10, 230, 10, 127)
    const palette = [
      [255, 0, 0],
      [0, 255, 0],
    ] as const
    expect([...quantizeCompleteFrame(source, 2, 1, palette, 'nearest')]).toEqual([
      255, 0, 0, 255, 0, 255, 0, 127,
    ])
    expect(quantizeCompleteFrame(source, 2, 1, palette, 'floyd-steinberg')[3]).toBe(255)
  })
})
