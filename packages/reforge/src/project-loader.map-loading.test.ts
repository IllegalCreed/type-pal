import { expect, test } from 'vitest'
import {
  lbMemorySource,
  lbProjectFiles,
  lbProjectMap,
} from './__tests__/project-loading-boundaries/fixture.js'
import { loadCurrentProjectFrom, loadProjectMapById } from './project-loader.js'

test('未登记 mapId 零 IO 精确拒绝；已登记 mapId 经真实 loadProjectMap 读 indexed path', async () => {
  const source = lbMemorySource(
    lbProjectFiles({ maps: { 'map-001': lbProjectMap(1), 'map-002': lbProjectMap(2) } }),
  )
  const project = await loadCurrentProjectFrom(source)
  source.reads.length = 0
  await expect(loadProjectMapById(project, 'map-ghost')).rejects.toThrow(
    'loadProjectMapById: mapId "map-ghost" 不在 map index',
  )
  // 零 IO：拒绝发生在任何文件读取之前
  expect(source.reads).toEqual([])
  // 已登记：走真实 loadProjectMap（同一加载边界校验 ProjectMap v4）读 indexed path
  const map = await loadProjectMapById(project, 'map-002')
  expect(map).toEqual(lbProjectMap(2))
  expect(source.reads).toEqual(['json:content/maps/map-002.json'])
})

test('两次索引地图读取乱序完成时各自返回请求的地图', async () => {
  const firstPath = 'content/maps/map-001.json'
  const secondPath = 'content/maps/map-002.json'
  const files = lbProjectFiles({ maps: { 'map-001': lbProjectMap(1), 'map-002': lbProjectMap(2) } })
  let releaseFirst = () => {}
  const gate = new Promise<void>((resolve) => {
    releaseFirst = resolve
  })
  const source = lbMemorySource(files, { gates: { [firstPath]: gate } })
  const project = await loadCurrentProjectFrom(source)
  source.reads.length = 0
  source.completedReads.length = 0
  const first = loadProjectMapById(project, 'map-001')
  const second = loadProjectMapById(project, 'map-002')
  try {
    expect(source.reads).toEqual([`json:${firstPath}`, `json:${secondPath}`])
    await expect(second).resolves.toEqual(lbProjectMap(2))
    expect(source.completedReads).toEqual([secondPath])
  } finally {
    releaseFirst()
    await Promise.allSettled([first, second])
  }
  await expect(first).resolves.toEqual(lbProjectMap(1))
  expect(source.completedReads).toEqual([secondPath, firstPath])
})

test('地图读取错误包含索引路径与 IO 原因，另一张地图仍可加载', async () => {
  const files = lbProjectFiles({ maps: { 'map-001': lbProjectMap(1), 'map-002': lbProjectMap(2) } })
  const failure = new Error('map-002-io-dead')
  const source = lbMemorySource(files, {
    throws: { 'content/maps/map-002.json': failure },
  })
  const project = await loadCurrentProjectFrom(source)
  await Promise.all([
    expect(loadProjectMapById(project, 'map-002')).rejects.toThrow(
      /^content\/maps\/map-002\.json —— .+；map-002-io-dead$/u,
    ),
    expect(loadProjectMapById(project, 'map-001')).resolves.toEqual(lbProjectMap(1)),
  ])
})
