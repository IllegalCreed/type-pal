import type { ProjectMap } from '@type-pal/content'
import {
  buildBlankProjectMap,
  paintProjectMapCollision,
  paintProjectMapTiles,
} from '@type-pal/reforge'
import { expect, test, vi } from 'vitest'
import type { Command } from './commands.js'
import { ApplyProjectMapPatchCommand, PaintTilesCommand } from './commands.js'
import { type EditorState, EditSession, MoveEntityCommand } from './edit-session.js'
import { stampPlacementReferences, tilesetUsageReferences } from './tileset-references.js'

// 最小 EditorState fixture(字段不全,as 断言 —— 测的是 command/undo 引擎,不是数据形状)。
function mkState(): EditorState {
  return {
    manifest: {} as never,
    scenes: [
      {
        id: 's',
        mapId: 'map-s',
        entry: {} as never,
        entities: [{ id: 'e', pos: { col: 1, row: 1, height: 0 }, sprite: 'ghost' }],
      },
    ],
    sceneIndex: {
      version: 1,
      scenes: [{ id: 's', name: '场景', path: 'content/scenes/s.json' }],
    },
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    maps: {},
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    stamps: [],
    scriptChunks: {},
  } as EditorState
}
const entPos = (s: {
  scenes: { entities: { pos: { col: number; row: number; height: number } }[] }[]
}): {
  col: number
  row: number
  height: number
} => s.scenes[0]!.entities[0]!.pos

test('dispatch 改状态;原状态不被 mutate(不可变)', () => {
  const s0 = mkState()
  const sess = new EditSession(s0)
  sess.dispatch(new MoveEntityCommand('s', 'e', { col: 5, row: 6, height: 0 }))
  expect(entPos(sess.getState())).toEqual({ col: 5, row: 6, height: 0 })
  expect(entPos(s0)).toEqual({ col: 1, row: 1, height: 0 }) // 源不变
})

test('undo 回退、redo 重做', () => {
  const sess = new EditSession(mkState())
  sess.dispatch(new MoveEntityCommand('s', 'e', { col: 5, row: 6, height: 0 }))
  sess.undo()
  expect(entPos(sess.getState())).toEqual({ col: 1, row: 1, height: 0 })
  sess.redo()
  expect(entPos(sess.getState())).toEqual({ col: 5, row: 6, height: 0 })
})

test('undo 后 dispatch 清空 redo 分支', () => {
  const sess = new EditSession(mkState())
  sess.dispatch(new MoveEntityCommand('s', 'e', { col: 5, row: 6, height: 0 }))
  sess.undo()
  sess.dispatch(new MoveEntityCommand('s', 'e', { col: 9, row: 9, height: 0 }))
  expect(sess.canUndo()).toBe(true)
  expect(sess.canRedo()).toBe(false)
  expect(entPos(sess.getState())).toEqual({ col: 9, row: 9, height: 0 })
})

test('空栈 undo/redo 安全(noop,不改状态)', () => {
  const sess = new EditSession(mkState())
  expect(sess.canUndo()).toBe(false)
  expect(sess.canRedo()).toBe(false)
  sess.undo() // 不应崩
  sess.redo()
  expect(entPos(sess.getState())).toEqual({ col: 1, row: 1, height: 0 })
})

test('subscribe 在每次状态变化时触发,退订后不再触发', () => {
  const sess = new EditSession(mkState())
  const fn = vi.fn()
  const off = sess.subscribe(fn)
  sess.dispatch(new MoveEntityCommand('s', 'e', { col: 5, row: 6, height: 0 }))
  sess.undo()
  expect(fn).toHaveBeenCalledTimes(2)
  off()
  sess.redo()
  expect(fn).toHaveBeenCalledTimes(2)
})

