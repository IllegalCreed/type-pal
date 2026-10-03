/**
 * C09-G04：SoundTab 策略纯函数（排重 SoundTab.test 稳定 id 与 assertWave 基础）。
 */
import { describe, expect, test } from 'vitest'
import { encodeWavPcm16, fileOfBytes } from '../__tests__/cursor-asset-r1/c09-fixtures.js'
import { assertWave, authoredSoundId, authoredWaveRecord } from './SoundTab.js'

const WAVE_BYTES = encodeWavPcm16([0, 0.25, -0.25, 0])

function waveBuffer(): ArrayBuffer {
  return WAVE_BYTES.buffer.slice(
    WAVE_BYTES.byteOffset,
    WAVE_BYTES.byteOffset + WAVE_BYTES.byteLength,
  ) as ArrayBuffer
}

describe('C09-G04 SoundTab 策略纯函数', () => {
  test('C09-G04-01 assertWave 接受合法 RIFF/WAVE', () => {
    expect(() => assertWave({ name: 'a.wav' }, waveBuffer())).not.toThrow()
  })

  test('C09-G04-02 assertWave 拒绝 RIFF 无 WAVE', () => {
    const bad = new Uint8Array(12)
    bad.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x58, 0x58, 0x58, 0x58])
    expect(() => assertWave({ name: 'a.wav' }, bad.buffer)).toThrow('不是有效 WAV')
  })

  test('C09-G04-03 assertWave 拒绝过短文件', () => {
    expect(() => assertWave({ name: 'a.wav' }, new ArrayBuffer(8))).toThrow('不是有效 WAV')
  })

  test('C09-G04-04 authoredSoundId 只取 hash 前 16 hex', () => {
    const hash = `${'d'.repeat(16)}${'e'.repeat(48)}`
    expect(authoredSoundId(hash)).toBe(`sound.authored.${'d'.repeat(16)}`)
  })

  test('C09-G04-05 同 hash 两次 authoredSoundId 相等', () => {
    const hash = 'f'.repeat(64)
    expect(authoredSoundId(hash)).toBe(authoredSoundId(hash))
  })

  test('C09-G04-06 authoredWaveRecord kind 为 sound', async () => {
    const file = fileOfBytes('hit.wav', 'audio/wav', WAVE_BYTES)
    const prepared = await authoredWaveRecord(file, undefined)
    expect(prepared.record.kind).toBe('sound')
  })

  test('C09-G04-07 authoredWaveRecord path 含 sha256', async () => {
    const file = fileOfBytes('hit.wav', 'audio/wav', WAVE_BYTES)
    const prepared = await authoredWaveRecord(file, undefined)
    expect(prepared.record.path).toBe(`assets/authored/${prepared.hash}.wav`)
  })

  test('C09-G04-08 authoredWaveRecord 空 label 时用文件名', async () => {
    const file = fileOfBytes('explosion.wav', 'audio/wav', WAVE_BYTES)
    const prepared = await authoredWaveRecord(file, undefined)
    expect(prepared.record.label).toBe('explosion')
  })

  test('C09-G04-09 authoredWaveRecord origin.ref 保留源文件名', async () => {
    const file = fileOfBytes('explosion.wav', 'audio/wav', WAVE_BYTES)
    const prepared = await authoredWaveRecord(file, '别名')
    expect(prepared.record.origin).toEqual({ kind: 'authored', ref: 'explosion.wav' })
  })

  test('C09-G04-10 authoredWaveRecord bytes 字段等于 buffer 长度', async () => {
    const file = fileOfBytes('hit.wav', 'audio/wav', WAVE_BYTES)
    const prepared = await authoredWaveRecord(file, undefined)
    expect(prepared.record.bytes).toBe(WAVE_BYTES.byteLength)
  })
})
