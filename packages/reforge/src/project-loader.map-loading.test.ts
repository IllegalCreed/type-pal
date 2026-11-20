import { expect, test, vi } from 'vitest'
import {
  lbMemorySource,
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

test('未登记 mapId 零 IO 精确拒绝；已登记 mapId 经真实 loadProjectMap 读 indexed path', async () => {
  const source = lbMemorySource(
    lbProjectFiles({ maps: { 'map-001': lbProjectMap(1), 'map-002': lbProjectMap(2) } }),
  )
  const project = await loadCurrentProjectFrom(source)
  source.reads.length = 0
  const ghost = await rejectOf(loadProjectMapById(project, 'map-ghost'))
  expect(ghost.kind).toBe('rejected')
  expect(ghost.message).toContain('loadProjectMapById: mapId "map-ghost" 不在 map index')
  // 零 IO：拒绝发生在任何文件读取之前
  expect(source.reads).toEqual([])
  // 已登记：走真实 loadProjectMap（同一加载边界校验 ProjectMap v4）读 indexed path
  const map = await loadProjectMapById(project, 'map-002')
  expect(map).toEqual(lbProjectMap(2))
  expect(source.reads).toEqual(['json:content/maps/map-002.json'])
})

test('loadAllProjectMaps 乱序完成仍按稳定 id 归位', async () => {
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
  expect(maps['map-a']).toEqual(lbProjectMap(1))
  expect(maps['map-b']).toEqual(lbProjectMap(2))
  expect(maps['map-c']).toEqual(lbProjectMap(3))
})

test('loadAllProjectMaps 单个 IO 拒绝整批，不返回部分成功', async () => {
  const files = lbProjectFiles({ maps: { 'map-001': lbProjectMap(1), 'map-c': lbProjectMap(3) } })
  const failingSource = lbMemorySource(files, {
    throws: { 'content/maps/map-c.json': 'map-c-io-dead' },
  })
  const failingProject = await loadCurrentProjectFrom(failingSource)
  const failed = await rejectOf(loadAllProjectMaps(failingProject))
  expect(failed.kind).toBe('rejected')
  expect(failed.message).toContain('map-c-io-dead')
})
