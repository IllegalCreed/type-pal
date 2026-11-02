import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { browserDependencyGraph, localDependencyGraph } from './evidence-dependencies.mjs'

test('worker URL imports retain the worker and its nested code in the evidence closure', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'pal-worker-dependency-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await writeFile(join(root, 'entry.ts'), "import url from './worker.ts?worker&url'; void url")
  await writeFile(join(root, 'worker.ts'), "import './audio.ts'")
  await writeFile(join(root, 'audio.ts'), 'export const sampleRate = 44100')
  assert.deepEqual((await localDependencyGraph(root, ['entry.ts'])).files, [
    'audio.ts',
    'entry.ts',
    'worker.ts',
  ])
  await writeFile(join(root, 'entry.ts'), "import './worker.ts?unclassified'")
  await assert.rejects(localDependencyGraph(root, ['entry.ts']), /unsupported.*query/)
  await writeFile(join(root, 'entry.ts'), "import './missing.ts?worker&url'")
  await assert.rejects(localDependencyGraph(root, ['entry.ts']), /unresolved local/)
  await mkdir(join(root, 'nested'))
  await writeFile(join(root, 'nested/entry.ts'), "import '../../outside.ts?worker&url'")
  await assert.rejects(localDependencyGraph(root, ['nested/entry.ts']), /escaped repository/)
})

test('the real Game browser entry includes the RIX worklet implementation', async () => {
  const root = fileURLToPath(new URL('../../', import.meta.url))
  const graph = await browserDependencyGraph(root, 'game')
  assert(graph.files.includes('packages/game/src/shell/rix-worklet.ts'))
  assert(graph.files.includes('packages/game/src/shell/audio-rix.ts'))
})
