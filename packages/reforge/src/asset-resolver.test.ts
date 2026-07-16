import type { AssetCatalogV1 } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import { AssetResolver } from './asset-resolver.js'
import type { FileSource } from './file-source.js'

const catalog: AssetCatalogV1 = {
  version: 1,
  assets: {
    song: {
      kind: 'music',
      path: 'assets/authored/song.mid',
      mediaType: 'audio/midi',
      bytes: 3,
      sha256: 'a'.repeat(64),
      origin: { kind: 'authored' },
    },
    sf: {
      kind: 'soundfont',
      path: 'assets/runtime/main.sf3',
      mediaType: 'audio/sf3',
      bytes: 4,
      sha256: 'b'.repeat(64),
      origin: { kind: 'licensed' },
    },
  },
}

function source(): FileSource {
  const bytes = vi.fn(async (path: string) => new TextEncoder().encode(path).buffer)
  return {
    readText: async (path) => path,
    readJson: async <T>() => ({}) as T,
    readBytes: bytes,
    urlFor: async (path) => `blob:${path}`,
    dispose: vi.fn(),
  }
}

describe('AssetResolver', () => {
  const roles = {
    'audio.midiSoundfont': 'sf',
    'audio.defaultBattleMusic': 'song',
    'audio.bossVictoryMusic': 'song',
    'audio.normalVictoryMusic': 'song',
    'audio.openingMenuMusic': 'song',
  } as const

  test('AssetId 与角色只经 catalog 显式 path 读取', async () => {
    const io = source()
    const resolver = new AssetResolver('demo', catalog, roles, io)
    await resolver.readBytes('song', 'music')
    await resolver.readRoleBytes('audio.midiSoundfont')
    expect(io.readBytes).toHaveBeenNthCalledWith(1, 'assets/authored/song.mid')
    expect(io.readBytes).toHaveBeenNthCalledWith(2, 'assets/runtime/main.sf3')
  })

  test('缺 id、kind 错和读取失败都带工程/id/kind/path 上下文', async () => {
    const io = source()
    const resolver = new AssetResolver('demo', catalog, roles, io)
    expect(() => resolver.record('missing', 'music')).toThrow(/demo.*missing.*music/)
    expect(() => resolver.record('song', 'soundfont')).toThrow(/song.*soundfont.*music.*song\.mid/)
    io.readBytes = async () => {
      throw new Error('NotFound')
    }
    await expect(resolver.readBytes('song', 'music')).rejects.toThrow(
      /demo.*song.*music.*assets\/authored\/song\.mid.*NotFound/,
    )
  })

  test('dispose 委托给 source，切工程可释放其 URL', () => {
    const io = source()
    new AssetResolver('demo', catalog, roles, io).dispose()
    expect(io.dispose).toHaveBeenCalledOnce()
  })
})
