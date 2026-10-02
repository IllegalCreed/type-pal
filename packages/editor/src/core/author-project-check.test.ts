import type { AssetCatalogV1, AuthorSceneDef, SceneIndexV1 } from '@type-pal/content'
import { compressGzip, fsaSource, PROJECT_SAVE_STATE_PATH } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { sha256Hex } from './binary-signature.js'
import { checkAuthorProject } from './project-io.js'
import { buildBlankProject } from './seed.js'

const saveState = (phase: 'pending' | 'committed', second = false) => ({
  kind: 'type-pal-author-save',
  version: 1,
  operationId: second
    ? '22222222-2222-4222-8222-222222222222'
    : '11111111-1111-4111-8111-111111111111',
  phase,
  planHash: 'a'.repeat(64),
})

async function fixture() {
  const files = await buildBlankProject('author-check')
  const index = files['content/scenes/index.json'] as SceneIndexV1
  index.scenes.push({ id: 'annex', name: 'Non-entry scene', path: 'content/scenes/annex.json' })
  files['content/scenes/annex.json'] = {
    ...structuredClone(files['content/scenes/start.json'] as AuthorSceneDef),
    id: 'annex',
  }
  const disk = memoryAuthorDirectory(files)
  const source = fsaSource(disk.dir)
  const check = (afterRead?: (path: string) => void) =>
    checkAuthorProject({
      ...source,
      async readText(path, signal) {
        const value = await source.readText(path, signal)
        afterRead?.(path)
        return value
      },
      async readJson<T>(path: string, signal?: AbortSignal): Promise<T> {
        const value = await source.readJson<T>(path, signal)
        afterRead?.(path)
        return value
      },
      async readBytes(path, signal) {
        const value = await source.readBytes(path, signal)
        afterRead?.(path)
        return value
      },
    })
  const unchanged = () => expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  return { files, disk, check, unchanged }
}

