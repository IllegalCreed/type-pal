import type { SceneIndexV1 } from '@type-pal/content'
import { expect, test } from 'vitest'
import { dProjectFiles, memoryFileSource } from './__tests__/glm-runtime-contract-fixtures.js'
import { lbMemorySource, lbProjectFiles } from './__tests__/project-loading-boundaries/fixture.js'
import {
  baseJsons,
  files,
  manifest,
} from './__tests__/project-loading-boundaries/startup-fixture.js'
import {
  assembleCurrentProject,
  loadAllAuthorScenes,
  loadAuthorScene,
  loadCurrentProjectFrom,
} from './project-loader.js'

test('loads entry and lazy scenes only from explicit SceneIndex paths', async () => {
  const projectFiles = files()
  projectFiles['content/scenes/index.json'] = {
    version: 1,
    scenes: [{ id: 's001', name: '场景 s001', path: 'content/authored/opening.json' }],
  } satisfies SceneIndexV1
  projectFiles['content/authored/opening.json'] = projectFiles['content/scenes/s001.json']
  delete projectFiles['content/scenes/s001.json']
  const loaded = await loadCurrentProjectFrom(lbMemorySource(projectFiles))
  expect(loaded.sceneIndex.scenes[0]?.name).toBe('场景 s001')
  await expect(loadAuthorScene(loaded, 's001')).resolves.toMatchObject({ id: 's001' })
  await expect(loadAuthorScene(loaded, 'missing')).rejects.toThrow('不在 scene index')
})

test('lazy scene path missing or body id mismatch fails loud at the indexed path', async () => {
  const projectFiles = files()
  projectFiles['content/scenes/index.json'] = {
    version: 1,
    scenes: [
      { id: 's001', name: '场景 s001', path: 'content/scenes/s001.json' },
      { id: 's002', name: '错配', path: 'content/authored/s002.json' },
      { id: 's003', name: '缺失', path: 'content/authored/s003.json' },
    ],
  } satisfies SceneIndexV1
  projectFiles['content/authored/s002.json'] = {
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [],
    mapId: 'map-001',
    id: 'different',
  }
  const loaded = await loadCurrentProjectFrom(lbMemorySource(projectFiles))
  await expect(loadAuthorScene(loaded, 's002')).rejects.toThrow('场景文件 id 不符')
  await expect(loadAuthorScene(loaded, 's003')).rejects.toThrow(
    'missing content/authored/s003.json',
  )
})

test('loads and validates every real entry while deriving runtime cache from defaultEntryId', () => {
  const second = {
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [],
    mapId: 'map-001',
    id: 's002',
  }
  const projectManifest = manifest({
    defaultEntryId: 'default-entry',
    entryPoints: [
      {
        id: 'other-entry',
        label: '其他入口',
        scene: 's001',
        startWorld: { party: [], money: 0, inventory: [] },
      },
      {
        id: 'default-entry',
        label: '默认入口',
        scene: 's002',
        startWorld: { party: [], money: 0, inventory: [] },
      },
    ],
  })
  const project = assembleCurrentProject(projectManifest, {
    ...baseJsons,
    sceneIndex: {
      version: 1,
      scenes: [
        ...baseJsons.sceneIndex.scenes,
        { id: 's002', name: '第二场景', path: 'content/scenes/s002.json' },
      ],
    },
    entryScenes: { ...baseJsons.entryScenes, s002: second },
  })
  expect(project.entryScene.id).toBe('s002')
  expect(Object.keys(project.authorContent.entryScenes)).toEqual(['s001', 's002'])
})

