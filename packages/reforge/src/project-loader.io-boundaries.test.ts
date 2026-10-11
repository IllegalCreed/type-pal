/**
 * TEST-REFORGE-PROJECT-LOADING-BOUNDARIES-1 C8/C9/C10：入口 IO 错误上下文、地图公开入口
 * 闭环与 optional 表保真。全部使用隔离合成工程（fixture.ts），不读写真实 PAL/migrate。
 *
 * C8 只补非 Error 抛出臂：Error 臂与缺文件上下文已由 project-loader.test.ts:366-383 证明，
 * 这里登记不重复；两个错误类别共享同一上下文合同（entry id + indexed path + detail + 整批拒绝）。
 * C9 只控外部 IO 完成时序与抛错（FileSource 公开域），地图解码链本身是 assets 旧测登记项。
 * C10 的 malformed ambiences 无 validator 属疑似产品宽松，只交 product-counter，不固化绿测。
 */
import { describe, expect, test, vi } from 'vitest'
import {
  lbMemorySource,
  lbPoison,
  lbProjectFiles,
  lbProjectMap,
} from './__tests__/project-loading-boundaries/fixture.js'
import { loadAllProjectMaps, loadCurrentProjectFrom, loadProjectMapById } from './project-loader.js'

type Rejection = { kind: 'resolved' | 'rejected'; message: string }

async function rejectOf(promise: Promise<unknown>): Promise<Rejection> {
  return promise.then(
    () => ({ kind: 'resolved' as const, message: '' }),
    (error: unknown) => ({
      kind: 'rejected' as const,
      message: error instanceof Error ? error.message : String(error),
    }),
  )
}

describe('C8 入口场景 IO 错误上下文', () => {
  test('外部 IO 对入口场景抛非 Error：entry id、indexed path 与 String detail 保留且整批拒绝', async () => {
    const marker = 'C8-entry-io-context'
    // 入口场景登记在 scene index 的显式路径（非拼接默认），证明报错引用的是 indexed path
    const files = lbProjectFiles({ entryScenePath: 'content/authored/main-scene.json' })
    const source = lbMemorySource(files, {
      throws: { 'content/authored/main-scene.json': 'io-flux-4242' },
    })
    // FileSource 实现可合法抛非 Error 值；loader 的 detail 分支必须保留 String(error) 渲染
    const first = await rejectOf(loadCurrentProjectFrom(source))
    expect(first.kind, marker).toBe('rejected')
    expect(first.message, marker).toContain(
      'manifest.entryPoints[new-game].scene: 无法读取 "content/authored/main-scene.json": io-flux-4242',
    )
  })
})

