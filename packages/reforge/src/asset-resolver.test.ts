import { validateAssetCatalog, validateManifestAssetConfig } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import { AssetResolver } from './asset-resolver.js'
import type { FileSource } from './file-source.js'

const videoPath = 'assets/generated/intro.mp4'
const musicPath = 'assets/generated/theme.mid'
const colorPath = 'assets/generated/colors.json'
const soundfontPath = 'assets/runtime/main.sf3'

/** The resolver transfers bytes or text without decoding the actual media format. */
function projectFiles() {
  const video = Uint8Array.of(17, 19).buffer
  const music = Uint8Array.of(23, 29, 31).buffer
  const soundfont = Uint8Array.of(37).buffer
  const colors = '{"version":1,"colors":[]}'
  const catalog = validateAssetCatalog({
    version: 1,
    assets: {
      'video.intro': {
        kind: 'video',
        path: videoPath,
        mediaType: 'video/mp4',
        bytes: video.byteLength,
        sha256: 'a'.repeat(64),
        origin: { kind: 'generated' },
      },
      'music.theme': {
        kind: 'music',
        path: musicPath,
        mediaType: 'audio/midi',
        bytes: music.byteLength,
        sha256: 'b'.repeat(64),
        origin: { kind: 'generated' },
      },
      'soundfont.main': {
        kind: 'soundfont',
        path: 'assets/runtime/main.sf3',
        mediaType: 'audio/sf3',
        bytes: 1,
        sha256: 'c'.repeat(64),
        origin: { kind: 'licensed' },
      },
      'color.standard': {
        kind: 'color-table',
        path: colorPath,
        mediaType: 'application/json',
        bytes: colors.length,
        sha256: 'd'.repeat(64),
        origin: { kind: 'generated' },
      },
    },
  })
  const assets = validateManifestAssetConfig(
    {
      catalog: 'assets/index.json',
      roles: {
        'audio.midiSoundfont': 'soundfont.main',
        'audio.defaultBattleMusic': 'music.theme',
        'audio.bossVictoryMusic': 'music.theme',
        'audio.normalVictoryMusic': 'music.theme',
        'audio.openingMenuMusic': 'music.theme',
        'visual.standardColorTable': 'color.standard',
        'video.startupSplash': 'video.intro',
      },
    },
    catalog,
  )
  const binary = new Map([
    [videoPath, video],
    [musicPath, music],
    [soundfontPath, soundfont],
  ])
  const readBytes = vi.fn(async (path: string) => {
    const bytes = binary.get(path)
    if (!bytes) throw new DOMException(path, 'NotFoundError')
    return bytes
  })
  const readText = vi.fn(async (path: string) => {
    if (path !== colorPath) throw new DOMException(path, 'NotFoundError')
    return colors
  })
  const urlFor = vi.fn(async (path: string) => {
    if (!binary.has(path) && path !== colorPath) throw new DOMException(path, 'NotFoundError')
    return `blob:${path}`
  })
  const source = {
    readBytes,
    readText,
    urlFor,
    async readJson() {
      throw new Error('AssetResolver has no JSON transport entry')
    },
  } satisfies FileSource

  return {
    resolver: new AssetResolver('proj-x', catalog, assets.roles, source),
    catalog,
    assets,
    source,
    video,
    music,
    soundfont,
    colors,
  }
}

describe('asset catalog lookup', () => {
  test('only actual catalog entries can be resolved, including registered built-in names', async () => {
    const { resolver: missing, catalog, assets, source, music } = projectFiles()
    const id = 'constructor'
    expect(() => missing.record(id)).toThrow(
      new Error('工程 "proj-x" 解析 AssetId "constructor" 失败:catalog 无此记录'),
    )
    await expect(missing.readBytes(id, 'music')).rejects.toThrow(
      new Error('工程 "proj-x" 解析 AssetId "constructor" 失败:catalog 无此记录，期望 kind=music'),
    )
    expect(source.readBytes).not.toHaveBeenCalled()

    const registered = validateAssetCatalog({
      ...catalog,
      assets: { ...catalog.assets, [id]: catalog.assets['music.theme'] },
    })
    const resolver = new AssetResolver('proj-x', registered, assets.roles, source)
    expect(resolver.record(id, 'music')).toBe(catalog.assets['music.theme'])
    await expect(resolver.readBytes(id, 'music')).resolves.toBe(music)
    expect(source.readBytes.mock.calls).toEqual([[musicPath]])
  })
})

