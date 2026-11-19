import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { loadPalSoundAssets } from './pal-assets.js'

const repo = fileURLToPath(new URL('../../../', import.meta.url))

describe('PAL sound 提取闭包', () => {
  test('metadata、asset-manifest 与目录精确闭合为 363 个 RIFF/WAVE', () => {
    const loaded = loadPalSoundAssets(repo)
    expect(loaded.report).toEqual({ sounds: 363, emptySounds: 142, soundBytes: 18_110_864 })
    expect(loaded.binaries).toHaveLength(363)
    expect(new Set(loaded.binaries.map((source) => source.id)).size).toBe(363)
    expect(loaded.binaries.find((source) => source.id === 'sound.pal.122')).toBeUndefined()
    expect(loaded.binaries.find((source) => source.id === 'sound.pal.045')?.record).toMatchObject({
      kind: 'sound',
      path: 'assets/migrated/sounds/045.wav',
      mediaType: 'audio/wav',
      origin: { kind: 'legacy-migrated', ref: 'sounds/45.wav' },
    })
  })
})