test('map revision 只随该地图内容变化且覆盖 dispatch/undo/redo，过期派发零写', () => {
  const state = mkState()
  state.maps = { 'map-a': buildBlankProjectMap(2, 1, 'tileset-001') }
  const sess = new EditSession(state)
  const beforeVersion = sess.getVersion()
  expect(sess.getMapRevision('map-a')).toBe(0)

  sess.dispatch(
    new PaintTilesCommand('map-a', [
      { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: 'tiles', height: 0 },
    ]),
  )
  expect(sess.getMapRevision('map-a')).toBe(1)
  expect(sess.getMapRevision('map-b')).toBe(0)
  sess.undo()
  expect(sess.getMapRevision('map-a')).toBe(2)
  sess.redo()
  expect(sess.getMapRevision('map-a')).toBe(3)
  sess.markSaved()
  expect(sess.getMapRevision('map-a')).toBe(3)
  sess.dispatch(new MoveEntityCommand('s', 'e', { col: 7, row: 8, height: 0 }))
  expect(sess.getMapRevision('map-a')).toBe(3)

  const stateBeforeStale = sess.getState()
  const versionBeforeStale = sess.getVersion()
  expect(() =>
    sess.dispatchAtMapRevision(
      'map-a',
      2,
      new PaintTilesCommand('map-a', [
        { layerId: 'floor', row: 1, col: 0, tileId: 2, tilesetId: 'tiles', height: 0 },
      ]),
    ),
  ).toThrow('已变化')
  expect(sess.getState()).toBe(stateBeforeStale)
  expect(sess.getVersion()).toBe(versionBeforeStale)
  expect(sess.getVersion()).toBeGreaterThan(beforeVersion)
})

test('非地图命令不读取地图内容或重建组合来源索引', () => {
  const state = withMapIndex('map-a')
  const map = buildBlankProjectMap(2, 1, 'tileset-001')
  let authoringReads = 0
  Object.defineProperty(map, 'authoring', {
    configurable: true,
    get: () => {
      authoringReads += 1
      return undefined
    },
  })
  state.maps = { 'map-a': map }
  const session = new EditSession(state)
  authoringReads = 0

  session.dispatch(new MoveEntityCommand('s', 'e', { col: 2, row: 3, height: 0 }))
  session.undo()
  session.redo()
  const receipt = session.dispatchForTransaction(
    new MoveEntityCommand('s', 'e', { col: 4, row: 5, height: 0 }),
  )
  receipt?.rollback()

  expect(authoringReads).toBe(0)
  expect(session.getMapRevision('map-a')).toBe(0)
})

test('地图变化只失效 identity，异步补事实时才读取变化地图，mapIndex 改名零读取', async () => {
  const state = withMapIndex('a', 'b')
  const beforeA = mapWithStampSources('tree')
  const afterA = mapWithStampSources('rock')
  const mapB = mapWithStampSources('house')
  let afterAReads = 0
  let mapBReads = 0
  const afterAAuthoring = afterA.authoring
  const mapBAuthoring = mapB.authoring
  Object.defineProperty(afterA, 'authoring', {
    configurable: true,
    get: () => {
      afterAReads += 1
      return afterAAuthoring
    },
  })
  Object.defineProperty(mapB, 'authoring', {
    configurable: true,
    get: () => {
      mapBReads += 1
      return mapBAuthoring
    },
  })
  state.maps = { a: beforeA, b: mapB }
  const session = new EditSession(state)
  afterAReads = 0
  mapBReads = 0
  const replaceA: Command = {
    label: '只替换地图 a',
    apply: (current) => ({ ...current, maps: { ...current.maps, a: afterA } }),
    invert: (current) => ({ ...current, maps: { ...current.maps, a: beforeA } }),
  }
  session.dispatch(replaceA)
  expect(afterAReads).toBe(0)
  expect(session.getMapReferenceBatch().done).toBe(false)
  await session.ensureMapReferencesIndexed()
  expect(afterAReads).toBe(1)
  expect(mapBReads).toBe(0)

  afterAReads = 0
  const renameIndex: Command = {
    label: '只改地图显示名',
    apply: (current) => ({
      ...current,
      mapIndex: {
        ...current.mapIndex,
        maps: current.mapIndex.maps.map((asset) =>
          asset.id === 'a' ? { ...asset, name: 'A renamed' } : asset,
        ),
      },
    }),
    invert: (current) => current,
  }
  session.dispatch(renameIndex)
  expect(afterAReads).toBe(0)
  expect(mapBReads).toBe(0)
})

test('noop command 不入历史、不置脏、不通知，也不清 redo', () => {
  const sess = new EditSession(mkState())
  const fn = vi.fn()
  sess.subscribe(fn)
  const noop: Command = {
    label: 'noop',
    apply: (state) => state,
    invert: (state) => state,
  }
  expect(sess.dispatch(noop)).toBe(false)
  expect(sess.canUndo()).toBe(false)
  expect(sess.isDirty()).toBe(false)
  expect(fn).not.toHaveBeenCalled()

  sess.dispatch(new MoveEntityCommand('s', 'e', { col: 5, row: 6, height: 0 }))
  sess.undo()
  expect(sess.canRedo()).toBe(true)
  expect(sess.dispatch(noop)).toBe(false)
  expect(sess.canRedo()).toBe(true)
})