describe('asset reads and URLs', () => {
  test('passes the registered kind and path through each transport entry', async () => {
    const { resolver, catalog, assets, source, music, video, soundfont, colors } = projectFiles()
    const before = structuredClone({ catalog, assets })

    await expect(resolver.readBytes('music.theme', 'music')).resolves.toBe(music)
    await expect(resolver.readRoleBytes('video.startupSplash')).resolves.toBe(video)
    await expect(resolver.readRoleText('visual.standardColorTable')).resolves.toBe(colors)
    await expect(resolver.readRoleBytes('audio.midiSoundfont')).resolves.toBe(soundfont)
    expect(source.readBytes.mock.calls).toEqual([[musicPath], [videoPath], [soundfontPath]])
    expect(source.readText.mock.calls).toEqual([[colorPath]])
    expect({ catalog, assets }).toEqual(before)
  })

  test('resolves direct and role URLs without reading binary or text content', async () => {
    const { resolver, source } = projectFiles()
    await expect(resolver.urlFor('music.theme', 'music')).resolves.toBe(`blob:${musicPath}`)
    await expect(resolver.urlForRole('video.startupSplash')).resolves.toBe(`blob:${videoPath}`)
    await expect(resolver.urlForRole('visual.standardColorTable')).resolves.toBe(
      `blob:${colorPath}`,
    )
    expect(source.urlFor.mock.calls).toEqual([[musicPath], [videoPath], [colorPath]])
    expect(source.readBytes).not.toHaveBeenCalled()
    expect(source.readText).not.toHaveBeenCalled()
  })

  test('rejects a missing optional role or asset before FileSource lookup', async () => {
    const { resolver, source } = projectFiles()
    await expect(resolver.urlFor('ghost', 'music')).rejects.toThrow(
      new Error('工程 "proj-x" 解析 AssetId "ghost" 失败:catalog 无此记录，期望 kind=music'),
    )
    await expect(resolver.urlForRole('audio.defeatMusic')).rejects.toThrow(
      new Error('工程 "proj-x" 缺资源角色 "audio.defeatMusic"'),
    )
    expect(source.urlFor).not.toHaveBeenCalled()
  })

  test('rejects an actual asset of the wrong kind before a direct read', async () => {
    const { resolver, source } = projectFiles()
    await expect(resolver.readText('music.theme', 'sprite')).rejects.toThrow(
      new Error(
        '工程 "proj-x" 解析 AssetId "music.theme" 失败:期望 kind=sprite，实际 kind=music，' +
          `path=${musicPath}`,
      ),
    )
    await expect(resolver.readBytes('video.intro', 'music')).rejects.toThrow(
      new Error(
        '工程 "proj-x" 解析 AssetId "video.intro" 失败:期望 kind=music，实际 kind=video，' +
          `path=${videoPath}`,
      ),
    )
    expect(source.readText).not.toHaveBeenCalled()
    expect(source.readBytes).not.toHaveBeenCalled()
  })

  test('also checks role kind at the resolver boundary if a caller bypasses manifest validation', async () => {
    const { source, catalog, assets } = projectFiles()
    const roles = { ...assets.roles, 'video.startupSplash': 'music.theme' }
    expect(() => validateManifestAssetConfig({ ...assets, roles }, catalog)).toThrow(
      new Error('manifest.assets.roles.video.startupSplash: 期望 video，实际 music'),
    )
    const resolver = new AssetResolver('proj-x', catalog, roles, source)
    await expect(resolver.readRoleBytes('video.startupSplash')).rejects.toThrow(
      new Error(
        '工程 "proj-x" 解析 AssetId "music.theme" 失败:期望 kind=video，实际 kind=music，' +
          `path=${musicPath}`,
      ),
    )
    expect(source.readBytes).not.toHaveBeenCalled()
  })
})

describe('asset transport failures', () => {
  test('preserves the context of a text read error and retries the same path', async () => {
    const { resolver, source, colors } = projectFiles()
    source.readText.mockRejectedValueOnce(new Error('device disconnected'))
    await expect(resolver.readRoleText('visual.standardColorTable')).rejects.toThrow(
      new Error(
        '工程 "proj-x" 读取 AssetId "color.standard" 失败:' +
          `期望 kind=color-table，登记 path=${colorPath}；device disconnected`,
      ),
    )
    await expect(resolver.readRoleText('visual.standardColorTable')).resolves.toBe(colors)
    expect(source.readText.mock.calls).toEqual([[colorPath], [colorPath]])
  })

  test.each([
    ['an Error', new Error('disk gone'), 'disk gone'],
    ['a string', 'disk-fault:raw', 'disk-fault:raw'],
  ])('preserves the context of %s on byte reads and allows recovery', async (_title, error, cause) => {
    const { resolver, source, music } = projectFiles()
    source.readBytes.mockRejectedValueOnce(error)
    await expect(resolver.readBytes('music.theme')).rejects.toThrow(
      new Error(
        '工程 "proj-x" 读取 AssetId "music.theme" 失败:' +
          `期望 kind=music，登记 path=${musicPath}；${cause}`,
      ),
    )
    await expect(resolver.readBytes('music.theme')).resolves.toBe(music)
    expect(source.readBytes.mock.calls).toEqual([[musicPath], [musicPath]])
  })

  test('reports and recovers a FileSource URL error without falling back to byte reads', async () => {
    const { resolver, source } = projectFiles()
    source.urlFor.mockRejectedValueOnce(new Error('URL access refused'))
    await expect(resolver.urlForRole('video.startupSplash')).rejects.toThrow(
      new Error(
        '工程 "proj-x" 读取 AssetId "video.intro" 失败:' +
          `期望 kind=video，登记 path=${videoPath}；URL access refused`,
      ),
    )
    await expect(resolver.urlForRole('video.startupSplash')).resolves.toBe(`blob:${videoPath}`)
    expect(source.urlFor.mock.calls).toEqual([[videoPath], [videoPath]])
    expect(source.readBytes).not.toHaveBeenCalled()
    expect(source.readText).not.toHaveBeenCalled()
  })

  test('a source without a dispose hook remains available after resolver disposal', async () => {
    const { resolver, music } = projectFiles()
    resolver.dispose()
    await expect(resolver.readBytes('music.theme')).resolves.toBe(music)
  })
})

test('dispose delegates to the owner of project URLs', async () => {
  const { catalog, assets, source } = projectFiles()
  const activeUrls = new Set<string>()
  const resolver = new AssetResolver('proj-x', catalog, assets.roles, {
    ...source,
    async urlFor(path) {
      const url = await source.urlFor(path)
      activeUrls.add(url)
      return url
    },
    dispose() {
      activeUrls.clear()
    },
  })
  const preview = await resolver.urlForRole('video.startupSplash')
  expect([...activeUrls]).toEqual([preview])
  resolver.dispose()
  expect([...activeUrls]).toEqual([])
})
