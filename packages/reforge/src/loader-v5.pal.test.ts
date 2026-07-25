import { expect, test } from 'vitest'
import type { FileSource } from './file-source.js'
import { loadAllScenesV5, loadProjectV5From } from './loader-v5.js'

const projectJson = import.meta.glob('../../../projects/{pal,demo,e2e-own}/**/*.json', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>

function projectFileSource(projectId: string): FileSource {
  const readText = async (path: string): Promise<string> => {
    const key = `../../../projects/${projectId}/${path}`
    const value = projectJson[key]
    if (value === undefined) throw new Error(`fixture JSON 不存在：${key}`)
    return value
  }
  const readBytes = async (path: string): Promise<ArrayBuffer> => {
    return new TextEncoder().encode(await readText(path)).buffer
  }
  return {
    readText,
    readJson: async <T>(path: string) => JSON.parse(await readText(path)) as T,
    readBytes,
    urlFor: async (path) => `fixture://${projectId}/${path}`,
  }
}

test('正式 PAL v5 工程通过 loader、sidecar 验签与全场景校验', async () => {
  const project = await loadProjectV5From(projectFileSource('pal'))
  const scenes = await loadAllScenesV5(project)

  expect(project.manifest.contentVersion).toBe(5)
  expect(project.entryScene.id).toBe('s000')
  expect(scenes).toHaveLength(294)
  expect(Object.keys(project.migrationRegistry)).toEqual(['script-v4-v5'])
  expect(Object.keys(project.sharedScripts)).toHaveLength(0)
})

test.each([
  { id: 'demo', entry: 'guijie-minju', scenes: 1 },
  { id: 'e2e-own', entry: 'start', scenes: 1 },
])('仓库 HTTP fixture $id 已同步为 canonical v5', async ({ id, entry, scenes: count }) => {
  const project = await loadProjectV5From(projectFileSource(id))
  const scenes = await loadAllScenesV5(project)

  expect(project.manifest).toMatchObject({ id, contentVersion: 5, entryScene: entry })
  expect(scenes).toHaveLength(count)
  expect(Object.keys(project.migrationRegistry)).toEqual([])
})
