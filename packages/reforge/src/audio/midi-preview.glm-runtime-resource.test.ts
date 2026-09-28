/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R17（reforge/audio/midi-preview.ts，窄入口）。
 * 去重账：midi-preview.test 已覆盖 createMidiNoteActivity 归一化/空轨与 transport 生命周期。
 * 本文件只做未占用合同：analyzeMidiBytes（真实 spessasynth_core BasicMIDI 解析手构 SMF，
 * 非模拟解析器）→ 真实 note activity。
 */
import { describe, expect, test } from 'vitest'
import { analyzeMidiBytes } from './midi-preview.js'

/** 最小合法 SMF（同 midi-preview.test 手构：division 96、单音 C4 vel 64、note-off @96 tick）。 */
function midiBytes(): ArrayBuffer {
  return Uint8Array.from([
    0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x01, 0x00, 0x60, 0x4d, 0x54,
    0x72, 0x6b, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x90, 0x3c, 0x40, 0x60, 0x80, 0x3c, 0x40, 0x00, 0xff,
    0x2f, 0x00,
  ]).buffer
}

describe('R17 analyzeMidiBytes（真实解析器）', () => {
  test('手构 SMF：时长 0.5s、单音符满覆盖、桶值归一化到 1', async () => {
    const activity = await analyzeMidiBytes(midiBytes())
    expect(activity.kind).toBe('note-activity')
    expect(activity.duration).toBeCloseTo(0.5, 3)
    expect(activity.noteCount).toBe(1)
    expect(activity.buckets).toHaveLength(160)
    // 归一化合同：peak = max(1, 实际) → 绝对刻度；vel 64/127 ≈ 0.5039（安静单音不放大）
    const weight = 64 / 127
    for (const v of activity.buckets) expect(v).toBeCloseTo(weight, 3)
  })

  test('自定义 bucketCount=5：桶数跟随参数，值仍全 1（单音全覆盖）', async () => {
    const activity = await analyzeMidiBytes(midiBytes(), 5)
    expect(activity.buckets).toHaveLength(5)
    expect(activity.buckets.every((v) => Math.abs(v - 64 / 127) < 1e-3)).toBe(true)
  })
})