describe('C9 地图公开入口闭环', () => {
  test('未登记 mapId 零 IO 精确拒绝；已登记 mapId 经真实 loadProjectMap 读 indexed path', async () => {
    const marker = 'C9-map-by-id'
    const source = lbMemorySource(
      lbProjectFiles({ maps: { 'map-001': lbProjectMap(1), 'map-002': lbProjectMap(2) } }),
    )
    const project = await loadCurrentProjectFrom(source)
    source.reads.length = 0
    const ghost = await rejectOf(loadProjectMapById(project, 'map-ghost'))
    expect(ghost.kind, marker).toBe('rejected')
    expect(ghost.message, marker).toContain('loadProjectMapById: mapId "map-ghost" 不在 map index')
    // 零 IO：拒绝发生在任何文件读取之前
    expect(source.reads, marker).toEqual([])
    // 已登记：走真实 loadProjectMap（同一加载边界校验 ProjectMap v4）读 indexed path
    const map = await loadProjectMapById(project, 'map-002')
    expect(map, marker).toEqual(lbProjectMap(2))
    expect(source.reads, marker).toEqual(['json:content/maps/map-002.json'])
  })

  test('loadAllProjectMaps 乱序完成仍按稳定 id 归位', async () => {
    const marker = 'C9-map-batch'
    const files = lbProjectFiles({
      maps: {
        'map-001': lbProjectMap(1),
        'map-a': lbProjectMap(1),
        'map-b': lbProjectMap(2),
        'map-c': lbProjectMap(3),
      },
    })
    // 外部 IO 时序控制：map-b 的读取闸住，直到 map-a/map-c 都完成后才放行
    let releaseB!: () => void
    const gateB = new Promise<void>((resolve) => {
      releaseB = resolve
    })
    const racingSource = lbMemorySource(files, { gates: { 'content/maps/map-b.json': gateB } })
    const racingProject = await loadCurrentProjectFrom(racingSource)
    const pending = loadAllProjectMaps(racingProject)
    await vi.waitFor(() => expect(racingSource.completedReads).toContain('content/maps/map-c.json'))
    expect(racingSource.completedReads).toContain('content/maps/map-a.json')
    expect(racingSource.completedReads).not.toContain('content/maps/map-b.json')
    releaseB()
    const maps = await pending
    // 完成顺序 a/c → b 不影响归位：每个稳定 id 拿到自己的地图正文
    expect(maps['map-a'], marker).toEqual(lbProjectMap(1))
    expect(maps['map-b'], marker).toEqual(lbProjectMap(2))
    expect(maps['map-c'], marker).toEqual(lbProjectMap(3))
  })

  test('loadAllProjectMaps 单个 IO 拒绝整批，不返回部分成功', async () => {
    const marker = 'C9-map-batch-rejection'
    const files = lbProjectFiles({ maps: { 'map-001': lbProjectMap(1), 'map-c': lbProjectMap(3) } })
    const failingSource = lbMemorySource(files, {
      throws: { 'content/maps/map-c.json': 'map-c-io-dead' },
    })
    const failingProject = await loadCurrentProjectFrom(failingSource)
    const failed = await rejectOf(loadAllProjectMaps(failingProject))
    expect(failed.kind, marker).toBe('rejected')
    expect(failed.message, marker).toContain('map-c-io-dead')
  })
})

describe('C10 optional 表保真', () => {
  test('可缺表缺席时公开字段为空默认', async () => {
    const marker = 'C10-optional-tables'
    const bare = await loadCurrentProjectFrom(lbMemorySource(lbProjectFiles()))
    expect(bare.enemiesById, marker).toEqual({})
    expect(bare.enemyTeamsById, marker).toEqual({})
    expect(bare.battleFields, marker).toEqual([])
    expect(bare.poisons, marker).toEqual([])
    expect(bare.poisonsById, marker).toEqual({})
    expect(bare.ambiences, marker).toEqual([])
    expect(bare.shops, marker).toEqual([])
    expect(bare.migrationDiagnostics, marker).toEqual({ version: 1, diagnostics: [] })
  })

  test('合法非空当前表逐表保真到工程公开字段', async () => {
    const marker = 'C10-optional-tables-full'
    // 非空当前表（全部合法形状）保真：按稳定键/原序落到工程公开字段
    const full = await loadCurrentProjectFrom(
      lbMemorySource(
        lbProjectFiles({
          poisons: [lbPoison(7), lbPoison(8)],
          optionalTables: {
            enemyTeams: [{ id: 'team-1', slots: [null, null] }],
            battleFields: [
              {
                id: 1,
                screenWave: 0,
                magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
              },
            ],
            shops: [{ id: 3, items: [] }],
            ambiences: [{ id: 'night', name: '夜晚', tint: [120, 140, 200] }],
            migrationDiagnostics: { version: 1, diagnostics: [] },
          },
        }),
      ),
    )
    expect(
      full.poisons.map((poison) => poison.id),
      marker,
    ).toEqual([7, 8])
    expect(full.poisonsById[8], marker).toBeDefined()
    expect(full.enemyTeamsById['team-1']?.slots, marker).toEqual([null, null])
    expect(full.battleFields[0]?.id, marker).toBe(1)
    expect(full.shops[0], marker).toEqual({ id: 3, items: [] })
    expect(full.ambiences, marker).toEqual([{ id: 'night', name: '夜晚', tint: [120, 140, 200] }])
    expect(full.migrationDiagnostics, marker).toEqual({ version: 1, diagnostics: [] })
  })
})