test('dispatch/undo/redo 抛错时不丢失原历史分支', () => {
  const sess = new EditSession(mkState())
  sess.dispatch(new MoveEntityCommand('s', 'e', { col: 5, row: 6, height: 0 }))
  sess.undo()
  const failedDispatch: Command = {
    label: 'failed dispatch',
    apply: () => {
      throw new Error('apply failed')
    },
    invert: (state) => state,
  }
  expect(() => sess.dispatch(failedDispatch)).toThrow('apply failed')
  expect(sess.canRedo()).toBe(true)

  sess.redo()
  const badUndo: Command = {
    label: 'bad undo',
    apply: (state) => ({ ...state, locale: { ...state.locale } }),
    invert: () => {
      throw new Error('invert failed')
    },
  }
  sess.dispatch(badUndo)
  expect(() => sess.undo()).toThrow('invert failed')
  expect(sess.canUndo()).toBe(true)
})

test('原子地图 patch 经 EditSession 一次 dispatch/undo/redo 恢复视觉与碰撞双 prev', () => {
  const state = mkState()
  let map = buildBlankProjectMap(2, 1, 'tileset-001')
  map = paintProjectMapTiles(map, [
    { layerId: 'floor', row: 0, col: 0, tileId: 2, tilesetId: 'tiles', height: 0 },
  ])
  map = paintProjectMapCollision(map, [{ row: 0, col: 0, value: 3 }])
  state.maps = { a: map }
  const hiddenLayerIds: string[] = []
  const command = new ApplyProjectMapPatchCommand(
    'a',
    {
      visual: [
        {
          channel: 'tileId',
          ref: { layerId: 'floor', row: 0, col: 0 },
          value: 9,
        },
      ],
      collision: [{ ref: { row: 0, col: 0 }, value: 0 }],
    },
    {
      hiddenLayerIds,
      lockedLayerIds: [],
      requiredWritableLayerIds: ['floor'],
    },
  )
  hiddenLayerIds.push('floor')
  const session = new EditSession(state)

  expect(session.dispatch(command)).toBe(true)
  expect(session.getState().maps.a?.layers[0]?.tiles[0]?.[0]).toBe(9)
  expect(session.getState().maps.a?.collision[0]?.[0]).toBe(0)
  expect(session.undo()).toBe(true)
  expect(session.getState().maps.a).toEqual(map)
  expect(session.redo()).toBe(true)
  expect(session.getState().maps.a?.layers[0]?.tiles[0]?.[0]).toBe(9)
  expect(session.getState().maps.a?.collision[0]?.[0]).toBe(0)
  expect(session.canUndo()).toBe(true)
})

// ── 脏标记(L2)──────────────────────────────────────────────
test('脏标记:初始干净;dispatch 置脏;markSaved 清脏且通知', () => {
  const sess = new EditSession(mkState())
  expect(sess.isDirty()).toBe(false)
  expect(sess.getHistoryVersion()).toBe(0)
  sess.dispatch(new MoveEntityCommand('s', 'e', { col: 5, row: 6, height: 0 }))
  expect(sess.isDirty()).toBe(true)
  expect(sess.getHistoryVersion()).toBe(1)
  const fn = vi.fn()
  sess.subscribe(fn)
  sess.markSaved()
  expect(sess.isDirty()).toBe(false)
  expect(sess.getHistoryVersion()).toBe(1)
  expect(fn).toHaveBeenCalledTimes(1) // markSaved 触发订阅(保存按钮要刷新)
})

test('脏标记:undo/redo 也置脏(撤销到原点仍视为有未保存改动)', () => {
  const sess = new EditSession(mkState())
  sess.dispatch(new MoveEntityCommand('s', 'e', { col: 5, row: 6, height: 0 }))
  sess.markSaved()
  expect(sess.isDirty()).toBe(false)
  sess.undo()
  expect(sess.isDirty()).toBe(true)
  sess.markSaved()
  sess.redo()
  expect(sess.isDirty()).toBe(true)
})

