import {
  buildBlankProjectMap,
  paintProjectMapCollision,
  paintProjectMapTiles,
} from '@type-pal/reforge'
import { expect, test, vi } from 'vitest'
import type { Command } from './commands.js'
import { ApplyProjectMapPatchCommand, PaintTilesCommand } from './commands.js'
import { type EditorState, EditSession, MoveEntityCommand } from './edit-session.js'

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
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
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
    new PaintTilesCommand('map-a', [{ layerId: 'floor', row: 0, col: 0, tileId: 1, height: 0 }]),
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
      new PaintTilesCommand('map-a', [{ layerId: 'floor', row: 1, col: 0, tileId: 2, height: 0 }]),
    ),
  ).toThrow('已变化')
  expect(sess.getState()).toBe(stateBeforeStale)
  expect(sess.getVersion()).toBe(versionBeforeStale)
  expect(sess.getVersion()).toBeGreaterThan(beforeVersion)
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
  map = paintProjectMapTiles(map, [{ layerId: 'floor', row: 0, col: 0, tileId: 2, height: 0 }])
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
  sess.dispatch(new MoveEntityCommand('s', 'e', { col: 5, row: 6, height: 0 }))
  expect(sess.isDirty()).toBe(true)
  const fn = vi.fn()
  sess.subscribe(fn)
  sess.markSaved()
  expect(sess.isDirty()).toBe(false)
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
  const clean = new EditSession(withMapIndex('a', 'b'), {
    maxLoadedMaps: 1,
    loadMap: async () => buildBlankProjectMap(2, 2, 'tileset-001'),
  })
  await clean.ensureMapLoaded('a')
  await clean.ensureMapLoaded('b')
  expect(clean.getState().maps.a).toBeUndefined()
  expect(clean.getState().maps.b).toBeDefined()

  const sess = new EditSession(withMapIndex('a', 'b'), {
    maxLoadedMaps: 1,
    loadMap: async () => buildBlankProjectMap(2, 2, 'tileset-001'),
  })
  await sess.ensureMapLoaded('a')
  sess.dispatch(
    new PaintTilesCommand('a', [{ layerId: 'floor', col: 0, row: 0, tileId: 7, height: 0 }]),
  )
  sess.markSaved()

  await sess.ensureMapLoaded('b')
  expect(sess.getState().maps.a?.layers[0]?.tiles[0]?.[0]).toBe(7)
  expect(sess.getState().maps.b).toBeDefined()

  sess.undo()
  expect(sess.getState().maps.a?.layers[0]?.tiles[0]?.[0]).toBeNull()
})
