import { validateProjectRelativePath } from '@type-pal/content'
import {
  type FileSource,
  loadAllAuthorScenes,
  loadCurrentProjectFrom,
  loadStampTemplates,
} from '@type-pal/reforge'
import { expect, test } from 'vitest'
import { authorBaselineSummary, observeAuthorSource } from './author-disk-baseline.js'
import { serializeProjectWithMapCopies, toEditorState } from './project-io.js'

const jsonFiles = new Map(
  Object.entries(
    import.meta.glob<string>('../../../../projects/pal/**/*.json', {
      eager: true,
      query: '?raw',
      import: 'default',
    }),
  ).map(([path, text]) => [path.split('/projects/pal/')[1]!, text]),
)

test('PAL actual read evidence covers current serialized author paths without decoding maps or reading binary resources', async () => {
  const reads: string[] = []
  let bytesRead = 0
  const readBytes = async (path: string) => {
    validateProjectRelativePath(path, 'PAL baseline fixture')
    const text = jsonFiles.get(path)
    if (text === undefined) throw new Error(`PAL author fixture missing ${path}`)
    const bytes = new TextEncoder().encode(text)
    reads.push(path)
    bytesRead += bytes.byteLength
    return bytes.buffer
  }
  const source: FileSource = {
    readBytes,
    readText: async (path) => new TextDecoder().decode(await readBytes(path)),
    readJson: async <T>(path: string) =>
      JSON.parse(new TextDecoder().decode(await readBytes(path))) as T,
    urlFor: async () => {
      throw new Error('baseline must not resolve media URLs')
    },
  }
  const start = performance.now()
  const observed = observeAuthorSource(source)
  const project = await loadCurrentProjectFrom(observed.source)
  const [scenes, stamps] = await Promise.all([
    loadAllAuthorScenes(project),
    loadStampTemplates(project),
  ])
  const baseline = await observed.finish(project)
  const metrics = {
    elapsedMs: Math.round(performance.now() - start),
    reads: reads.length,
    totalBytesRead: bytesRead,
    ...authorBaselineSummary(baseline),
  }
  const editor = toEditorState(project, scenes, {}, {}, stamps)
  const files = await serializeProjectWithMapCopies(editor, project.source)
  expect(authorBaselineSummary(baseline).paths).toEqual(Object.keys(files).sort())
  expect(editor.maps).toEqual({})
  const resourcePaths = new Set(
    Object.values(project.assetCatalog.assets).map((asset) => asset.path),
  )
  expect(reads.filter((path) => resourcePaths.has(path))).toEqual([])
  console.info('PAL author baseline read cost', { ...metrics, paths: metrics.paths.length })
})
