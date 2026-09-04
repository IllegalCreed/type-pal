import type { MapIndexV1, ProjectMap, StampTemplate } from '@type-pal/content'
import { buildBlankProjectMap } from '@type-pal/reforge'
import { describe, expect, test, vi } from 'vitest'
import { RemoveTilesetCommand } from './commands.js'
import { type EditorState, EditSession } from './edit-session.js'
import { DeleteStampTemplateCommand } from './stamp-commands.js'
import {
  StampDeletionProof,
  stampPlacementReferences,
  TilesetRemovalProof,
  tilesetUsageReferences,
} from './tileset-references.js'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (cause: unknown) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

function stamp(tilesetId: string): StampTemplate {
  return {
    id: 'tree',
    name: '树',
    origin: 'authored',
    width: 1,
    height: 1,
    anchor: { row: 0, col: 0 },
    tilesetRefs: [tilesetId],
    layers: [{ id: 'floor', name: '地面', tiles: [[0], [null]], sources: [[0], [null]] }],
    collision: [[null], [null]],
  }
}

function state(
  mapIndex: MapIndexV1,
  maps: Record<string, ProjectMap> = {},
  stamps: StampTemplate[] = [],
): EditorState {
  return {
    manifest: {
      id: 'map-reference-test',
      name: 'Map Reference Test',
      contentVersion: 19,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      content: { maps: 'content/maps.json' },
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [],
    },
    scenes: [],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    maps,
    mapIndex,
    tilesets: [
      { id: 'tiles-a', name: '瓦片 A', category: 'test', asset: 'tileset.a' },
      { id: 'tiles-b', name: '瓦片 B', category: 'test', asset: 'tileset.b' },
    ],
    tilesetBlobs: {},
    stamps,
    assetCatalog: {
      version: 1,
      assets: {
        'tileset.a': {
          kind: 'tileset',
          path: 'assets/authored/tilesets/a.rle',
          mediaType: 'application/vnd.type-pal.rle',
          bytes: 2,
          sha256: 'a'.repeat(64),
          origin: { kind: 'authored' },
        },
        'tileset.b': {
          kind: 'tileset',
          path: 'assets/authored/tilesets/b.rle',
          mediaType: 'application/vnd.type-pal.rle',
          bytes: 2,
          sha256: 'b'.repeat(64),
          origin: { kind: 'authored' },
        },
      },
    },
    assetBlobs: { 'assets/authored/tilesets/a.rle': new Uint8Array([1, 2]).buffer },
    scriptChunks: {},
  } as unknown as EditorState
}

const mapIndex: MapIndexV1 = {
  version: 1,
  maps: [
    { id: 'map-a', name: '地图 A', path: 'content/maps/map-a.json' },
    { id: 'map-b', name: '地图 B', path: 'content/maps/map-b.json' },
  ],
}

