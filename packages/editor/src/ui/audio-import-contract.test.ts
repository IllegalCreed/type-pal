import type { AssetCatalogV1 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { encodeWavPcm16, fileOfBytes, SINGLE_NOTE_MIDI } from '../__tests__/audio-fixtures.js'
import { assertMidi, authoredMidiRecord, nextMusicId } from './MusicTab.js'
import { assertWave, authoredSoundId, authoredWaveRecord } from './SoundTab.js'

const WAV = encodeWavPcm16([0, 0.25, -0.25, 0])
const MIDI_HASH = '04b065465eb567e3b39dc6e745e31dd5d900998be9d8b23d875d6ec6ff0b0263'
const WAV_HASH = '01e0f46404cf7dc73c3a633f91e80b1347c0495a754db1bc2c3502b07a3275bf'

describe('Audio import records', () => {
  test('derives a MIDI record from real bytes and skips every occupied ordinal', async () => {
    const prepared = await authoredMidiRecord(
      fileOfBytes('battle.MID', 'audio/midi', SINGLE_NOTE_MIDI),
      '战斗主题',
    )
    expect(prepared.hash).toBe(MIDI_HASH)
    expect(new Uint8Array(prepared.bytes)).toEqual(SINGLE_NOTE_MIDI)
    expect(prepared.record).toEqual({
      kind: 'music',
      path: `assets/authored/${MIDI_HASH}.mid`,
      mediaType: 'audio/midi',
      bytes: SINGLE_NOTE_MIDI.byteLength,
      sha256: MIDI_HASH,
      label: '战斗主题',
      origin: { kind: 'authored', ref: 'battle.MID' },
    })

    const base = 'music.authored.04b065465eb567e3'
    const catalog: AssetCatalogV1 = { version: 1, assets: {} }
    expect(nextMusicId(catalog, MIDI_HASH)).toBe(base)
    catalog.assets[base] = prepared.record
    expect(nextMusicId(catalog, MIDI_HASH)).toBe(`${base}-2`)
    catalog.assets[`${base}-2`] = prepared.record
    expect(nextMusicId(catalog, MIDI_HASH)).toBe(`${base}-3`)
  })

  test('derives the same WAV identity from the bytes under different file names', async () => {
    const prepared = await authoredWaveRecord(fileOfBytes('hit.WAV', 'audio/wav', WAV), undefined)
    const renamed = await authoredWaveRecord(fileOfBytes('copy.wav', 'audio/wav', WAV), '命中')
    expect(prepared.hash).toBe(WAV_HASH)
    expect(authoredSoundId(prepared.hash)).toBe('sound.authored.01e0f46404cf7dc7')
    expect(new Uint8Array(prepared.bytes)).toEqual(WAV)
    expect(prepared.record).toEqual({
      kind: 'sound',
      path: `assets/authored/${WAV_HASH}.wav`,
      mediaType: 'audio/wav',
      bytes: WAV.byteLength,
      sha256: WAV_HASH,
      label: 'hit',
      origin: { kind: 'authored', ref: 'hit.WAV' },
    })
    expect(renamed.hash).toBe(WAV_HASH)
    expect(renamed.record).toEqual({
      ...prepared.record,
      label: '命中',
      origin: { kind: 'authored', ref: 'copy.wav' },
    })
  })
})

describe('Audio import container checks', () => {
  test('MIDI requires the named extension and the file header', () => {
    expect(() =>
      assertMidi({ name: 'theme.txt' }, Uint8Array.from(SINGLE_NOTE_MIDI).buffer),
    ).toThrow('只允许导入 .mid')
    const wrongHeader = Uint8Array.from(SINGLE_NOTE_MIDI)
    wrongHeader[0] = 0
    expect(() => assertMidi({ name: 'theme.mid' }, wrongHeader.buffer)).toThrow('不是有效 MIDI')
  })

  test('WAV requires the named extension and both RIFF and WAVE tags', () => {
    expect(() => assertWave({ name: 'hit.mp3' }, Uint8Array.from(WAV).buffer)).toThrow(
      '只允许导入 .wav',
    )
    for (const offset of [0, 8]) {
      const wrongHeader = Uint8Array.from(WAV)
      wrongHeader[offset] = 0
      expect(() => assertWave({ name: 'hit.wav' }, wrongHeader.buffer)).toThrow('不是有效 WAV')
    }
    expect(() => assertWave({ name: 'hit.wav' }, WAV.slice(0, 8).buffer)).toThrow('不是有效 WAV')
  })
})
