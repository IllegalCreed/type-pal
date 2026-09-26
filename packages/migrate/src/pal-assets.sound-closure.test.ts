import { readdirSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import { json, manifestPath, put, soundFixture } from './__tests__/pal-asset-fixtures.js'

describe('PAL sound three-way closure', () => {
  test('rejects malformed manifest files', () => {
    const f = soundFixture()
    json(f.repo, manifestPath, { files: {} })
    expect(f.run).toThrow('PAL asset-manifest.files 期望数组')
  })
  test('numeric aliases cannot duplicate one manifest sound', () => {
    const f = soundFixture()
    f.manifest.files.push({ path: 'sounds/045.wav', size: 48 })
    f.save()
    expect(f.run).toThrow('PAL asset-manifest 重复 sound 45')
  })
  test.each(['notes.txt', '46.WAV'])('rejects noncanonical directory member %s', (name) => {
    const f = soundFixture()
    put(f.repo, `data/extracted/sounds/${name}`, f.bytes)
    expect(readdirSync(resolve(f.repo, 'data/extracted/sounds'))).toContain(name)
    expect(f.run).toThrow(`PAL sounds 目录出现非规范文件 ${name}`)
  })
  test('numeric aliases cannot duplicate one directory sound', () => {
    const f = soundFixture()
    put(f.repo, 'data/extracted/sounds/045.wav', f.bytes)
    expect(f.run).toThrow('PAL sounds 目录重复 sound 45')
  })
  test.each([
    'manifest',
    'directory',
  ] as const)('%s missing and extra IDs are reported together', (domain) => {
    const f = soundFixture()
    if (domain === 'manifest') {
      f.manifest.files[1]!.path = 'sounds/2.wav'
      f.save()
    } else {
      unlinkSync(resolve(f.repo, 'data/extracted/sounds/45.wav'))
      put(f.repo, 'data/extracted/sounds/2.wav', f.bytes)
    }
    expect(f.run).toThrow(
      `${domain === 'manifest' ? 'PAL asset-manifest sounds' : 'PAL sounds 目录'} 与 metadata 不闭包：missing=45 extra=2`,
    )
  })
  test.each([
    'file',
    'manifest',
    'metadata',
  ] as const)('rejects independent %s size drift', (axis) => {
    const f = soundFixture()
    if (axis === 'file') put(f.repo, 'data/extracted/sounds/45.wav', f.bytes.subarray(0, 47))
    if (axis === 'manifest') f.manifest.files[1]!.size++
    if (axis === 'metadata') f.metadata.chunks[45]!.size++
    f.save()
    expect(f.run).toThrow('PAL sound 45: metadata/manifest/文件 size 不一致')
  })
  test.each([
    'short',
    'RIFF',
    'WAVE',
  ] as const)('size-consistent %s header corruption is still rejected', (axis) => {
    const f = soundFixture()
    const bytes = axis === 'short' ? f.bytes.subarray(0, 11) : Buffer.from(f.bytes)
    if (axis !== 'short') bytes[axis === 'RIFF' ? 0 : 8] = 0
    put(f.repo, 'data/extracted/sounds/45.wav', bytes)
    f.manifest.files[1]!.size = bytes.length
    f.metadata.chunks[45]!.size = bytes.length
    f.save()
    expect(f.run).toThrow('PAL sound 45: 不是 RIFF/WAVE 文件')
  })
})