function withMapIndex(...ids: string[]) {
  const state = mkState()
  state.mapIndex = {
    version: 1,
    maps: ids.map((id) => ({ id, name: id, path: `content/maps/${id}.json` })),
  }
  return state
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function mapWithStampSources(...sourceStampIds: string[]): ProjectMap {
  const map = buildBlankProjectMap(2, 2, 'tileset-001')
  return {
    ...map,
    version: 4,
    authoring: {
      version: 1,
      stampPlacements: sourceStampIds.map((sourceStampId, index) => ({
        id: `placement-${index}`,
        sourceStampId,
        anchor: { row: 0, col: 0 },
        visualSlots: [],
        gridPoints: [],
      })),
    },
  }
}

test('地图引用事实直接读取轻量快照、同会话复用，且不 hydrate 地图或刷新全局 session', async () => {
  const maps = {
    a: mapWithStampSources('tree', 'tree'),
    b: mapWithStampSources('rock'),
  }
  const loadMap = vi.fn(async (mapId: string) => maps[mapId as keyof typeof maps])
  const sess = new EditSession(withMapIndex('a', 'b'), { loadMap, maxLoadedMaps: 1 })
  const globalListener = vi.fn()
  sess.subscribe(globalListener)

  const batch = await sess.ensureMapReferencesIndexed()
  expect(batch).toMatchObject({
    completed: 2,
    total: 2,
    failures: [],
    done: true,
  })
  expect(sess.getState().maps).toEqual({})
  expect(globalListener).not.toHaveBeenCalled()
  expect(stampPlacementReferences(batch, 'rock')).toHaveLength(1)
  expect(stampPlacementReferences(batch, 'tree')).toHaveLength(2)

  await sess.ensureMapReferencesIndexed()
  expect(loadMap).toHaveBeenCalledTimes(2)
})

test('地图引用事实随地图命令、undo/redo 失效并按需异步更新', async () => {
  const before = mapWithStampSources('tree')
  const after = mapWithStampSources('rock', 'rock')
  const initial = withMapIndex('a')
  initial.maps = { a: before }
  const sess = new EditSession(initial)
  const replace: Command = {
    label: '替换组合来源',
    apply: (state) => ({ ...state, maps: { ...state.maps, a: after } }),
    invert: (state) => ({ ...state, maps: { ...state.maps, a: before } }),
  }

  expect(stampPlacementReferences(sess.getMapReferenceBatch(), 'tree')).toHaveLength(1)
  sess.dispatch(replace)
  expect(sess.getMapReferenceBatch().done).toBe(false)
  await sess.ensureMapReferencesIndexed()
  expect(stampPlacementReferences(sess.getMapReferenceBatch(), 'rock')).toHaveLength(2)
  sess.undo()
  await sess.ensureMapReferencesIndexed()
  expect(stampPlacementReferences(sess.getMapReferenceBatch(), 'tree')).toHaveLength(1)
  sess.redo()
  await sess.ensureMapReferencesIndexed()
  expect(stampPlacementReferences(sess.getMapReferenceBatch(), 'rock')).toHaveLength(2)
})

test('地图按需加载去重；hydrate 不进 undo、也不置脏', async () => {
  const loadMap = vi.fn(async () => buildBlankProjectMap(2, 2, 'tileset-001'))
  const sess = new EditSession(withMapIndex('a'), { loadMap })

  const [first, second] = await Promise.all([sess.ensureMapLoaded('a'), sess.ensureMapLoaded('a')])

  expect(first).toBe(second)
  expect(loadMap).toHaveBeenCalledTimes(1)
  expect(sess.getMapDocumentStatus('a')).toEqual({ state: 'ready', dirty: false })
  expect(sess.canUndo()).toBe(false)
  expect(sess.isDirty()).toBe(false)
})

test('地图按需加载绑定当前 path，旧路径的在途结果不能满足新路径', async () => {
  const oldRead = deferred<ProjectMap>()
  const newRead = deferred<ProjectMap>()
  const loadMap = vi
    .fn<(id: string, path: string) => Promise<ProjectMap>>()
    .mockImplementationOnce(() => oldRead.promise)
    .mockImplementationOnce(() => newRead.promise)
  const initial = withMapIndex('a')
  const sess = new EditSession(initial, { loadMap })
  const oldResult = sess.ensureMapLoaded('a')
  sess.dispatch({
    label: '更新地图路径',
    apply: (state) => ({
      ...state,
      mapIndex: {
        version: 1,
        maps: [{ id: 'a', name: 'a', path: 'content/maps/a-new.json' }],
      },
    }),
    invert: (state) => state,
  })
  const newResult = sess.ensureMapLoaded('a')
  await vi.waitFor(() => expect(loadMap).toHaveBeenCalledTimes(2))
  expect(loadMap.mock.calls).toEqual([
    ['a', 'content/maps/a.json'],
    ['a', 'content/maps/a-new.json'],
  ])

  oldRead.resolve(buildBlankProjectMap(1, 1, 'old'))
  await expect(oldResult).rejects.toThrow(/已变化/)
  expect(sess.getState().maps.a).toBeUndefined()
  newRead.resolve(buildBlankProjectMap(1, 1, 'new'))
  await expect(newResult).resolves.toBeDefined()
  expect(sess.getState().maps.a?.tilesetRefs).toEqual(['new'])
})

test('同 path 的在途加载也不能覆盖更新的会话地图正文', async () => {
  const pending = deferred<ProjectMap>()
  const loadMap = vi.fn(() => pending.promise)
  const sess = new EditSession(withMapIndex('a'), { loadMap })
  const result = sess.ensureMapLoaded('a')
  await vi.waitFor(() => expect(loadMap).toHaveBeenCalledOnce())
  const edited = buildBlankProjectMap(1, 1, 'edited')
  sess.dispatch({
    label: '编辑同路径地图',
    apply: (state) => ({ ...state, maps: { ...state.maps, a: edited } }),
    invert: (state) => state,
  })

  pending.resolve(buildBlankProjectMap(1, 1, 'stale'))
  await expect(result).rejects.toThrow(/已变化/)
  expect(sess.getState().maps.a).toBe(edited)
  expect(sess.getMapDocumentStatus('a')).toEqual({ state: 'ready', dirty: true })
})

test('加载失败可重试，并保留明确错误状态', async () => {
  let attempts = 0
  const sess = new EditSession(withMapIndex('a'), {
    loadMap: async () => {
      attempts++
      if (attempts === 1) throw new Error('读取失败')
      return buildBlankProjectMap(2, 2, 'tileset-001')
    },
  })

  await expect(sess.ensureMapLoaded('a')).rejects.toThrow('读取失败')
  expect(sess.getMapDocumentStatus('a')).toEqual({ state: 'error', message: '读取失败' })
  await expect(sess.ensureMapLoaded('a')).resolves.toBeDefined()
  expect(sess.getMapDocumentStatus('a')).toEqual({ state: 'ready', dirty: false })
})

test('干净地图可被 LRU 淘汰；撤销链触及的地图保存后仍 pin，切图后可 undo', async () => {
  const cleanLoad = vi.fn(async () => buildBlankProjectMap(2, 2, 'tileset-001'))
  const clean = new EditSession(withMapIndex('a', 'b'), {
    maxLoadedMaps: 1,
    loadMap: cleanLoad,
  })
  await clean.ensureMapLoaded('a')
  await clean.ensureMapLoaded('b')
  expect(clean.getState().maps.a).toBeUndefined()
  expect(clean.getState().maps.b).toBeDefined()
  expect(tilesetUsageReferences(clean.getMapReferenceBatch(), 'tileset-001')).toHaveLength(2)
  await clean.ensureMapReferencesIndexed()
  expect(cleanLoad).toHaveBeenCalledTimes(2)

  const sess = new EditSession(withMapIndex('a', 'b'), {
    maxLoadedMaps: 1,
    loadMap: async () => buildBlankProjectMap(2, 2, 'tileset-001'),
  })
  await sess.ensureMapLoaded('a')
  sess.dispatch(
    new PaintTilesCommand('a', [
      { layerId: 'floor', col: 0, row: 0, tileId: 7, tilesetId: 'tiles', height: 0 },
    ]),
  )
  sess.markSaved()

  await sess.ensureMapLoaded('b')
  expect(sess.getState().maps.a?.layers[0]?.tiles[0]?.[0]).toBe(7)
  expect(sess.getState().maps.b).toBeDefined()

  sess.undo()
  expect(sess.getState().maps.a?.layers[0]?.tiles[0]?.[0]).toBeNull()
})
