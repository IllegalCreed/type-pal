import { CONTENT_VERSION } from '@type-pal/content'
import { afterEach, expect, test, vi } from 'vitest'
import { dProjectFiles, memoryFileSource } from './__tests__/glm-runtime-contract-fixtures.js'
import { loadRunnableProject, loadRunnableProjectFrom } from './runnable-project-loader.js'

afterEach(() => vi.unstubAllGlobals())

test.each([
  ['stale-project', '工程 "stale-project"'],
  [42, '工程'],
])('rejects old content before reading dependent files (manifest id: %s)', async (id, label) => {
  const source = memoryFileSource({
    'manifest.json': { id, contentVersion: CONTENT_VERSION - 1 },
  })

  await expect(loadRunnableProjectFrom(source)).rejects.toThrow(
    new Error(
      `${label}: runtime 只接受当前 contentVersion ${CONTENT_VERSION}，收到 ${CONTENT_VERSION - 1}`,
    ),
  )
  expect(source.reads).toEqual(['json:manifest.json'])
})

test('the current manifest reaches the real loader and returns the requested startup entry', async () => {
  const source = memoryFileSource(dProjectFiles({ sceneIds: ['s001', 's002'] }))
  const project = await loadRunnableProjectFrom(source)
  expect(project.manifest).toMatchObject({ id: 'demo-d', contentVersion: CONTENT_VERSION })
  expect(project.manifest.defaultEntryId).toBe('new-game')
  expect(project.manifest.entryPoints).toMatchObject([{ id: 'new-game', scene: 's001' }])
})

test('the current epoch does not bypass validation of its named startup scene', async () => {
  const files = dProjectFiles({ sceneIds: ['s001', 's002'] })
  delete files['content/scenes/s001.json']
  const source = memoryFileSource(files)
  await expect(loadRunnableProjectFrom(source)).rejects.toThrow('missing content/scenes/s001.json')
})

test('standalone loading requests the manifest below the chosen project HTTP root', async () => {
  vi.stubGlobal('fetch', async (url: string) =>
    url === 'projects/demo/manifest.json'
      ? Response.json({ id: 'demo', contentVersion: CONTENT_VERSION - 1 })
      : new Response(null, { status: 404 }),
  )

  await expect(loadRunnableProject('demo')).rejects.toThrow(
    new Error(
      `工程 "demo": runtime 只接受当前 contentVersion ${CONTENT_VERSION}，收到 ${CONTENT_VERSION - 1}`,
    ),
  )
})