describe('standalone author audit reuses the author-save validation kernel', () => {
  test('accepts a zero-original-byte synthetic project, including its non-entry scene, without IO mutations', async () => {
    const f = await fixture()
    const before = new Map(f.disk.files)
    await expect(f.check()).resolves.toEqual({
      projectId: 'author-check',
      scenes: 2,
      maps: 1,
      assets: 4,
    })
    expect(f.disk.files).toEqual(before)
    f.unchanged()
  })

  test('rejects a nested shared reference in a non-entry scene and a nested shared-library reference', async () => {
    const f = await fixture()
    const annex = f.disk.json('content/scenes/annex.json') as AuthorSceneDef
    annex.hooks = {
      onEnter: {
        initial: 'arrival',
        variants: {
          arrival: {
            label: 'Arrival',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'start',
              stages: [
                {
                  id: 'start',
                  body: [
                    {
                      kind: 'confirm',
                      onYes: [],
                      onNo: [{ kind: 'callScript', script: 'shared/visit' }],
                    },
                  ],
                },
              ],
            },
          },
        },
      },
    }
    f.disk.set('content/scenes/annex.json', annex)
    await expect(f.check()).rejects.toThrow(/shared\/visit/)
    f.disk.set('content/shared-scripts.json', {
      'shared/visit': {
        name: 'Visit',
        self: 'none',
        body: [
          { kind: 'confirm', onYes: [], onNo: [{ kind: 'callScript', script: 'shared/missing' }] },
        ],
      },
    })
    await expect(f.check()).rejects.toThrow(/shared\/missing/)
    f.disk.set('content/shared-scripts.json', {
      'shared/visit': { name: 'Visit', self: 'none', body: [] },
    })
    await expect(f.check()).resolves.toMatchObject({ scenes: 2 })
    f.unchanged()
  })

  test('rejects non-entry scene structure even when the entry scene is valid', async () => {
    const f = await fixture()
    f.disk.set('content/scenes/annex.json', {
      ...f.disk.json('content/scenes/annex.json'),
      mapId: 'missing',
    })
    await expect(f.check()).rejects.toThrow(/missing/)
    f.unchanged()
  })

  test('rejects an unresolved asset reference before reading catalog bytes', async () => {
    const f = await fixture()
    const sprites = f.disk.json('content/sprites.json')
    sprites[0].asset = 'sprite.missing'
    f.disk.set('content/sprites.json', sprites)
    await expect(f.check()).rejects.toThrow(/sprite\.missing/)
    f.unchanged()
  })

  test('rejects missing catalog bytes and a same-length hash mismatch', async () => {
    const f = await fixture()
    const path = 'assets/generated/sprites/starter.rle'
    const bytes = f.disk.files.get(path)!
    f.disk.files.delete(path)
    await expect(f.check()).rejects.toThrow(/资源缺失或不可读/)
    const changed = bytes.slice(0)
    const view = new Uint8Array(changed)
    view[10] = view[10]! ^ 1
    f.disk.set(path, changed)
    await expect(f.check()).rejects.toThrow(/二进制与 catalog 不符/)
    f.disk.set(path, bytes)
    await expect(f.check()).resolves.toMatchObject({ assets: 4 })
    f.unchanged()
  })

  test('checks an unreferenced catalog asset and every record sharing the same physical path', async () => {
    const f = await fixture()
    const catalog = f.disk.json('assets/index.json') as AssetCatalogV1
    const original = catalog.assets['sprite.generated.starter']!
    catalog.assets['sprite.unreferenced'] = {
      ...original,
      path: 'assets/generated/unreferenced.rle',
    }
    f.disk.set('assets/index.json', catalog)
    await expect(f.check()).rejects.toThrow(
      '保存目标资源缺失或不可读：assets/generated/unreferenced.rle',
    )
    catalog.assets['sprite.unreferenced'] = { ...original, sha256: 'f'.repeat(64) }
    f.disk.set('assets/index.json', catalog)
    await expect(f.check()).rejects.toThrow(/二进制与 catalog 不符/)
    delete catalog.assets['sprite.unreferenced']
    f.disk.set('assets/index.json', catalog)
    await expect(f.check()).resolves.toMatchObject({ assets: 4 })
    f.unchanged()
  })

  test('rejects well-hashed gzip whose tileset RLE payload is malformed', async () => {
    const f = await fixture()
    const bytes = Uint8Array.from(await compressGzip(new Uint8Array(32))).buffer
    const catalog = f.disk.json('assets/index.json') as AssetCatalogV1
    const record = catalog.assets['tileset.generated.starter']!
    record.bytes = bytes.byteLength
    record.sha256 = await sha256Hex(bytes)
    f.disk.set(record.path, bytes)
    f.disk.set('assets/index.json', catalog)
    await expect(f.check()).rejects.toThrow(/瓦片集资源 RLE 损坏/)
    f.unchanged()
  })

  test.each([
    'schema',
    'json',
    'tileset',
    'missing',
  ] as const)('checks all indexed maps, including an unreferenced map: %s', async (failure) => {
    const f = await fixture()
    const index = f.disk.json('content/maps/index.json')
    index.maps.push({ id: 'unused', name: 'Unused', path: 'content/maps/unused.json' })
    f.disk.set('content/maps/index.json', index)
    const map = f.disk.json('content/maps/start.json')
    if (failure === 'schema') map.version = 3
    if (failure === 'tileset') map.tilesetRefs = ['missing']
    if (failure !== 'missing')
      f.disk.set('content/maps/unused.json', failure === 'json' ? '{bad' : map)
    const expected = {
      schema: /projectMap\.version/,
      json: /content\/maps\/unused\.json.*JSON/,
      tileset: /地图 unused 引用不存在的瓦片集：missing/,
      missing: /content\/maps\/unused\.json/,
    }
    await expect(f.check()).rejects.toThrow(expected[failure])
    f.disk.set('content/maps/unused.json', f.disk.json('content/maps/start.json'))
    await expect(f.check()).resolves.toMatchObject({ maps: 2 })
    f.unchanged()
  })

  test('pending save is rejected before any author file is read, with no recovery or writes', async () => {
    const f = await fixture()
    f.disk.set(PROJECT_SAVE_STATE_PATH, saveState('pending'))
    const reads: string[] = []
    await expect(
      f.check((path) => {
        reads.push(path)
      }),
    ).rejects.toThrow(/未完成的保存/)
    expect(reads).toEqual([PROJECT_SAVE_STATE_PATH])
    f.unchanged()
  })

  test.each([
    '',
    '{bad',
    '{}',
  ])('malformed save-state is not optional absence: %j', async (text) => {
    const f = await fixture()
    f.disk.set(PROJECT_SAVE_STATE_PATH, text)
    const reads: string[] = []
    await expect(
      f.check((path) => {
        reads.push(path)
      }),
    ).rejects.toThrow(/保存状态无法读取/)
    expect(reads).toEqual([PROJECT_SAVE_STATE_PATH])
    f.unchanged()
  })

  test.each([
    'content/scenes/annex.json',
    'content/maps/start.json',
    'assets/generated/battle-sprites/starter.rle',
  ])('stable admission spans lazy scene/map/last resource reads: %s', async (path) => {
    const f = await fixture()
    f.disk.set(PROJECT_SAVE_STATE_PATH, saveState('committed'))
    let changed = false
    const afterRead = (read: string) => {
      if (read === path && !changed) {
        changed = true
        f.disk.set(PROJECT_SAVE_STATE_PATH, saveState('committed', true))
      }
    }
    await expect(f.check(afterRead)).rejects.toThrow(/读取期间完成了新的保存/)
    expect(changed).toBe(true)
    f.unchanged()
  })
})
