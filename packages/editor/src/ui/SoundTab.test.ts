import { describe, expect, test } from 'vitest'
import { assertWave, authoredSoundId, authoredWaveRecord } from './SoundTab.js'

function waveBytes(): ArrayBuffer {
  const bytes = new Uint8Array(44)
  bytes.set(new TextEncoder().encode('RIFF'), 0)
  bytes.set(new TextEncoder().encode('WAVE'), 8)
  return bytes.buffer
}

function waveFile(name = 'hit.wav'): File {
  return new File([waveBytes()], name, { type: 'audio/wav' })
}

describe('A7-1 SoundTab WAV 导入', () => {
  test('同内容生成稳定 AssetId 与 sound catalog record', async () => {
    const first = await authoredWaveRecord(waveFile(), undefined)
    const second = await authoredWaveRecord(waveFile('copy.wav'), undefined)

    expect(first.hash).toBe(second.hash)
    expect(authoredSoundId(first.hash)).toBe(authoredSoundId(second.hash))
    expect(authoredSoundId(first.hash)).toMatch(/^sound\.authored\.[a-f0-9]{16}$/)
    expect(first.record).toMatchObject({
      kind: 'sound',
      mediaType: 'audio/wav',
      bytes: 44,
      sha256: first.hash,
      label: 'hit',
      origin: { kind: 'authored', ref: 'hit.wav' },
    })
    expect(first.record.path).toBe(`assets/authored/${first.hash}.wav`)
  })

  test('扩展名和 RIFF/WAVE 双魔数都必须正确', () => {
    expect(() => assertWave({ name: 'hit.mp3' }, waveBytes())).toThrow('只允许导入 .wav')
    expect(() => assertWave({ name: 'hit.wav' }, new Uint8Array(44).buffer)).toThrow('不是有效 WAV')
  })
})