test.each([
  's002',
  'constructor',
])('loads and indexes the configured default scene %s as an own entry', async (sceneId) => {
  const projectManifest = manifest({
    defaultEntryId: 'alternate',
    entryPoints: [
      manifest().entryPoints[0],
      {
        id: 'alternate',
        label: 'Alternate',
        scene: sceneId,
        startWorld: { party: [], money: 17, inventory: [] },
      },
    ],
  })
  const project = await loadCurrentProjectFrom(lbMemorySource(files(projectManifest)))
  expect({
    ownedScene: Object.hasOwn(project.authorContent.entryScenes, sceneId),
    authorScene: project.authorContent.entryScene.id,
    runtimeScene: project.entryScene.id,
  }).toEqual({ ownedScene: true, authorScene: sceneId, runtimeScene: sceneId })
})

test('rejects a broken non-default entry world reference', () => {
  const projectManifest = manifest({
    entryPoints: [
      manifest().entryPoints[0],
      {
        id: 'broken',
        label: '损坏入口',
        scene: 's002',
        startWorld: { party: ['missing-actor'], money: 0, inventory: [] },
      },
    ],
  })
  expect(() =>
    assembleCurrentProject(projectManifest, {
      ...baseJsons,
      sceneIndex: {
        version: 1,
        scenes: [
          ...baseJsons.sceneIndex.scenes,
          { id: 's002', name: '第二场景', path: 'content/scenes/s002.json' },
        ],
      },
      entryScenes: {
        ...baseJsons.entryScenes,
        s002: {
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [],
          mapId: 'map-001',
          id: 's002',
        },
      },
    }),
  ).toThrow(/entryPoints\[broken\].*missing-actor/)
})

test('reports a missing non-default entry scene with the stable entry id', async () => {
  const projectManifest = manifest({
    entryPoints: [
      manifest().entryPoints[0],
      {
        id: 'missing-scene-entry',
        label: '缺失场景',
        scene: 's002',
        startWorld: { party: [], money: 0, inventory: [] },
      },
    ],
  })
  const projectFiles = files(projectManifest)
  delete projectFiles['content/scenes/s002.json']
  await expect(loadCurrentProjectFrom(lbMemorySource(projectFiles))).rejects.toThrow(
    /entryPoints\[missing-scene-entry\].*s002\.json/,
  )
})

test('入口读取抛非 Error 时保留入口 ID、登记路径和原始原因', async () => {
  const files = lbProjectFiles({ entryScenePath: 'content/authored/main-scene.json' })
  const source = lbMemorySource(files, {
    throws: { 'content/authored/main-scene.json': 'io-flux-4242' },
  })
  await expect(loadCurrentProjectFrom(source)).rejects.toThrow(
    'manifest.entryPoints[new-game].scene: 无法读取 "content/authored/main-scene.json": io-flux-4242',
  )
})

test('返回顺序 = sceneIds 顺序（与文件表写入顺序无关）', async () => {
  const files = dProjectFiles({ sceneIds: ['s003', 's001', 's002'] })
  const source = memoryFileSource(files)
  const project = await loadCurrentProjectFrom(source)
  const authors = await loadAllAuthorScenes(project)
  expect(authors.map((s) => s.id)).toEqual(['s003', 's001', 's002'])
})
test('中间场景读取失败：整批拒绝（不返回部分数组）；IO 轨迹证明确实读过前序场景', async () => {
  const files = dProjectFiles({ sceneIds: ['s001', 's002', 's003'] })
  const source = memoryFileSource(files, 'content/scenes/s002.json')
  const project = await loadCurrentProjectFrom(source)
  source.reads.length = 0
  await expect(loadAllAuthorScenes(project)).rejects.toThrow('boom-json:content/scenes/s002.json')
  // 实际 IO 轨迹：s001 先被读过、s002 失败即停（s003 未读）
  const sceneReads = source.reads.filter((entry) => entry.startsWith('json:content/scenes/s'))
  expect(sceneReads).toEqual(['json:content/scenes/s001.json', 'json:content/scenes/s002.json'])
  // 同输入全成功对照
  const okProject = await loadCurrentProjectFrom(memoryFileSource(dProjectFiles()))
  await expect(loadAllAuthorScenes(okProject)).resolves.toHaveLength(3)
})
