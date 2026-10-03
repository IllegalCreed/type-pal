/**
 * C09-G03：MusicTab 策略纯函数（排重 K07 工作流 UI 链；只证 assertMidi/nextMusicId/record）。
 */
import type { AssetCatalogV1 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { C09_THEME_MIDI, fileOfBytes } from '../__tests__/cursor-asset-r1/c09-fixtures.js'
import { assertMidi, authoredMidiRecord, nextMusicId } from './MusicTab.js'

function emptyCatalog(): AssetCatalogV1 {
  return { version: 1, assets: {} }
}

describe('C09-G03 MusicTab 策略纯函数', () => {
  test('C09-G03-01 assertMidi 接受 .MID 扩展名', () => {
    const bytes = C09_THEME_MIDI.slice().buffer
    expect(() => assertMidi({ name: 'theme.MID' }, bytes)).not.toThrow()
  })

  test('C09-G03-02 assertMidi 拒绝非 mid 扩展名', () => {
    const bytes = new ArrayBuffer(4)
    expect(() => assertMidi({ name: 'theme.txt' }, bytes)).toThrow('只允许导入 .mid')
  })

  test('C09-G03-03 assertMidi 拒绝错误魔数', () => {
    expect(() => assertMidi({ name: 'x.mid' }, new Uint8Array(8).buffer)).toThrow('不是有效 MIDI')
  })

  test('C09-G03-04 nextMusicId 首次分配稳定前缀', () => {
    const hash = 'a'.repeat(64)
    expect(nextMusicId(emptyCatalog(), hash)).toBe(`music.authored.${hash.slice(0, 16)}`)
  })

  test('C09-G03-05 nextMusicId 基 id 占用时分配 -2', () => {
    const hash = 'b'.repeat(64)
    const base = `music.authored.${hash.slice(0, 16)}`
    const catalog = emptyCatalog()
    catalog.assets[base] = {
      kind: 'music',
      path: 'assets/x.mid',
      mediaType: 'audio/midi',
      bytes: 1,
      sha256: hash,
      origin: { kind: 'authored' },
    }
    expect(nextMusicId(catalog, hash)).toBe(`${base}-2`)
  })

  test('C09-G03-06 nextMusicId 跳过已占 -2 取 -3', () => {
    const hash = 'c'.repeat(64)
    const base = `music.authored.${hash.slice(0, 16)}`
    const catalog = emptyCatalog()
    for (const id of [base, `${base}-2`]) {
      catalog.assets[id] = {
        kind: 'music',
        path: 'assets/x.mid',
        mediaType: 'audio/midi',
        bytes: 1,
        sha256: hash,
        origin: { kind: 'authored' },
      }
    }
    expect(nextMusicId(catalog, hash)).toBe(`${base}-3`)
  })

  test('C09-G03-07 authoredMidiRecord 使用文件名去扩展名作 label', async () => {
    const file = fileOfBytes('battle.mid', 'audio/midi', C09_THEME_MIDI)
    const prepared = await authoredMidiRecord(file, undefined)
    expect(prepared.record.label).toBe('battle')
    expect(prepared.record.kind).toBe('music')
  })

  test('C09-G03-08 authoredMidiRecord 显式 label 优先', async () => {
    const file = fileOfBytes('x.mid', 'audio/midi', C09_THEME_MIDI)
    const prepared = await authoredMidiRecord(file, '自定义标题')
    expect(prepared.record.label).toBe('自定义标题')
  })

  test('C09-G03-09 authoredMidiRecord sha256 与 bytes 长度一致', async () => {
    const file = fileOfBytes('x.mid', 'audio/midi', C09_THEME_MIDI)
    const prepared = await authoredMidiRecord(file, undefined)
    expect(prepared.record.bytes).toBe(prepared.bytes.byteLength)
    expect(prepared.record.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(prepared.hash).toBe(prepared.record.sha256)
  })

  test('C09-G03-10 authoredMidiRecord mediaType 为 audio/midi', async () => {
    const file = fileOfBytes('x.mid', 'audio/midi', C09_THEME_MIDI)
    const prepared = await authoredMidiRecord(file, undefined)
    expect(prepared.record.mediaType).toBe('audio/midi')
  })
})
