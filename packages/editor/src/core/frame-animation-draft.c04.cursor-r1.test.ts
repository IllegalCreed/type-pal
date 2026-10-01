/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C04-G07：frame-animation-draft 时长与结构编辑新轴。
 * 排重：frame-animation-draft.test.ts / wave2 已证历史 fork、非法越界、重排选择对称、
 * 量化与 roundtrip；codex-frame-editor 已证 UI 级 FPS/时长/复制删除。本组只补
 * insert/delete/move/duplicate 与 draftDurationMs、draftFrameMetadata 的组合空隙。
 */
import { describe, expect, test } from 'vitest'
import {
  createFrameAnimationDraft,
  deleteDraftFrames,
  draftDurationMs,
  draftFrameDurationMs,
  draftFrameMetadata,
  duplicateDraftFrame,
  insertDraftFrames,
  moveDraftFrame,
  setDraftDefaultFrameMs,
  setDraftFrameDuration,
} from './frame-animation-draft.js'

function px(...values: number[]): Uint8Array {
  return Uint8Array.from(values)
}

function baseDraft() {
  return createFrameAnimationDraft({
    width: 1,
    height: 1,
    defaultFrameMs: 40,
    frames: [
      { id: 'a', source: { kind: 'pixels', rgba: px(1, 0, 0, 255) } },
      { id: 'b', source: { kind: 'pixels', rgba: px(0, 1, 0, 255) }, durationMs: 70 },
      { id: 'c', source: { kind: 'pixels', rgba: px(0, 0, 1, 255) } },
    ],
  })
}

describe('C04-G07 draft 时长与结构编辑', () => {
  test('C04-G07-01 初始 draftDurationMs 累加默认与 override：40+70+40=150', () => {
    expect(draftDurationMs(baseDraft())).toBe(150)
    expect(draftFrameDurationMs(baseDraft(), 0)).toBe(40)
    expect(draftFrameDurationMs(baseDraft(), 1)).toBe(70)
  })

  test('C04-G07-02 头部 insert 带 override 帧：顺序与总时长同时更新', () => {
    const next = insertDraftFrames(baseDraft(), 0, [
      { id: 'x', source: { kind: 'pixels', rgba: px(9, 9, 9, 255) }, durationMs: 25 },
    ])
    expect(next.frames.map((f) => f.id)).toEqual(['x', 'a', 'b', 'c'])
    expect(draftDurationMs(next)).toBe(175)
    expect(draftFrameMetadata(next)).toEqual([{ durationMs: 25 }, {}, { durationMs: 70 }, {}])
  })

  test('C04-G07-03 尾部 insert 无 override 继承 defaultFrameMs', () => {
    const next = insertDraftFrames(baseDraft(), 3, [
      { id: 'tail', source: { kind: 'pixels', rgba: px(2, 2, 2, 255) } },
    ])
    expect(draftDurationMs(next)).toBe(190)
    expect(draftFrameDurationMs(next, 3)).toBe(40)
  })

  test('C04-G07-04 删除中间 override 帧后总时长回落且 metadata 对齐', () => {
    const trimmed = deleteDraftFrames(baseDraft(), [1])
    expect(trimmed.frames.map((f) => f.id)).toEqual(['a', 'c'])
    expect(draftDurationMs(trimmed)).toBe(80)
    expect(draftFrameMetadata(trimmed)).toEqual([{}, {}])
  })

  test('C04-G07-05 moveDraftFrame 只换序不改各帧 duration 字段', () => {
    const moved = moveDraftFrame(baseDraft(), 0, 2)
    expect(moved.frames.map((f) => f.id)).toEqual(['b', 'c', 'a'])
    expect(moved.frames[0]?.durationMs).toBe(70)
    expect(moved.frames[2]?.durationMs).toBeUndefined()
    expect(draftDurationMs(moved)).toBe(150)
  })

  test('C04-G07-06 duplicateDraftFrame 复制 override 与像素源', () => {
    const dup = duplicateDraftFrame(baseDraft(), 1, 'b-copy')
    expect(dup.frames.map((f) => f.id)).toEqual(['a', 'b', 'b-copy', 'c'])
    expect(dup.frames[2]?.durationMs).toBe(70)
    expect(draftDurationMs(dup)).toBe(220)
  })

  test('C04-G07-07 setDraftDefaultFrameMs 只影响无 override 帧的有效时长', () => {
    const wider = setDraftDefaultFrameMs(baseDraft(), 55)
    expect(draftFrameDurationMs(wider, 0)).toBe(55)
    expect(draftFrameDurationMs(wider, 1)).toBe(70)
    expect(draftDurationMs(wider)).toBe(180)
  })

  test('C04-G07-08 清除 override 后 draftFrameMetadata 该槽回到 {}', () => {
    const cleared = setDraftFrameDuration(baseDraft(), 1, undefined)
    expect(draftFrameMetadata(cleared)[1]).toEqual({})
    expect(draftDurationMs(cleared)).toBe(120)
  })

  test('C04-G07-09 一次 insert 多帧混合 override：metadata 逐槽精确', () => {
    const next = insertDraftFrames(baseDraft(), 2, [
      { id: 'i0', source: { kind: 'pixels', rgba: px(3, 3, 3, 255) }, durationMs: 11 },
      { id: 'i1', source: { kind: 'pixels', rgba: px(4, 4, 4, 255) } },
    ])
    expect(draftFrameMetadata(next)).toEqual([{}, { durationMs: 70 }, { durationMs: 11 }, {}, {}])
    expect(draftDurationMs(next)).toBe(201)
  })

  test('C04-G07-10 连续 delete 非相邻帧保留剩余 override', () => {
    const extended = insertDraftFrames(baseDraft(), 3, [
      { id: 'd', source: { kind: 'pixels', rgba: px(5, 5, 5, 255) }, durationMs: 90 },
    ])
    const trimmed = deleteDraftFrames(extended, [0, 2])
    expect(trimmed.frames.map((f) => f.id)).toEqual(['b', 'd'])
    expect(draftFrameMetadata(trimmed)).toEqual([{ durationMs: 70 }, { durationMs: 90 }])
    expect(draftDurationMs(trimmed)).toBe(160)
  })
})
