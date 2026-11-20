import { describe, expect, test } from 'vitest'
import { analyzeMidiBytes, createMidiNoteActivity } from './midi-preview.js'

/** Format 0, one C4 note at velocity 64 held for one quarter note. */
function midiBytes(): ArrayBuffer {
  return Uint8Array.from([
    0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x01, 0x00, 0x60, 0x4d, 0x54,
    0x72, 0x6b, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x90, 0x3c, 0x40, 0x60, 0x80, 0x3c, 0x40, 0x00, 0xff,
    0x2f, 0x00,
  ]).buffer
}

describe('analyzeMidiBytes', () => {
  test('半秒 MIDI 音符活动保留默认桶数和实际力度', async () => {
    const activity = await analyzeMidiBytes(midiBytes())
    expect(activity.kind).toBe('note-activity')
    expect(activity.duration).toBeCloseTo(0.5, 3)
    expect(activity.noteCount).toBe(1)
    expect(activity.buckets).toHaveLength(160)
    // 归一化合同：peak = max(1, 实际) → 绝对刻度；vel 64/127 ≈ 0.5039（安静单音不放大）
    const weight = 64 / 127
    for (const v of activity.buckets) expect(v).toBeCloseTo(weight, 3)
  })

  test('自定义桶数不会放大低力度音符', async () => {
    const activity = await analyzeMidiBytes(midiBytes(), 5)
    expect(activity.buckets).toHaveLength(5)
    expect(activity.buckets.every((v) => Math.abs(v - 64 / 127) < 1e-3)).toBe(true)
  })
})

test('analyzeMidiBytes 对非 MIDI 字节 fail-loud', async () => {
  const garbage = new TextEncoder().encode('this is not a midi file at all').buffer as ArrayBuffer
  await expect(analyzeMidiBytes(garbage)).rejects.toThrow()
})

test('overlapping notes contribute to their buckets, while an empty track stays at zero', () => {
  const notes = [
    { start: 0, length: 1, velocity: 127 },
    { start: 1, length: 1, velocity: 64 },
  ]
  const activity = createMidiNoteActivity(notes, 2, 4)
  expect(activity.noteCount).toBe(2)
  const expected = [127 / 191, 127 / 191, 1, 64 / 191]
  expect(activity.buckets).toHaveLength(expected.length)
  for (const [index, value] of expected.entries())
    expect(activity.buckets[index]).toBeCloseTo(value, 12)
  expect(createMidiNoteActivity([], 0, 4).buckets).toEqual([0, 0, 0, 0])
})