describe('ED-3 async map reference facts', () => {
  test('scans exact id/path without hydrating maps and publishes unified map/stamp edges', async () => {
    const maps = {
      'map-a': buildBlankProjectMap(1, 1, 'tiles-b'),
      'map-b': buildBlankProjectMap(1, 1, 'tiles-a'),
    }
    const loadMap = vi.fn(async (id: string, path: string) => {
      expect(path).toBe(mapIndex.maps.find((entry) => entry.id === id)?.path)
      return maps[id as keyof typeof maps]
    })
    const session = new EditSession(state(mapIndex, {}, [stamp('tiles-a')]), { loadMap })
    const before = {
      version: session.getVersion(),
      history: session.getHistoryVersion(),
      revisionA: session.getMapRevision('map-a'),
      dirty: session.isDirty(),
    }

    const batch = await session.ensureMapReferencesIndexed()

    expect(loadMap.mock.calls).toEqual([
      ['map-a', 'content/maps/map-a.json'],
      ['map-b', 'content/maps/map-b.json'],
    ])
    expect(batch).toMatchObject({ completed: 2, total: 2, done: true, failures: [] })
    expect(Object.keys(session.getState().maps)).toEqual([])
    expect(session.getVersion()).toBe(before.version)
    expect(session.getHistoryVersion()).toBe(before.history)
    expect(session.getMapRevision('map-a')).toBe(before.revisionA)
    expect(session.isDirty()).toBe(before.dirty)
    expect(tilesetUsageReferences(batch, 'tiles-a')).toMatchObject([
      { source: { owner: { kind: 'map', id: 'map-b' } }, deletePolicy: 'replace-suggest' },
      { source: { owner: { kind: 'stamp', id: 'tree' } }, deletePolicy: 'replace-suggest' },
    ])
    expect(() => TilesetRemovalProof.fromBatch(batch, session.getState(), 'tiles-a')).toThrow(
      /仍被 2 个/,
    )
  })

  test('fails closed on read errors and never creates a proof from partial coverage', async () => {
    const loadMap = vi.fn(async (id: string) => {
      if (id === 'map-b') throw new Error('磁盘读取失败')
      return buildBlankProjectMap(1, 1, 'tiles-b')
    })
    const session = new EditSession(state(mapIndex), {
      loadMap,
    })
    const batch = await session.ensureMapReferencesIndexed()
    expect(batch.failures).toEqual([
      expect.objectContaining({ mapId: 'map-b', message: '磁盘读取失败' }),
    ])
    expect(() => TilesetRemovalProof.fromBatch(batch, session.getState(), 'tiles-a')).toThrow(
      /扫描不完整/,
    )

    const retried = await session.ensureMapReferencesIndexed({ retryFailures: true })
    expect(retried.failures).toEqual([
      expect.objectContaining({ mapId: 'map-b', message: '磁盘读取失败' }),
    ])
    expect(loadMap).toHaveBeenCalledTimes(3)
  })

  test('discards a late old-path result and continues until the latest map index is covered', async () => {
    const oldRead = deferred<ProjectMap>()
    const newRead = deferred<ProjectMap>()
    const addedRead = deferred<ProjectMap>()
    const loadMap = vi
      .fn<(id: string, path: string) => Promise<ProjectMap>>()
      .mockImplementationOnce(() => oldRead.promise)
      .mockImplementationOnce(() => newRead.promise)
      .mockImplementationOnce(() => addedRead.promise)
    const initialIndex: MapIndexV1 = {
      version: 1,
      maps: [{ id: 'map-a', name: '旧地图', path: 'content/maps/old.json' }],
    }
    const session = new EditSession(state(initialIndex), { loadMap })
    const scan = session.ensureMapReferencesIndexed()
    await vi.waitFor(() => expect(loadMap).toHaveBeenCalledTimes(1))
    session.dispatch({
      label: '替换地图路径',
      apply: (current) => ({
        ...current,
        mapIndex: {
          version: 1,
          maps: [
            { id: 'map-a', name: '新地图', path: 'content/maps/new.json' },
            { id: 'map-b', name: '新增地图', path: 'content/maps/added.json' },
          ],
        },
      }),
      invert: (current) => current,
    })
    oldRead.resolve(buildBlankProjectMap(1, 1, 'tiles-a'))
    await vi.waitFor(() => expect(loadMap).toHaveBeenCalledTimes(3))
    expect(loadMap.mock.calls[1]).toEqual(['map-a', 'content/maps/new.json'])
    expect(loadMap.mock.calls[2]).toEqual(['map-b', 'content/maps/added.json'])
    newRead.resolve(buildBlankProjectMap(1, 1, 'tiles-b'))
    addedRead.resolve(buildBlankProjectMap(1, 1, 'tiles-b'))

    const batch = await scan
    expect(batch.coverage).toMatchObject([
      { mapId: 'map-a', path: 'content/maps/new.json' },
      { mapId: 'map-b', path: 'content/maps/added.json' },
    ])
    expect(tilesetUsageReferences(batch, 'tiles-a')).toEqual([])
    expect(Object.keys(session.getState().maps)).toEqual([])
  })

  test('does not start a stale read for a later captured map after its identity changes', async () => {
    const blockers = Array.from({ length: 6 }, () => deferred<ProjectMap>())
    const currentSecondRead = deferred<ProjectMap>()
    const loadMap = vi.fn((id: string, path: string) => {
      if (id.startsWith('blocker-')) return blockers[Number(id.slice('blocker-'.length))]!.promise
      if (id === 'map-b' && path === 'content/maps/map-b-new.json') return currentSecondRead.promise
      throw new Error(`不应读取旧目标 ${id}:${path}`)
    })
    const blockedIndex: MapIndexV1 = {
      version: 1,
      maps: [
        ...blockers.map((_, index) => ({
          id: `blocker-${index}`,
          name: `阻塞地图 ${index}`,
          path: `content/maps/blocker-${index}.json`,
        })),
        { id: 'map-b', name: '目标地图', path: 'content/maps/map-b-old.json' },
      ],
    }
    const session = new EditSession(state(blockedIndex), { loadMap })
    const scan = session.ensureMapReferencesIndexed()
    await vi.waitFor(() => expect(loadMap).toHaveBeenCalledTimes(6))
    session.dispatch({
      label: '更新第二张地图路径',
      apply: (current) => ({
        ...current,
        mapIndex: {
          version: 1,
          maps: current.mapIndex.maps.map((entry) =>
            entry.id === 'map-b' ? { ...entry, path: 'content/maps/map-b-new.json' } : entry,
          ),
        },
      }),
      invert: (current) => current,
    })
    const hydrate = session.ensureMapLoaded('map-b')
    await vi.waitFor(() => expect(loadMap).toHaveBeenCalledTimes(7))
    for (const blocker of blockers) blocker.resolve(buildBlankProjectMap(1, 1, 'tiles-b'))
    currentSecondRead.resolve(buildBlankProjectMap(1, 1, 'tiles-b'))
    await Promise.all([scan, hydrate])

    expect(loadMap.mock.calls).not.toContainEqual(['map-b', 'content/maps/map-b-old.json'])
    expect(loadMap).toHaveBeenCalledWith('map-b', 'content/maps/map-b-new.json')
  })

  test('prefers an in-session map edit over a late disk scan result', async () => {
    const pending = deferred<ProjectMap>()
    const oneMapIndex: MapIndexV1 = { version: 1, maps: [mapIndex.maps[0]!] }
    const loadMap = vi.fn(() => pending.promise)
    const session = new EditSession(state(oneMapIndex), { loadMap })
    const scan = session.ensureMapReferencesIndexed()
    await vi.waitFor(() => expect(loadMap).toHaveBeenCalledOnce())
    const edited = buildBlankProjectMap(1, 1, 'tiles-a')
    session.dispatch({
      label: '编辑当前地图',
      apply: (current) => ({ ...current, maps: { ...current.maps, 'map-a': edited } }),
      invert: (current) => current,
    })
    pending.resolve(buildBlankProjectMap(1, 1, 'tiles-b'))

    const batch = await scan
    expect(loadMap).toHaveBeenCalledOnce()
    expect(tilesetUsageReferences(batch, 'tiles-a')).toHaveLength(1)
    expect(tilesetUsageReferences(batch, 'tiles-b')).toEqual([])
    expect(batch.coverage[0]?.mapRevision).toBe(session.getMapRevision('map-a'))
  })

  test('shares one raw read when fact scanning starts before map hydration', async () => {
    const pending = deferred<ProjectMap>()
    const oneMapIndex: MapIndexV1 = { version: 1, maps: [mapIndex.maps[0]!] }
    const loadMap = vi.fn(() => pending.promise)
    const session = new EditSession(state(oneMapIndex), { loadMap })
    const scan = session.ensureMapReferencesIndexed()
    await vi.waitFor(() => expect(loadMap).toHaveBeenCalledOnce())
    const hydrate = session.ensureMapLoaded('map-a')
    await Promise.resolve()
    expect(loadMap).toHaveBeenCalledOnce()

    pending.resolve(buildBlankProjectMap(1, 1, 'tiles-a'))
    await hydrate
    const batch = await scan
    expect(session.getState().maps['map-a']).toBeDefined()
    expect(tilesetUsageReferences(batch, 'tiles-a')).toHaveLength(1)
    expect(batch.coverage[0]?.mapRevision).toBe(session.getMapRevision('map-a'))
  })

  test('an in-flight hydrate makes an old complete proof fail closed until current facts land', async () => {
    const hydrateRead = deferred<ProjectMap>()
    let reads = 0
    const oneMapIndex: MapIndexV1 = { version: 1, maps: [mapIndex.maps[0]!] }
    const session = new EditSession(state(oneMapIndex), {
      loadMap: async () => {
        reads++
        if (reads === 1) return buildBlankProjectMap(1, 1, 'tiles-b')
        return hydrateRead.promise
      },
    })
    const complete = await session.ensureMapReferencesIndexed()
    const proof = TilesetRemovalProof.fromBatch(complete, session.getState(), 'tiles-a')
    const command = new RemoveTilesetCommand(
      'tiles-a',
      proof,
      (current) => session.getCurrentMapReferenceBatch(current),
      new Uint8Array([1, 2]).buffer,
    )
    const hydrate = session.ensureMapLoaded('map-a')
    await vi.waitFor(() => expect(reads).toBe(2))
    expect(session.getMapReferenceBatch()).toMatchObject({ running: true, done: false })
    const historyBefore = session.getHistoryVersion()
    expect(() => session.dispatch(command)).toThrow(/扫描不完整/)
    expect(session.getHistoryVersion()).toBe(historyBefore)
    expect(session.getState().tilesets?.some((entry) => entry.id === 'tiles-a')).toBe(true)

    hydrateRead.resolve(buildBlankProjectMap(1, 1, 'tiles-a'))
    await hydrate
    expect(tilesetUsageReferences(session.getMapReferenceBatch(), 'tiles-a')).toHaveLength(1)
  })

  test('delete and redo recheck the current batch after a non-history hydrate', async () => {
    let diskTileset = 'tiles-b'
    const session = new EditSession(state(mapIndex), {
      loadMap: async () => buildBlankProjectMap(1, 1, diskTileset),
    })
    const batch = await session.ensureMapReferencesIndexed()
    const proof = TilesetRemovalProof.fromBatch(batch, session.getState(), 'tiles-a')
    const command = new RemoveTilesetCommand(
      'tiles-a',
      proof,
      (current) => session.getCurrentMapReferenceBatch(current),
      new Uint8Array([1, 2]).buffer,
    )

    session.dispatch(command)
    expect(session.getState().tilesets?.map(({ id }) => id)).toEqual(['tiles-b'])
    expect(session.undo()).toBe(true)
    diskTileset = 'tiles-a'
    await session.ensureMapLoaded('map-a')
    expect(() => session.redo()).toThrow(/事实已变化/)
    expect(session.getState().tilesets?.map(({ id }) => id)).toEqual(['tiles-a', 'tiles-b'])
    expect(session.canRedo()).toBe(true)
  })

  test('stamp delete permits confirmed snapshot refs but redo rejects a changed placement set', async () => {
    let diskMap = buildBlankProjectMap(1, 1, 'tiles-b')
    const oneMapIndex: MapIndexV1 = { version: 1, maps: [mapIndex.maps[0]!] }
    const session = new EditSession(state(oneMapIndex, {}, [stamp('tiles-b')]), {
      loadMap: async () => diskMap,
    })
    const batch = await session.ensureMapReferencesIndexed()
    const proof = StampDeletionProof.fromBatch(batch, 'tree')
    const command = new DeleteStampTemplateCommand('tree', proof, (current) =>
      session.getCurrentMapReferenceBatch(current),
    )

    session.dispatch(command)
    expect(session.undo()).toBe(true)
    diskMap = {
      ...buildBlankProjectMap(1, 1, 'tiles-b'),
      version: 4,
      authoring: {
        version: 1,
        stampPlacements: [
          {
            id: 'late-placement',
            sourceStampId: 'tree',
            anchor: { row: 0, col: 0 },
            visualSlots: [],
            gridPoints: [],
          },
        ],
      },
    }
    await session.ensureMapLoaded('map-a')

    expect(stampPlacementReferences(session.getMapReferenceBatch(), 'tree')).toHaveLength(1)
    expect(() => session.redo()).toThrow(/事实已变化|来源引用已变化/)
    expect(session.getState().stamps).toHaveLength(1)
    expect(session.canRedo()).toBe(true)
  })
})
