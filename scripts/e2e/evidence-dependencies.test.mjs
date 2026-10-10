import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  assertDependencyClosure,
  dependencyImpact,
  localDependencyGraph,
  recordingDependencies,
} from './evidence-dependencies.mjs'
import { assertDeclaredInputs, producerExtraInputs } from './producer-inputs.mjs'
import { readStoryContract, STORY_PRODUCERS } from './recorded-story-contract.mjs'

test('producer manifest follows actual nested imports, rejects omitted receipts and separates unused oracle files', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'pal-producer-graph-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const write = async (path, body) => {
    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(join(root, path), body)
  }
  for (const [path, body] of Object.entries({
    'entry.mjs': "import './execute.mjs'; export const scenario = 1",
    'execute.mjs': "export { collect } from './collect.mjs'",
    'collect.mjs': 'export const collect = 1',
    'trace.mts': "export { collect } from './collect.mjs'",
    'packages/game/src/main.ts': "import { state } from '@type-pal/state'; export { state }",
    'packages/game/index.html': '<script type="module" src="/src/boot.ts"></script>',
    'packages/game/src/boot.ts': "import './main.ts'",
    'packages/game/package.json': '{}',
    'packages/game/tsconfig.json': '{"extends":"../../tsconfig.base.json"}',
    'packages/state/tsconfig.json': '{"extends":"../../tsconfig.base.json"}',
    'tsconfig.base.json': '{}',
    'pnpm-workspace.yaml': "packages: ['packages/*']",
    'packages/state/package.json': '{"exports":{".":"./src/index.ts"}}',
    'packages/state/src/index.ts': 'export const state = 1',
    'oracle.mjs': 'export const expected = 1',
    'story.json': '{"story":1}',
    'package.json': '{}',
    'pnpm-lock.yaml': 'lockfileVersion: 9.0',
  }))
    await write(path, body)
  const definition = {
    entry: 'entry.mjs',
    traceConfig: 'trace.mts',
    packageName: 'game',
    declared: ['oracle.mjs', 'story.json'],
  }
  const recorded = await recordingDependencies(root, definition)
  const current = await recordingDependencies(root, definition)
  assertDependencyClosure(recorded, current)
  assert.deepEqual(current.groups.execution, ['collect.mjs', 'entry.mjs', 'execute.mjs'])
  assert(current.groups.runtime.includes('packages/state/src/index.ts'))
  assert(current.groups.runtime.includes('packages/game/src/boot.ts'))
  assert(current.groups.inputs.includes('tsconfig.base.json'))
  assert.equal(dependencyImpact(current, 'collect.mjs'), 'producer')
  assert.equal(dependencyImpact(current, 'story.json'), 'producer')
  assert.equal(dependencyImpact(current, 'oracle.mjs'), 'declared-oracle')
  const omitted = structuredClone(recorded)
  omitted.groups.execution = omitted.groups.execution.filter((path) => path !== 'collect.mjs')
  delete omitted.hashes['collect.mjs']
  assert.throws(() => assertDependencyClosure(omitted, current), /omitted a dependency/)
  await write('execute.mjs', "import './new.mjs'; export { collect } from './collect.mjs'")
  await write('new.mjs', 'export const added = true')
  assert.throws(() => dependencyImpact(current, 'new.mjs'), /unclassified/)
  assert.throws(
    () =>
      assertDependencyClosure(recorded, {
        ...current,
        definition: { ...definition, entry: 'oracle.mjs' },
      }),
    /entry definition/,
  )
  const changed = await recordingDependencies(root, definition)
  assert.throws(() => assertDependencyClosure(recorded, changed), /omitted a dependency/)
  await write('dynamic.mjs', 'export const load = (name) => import(name)')
  await assert.rejects(localDependencyGraph(root, ['dynamic.mjs']), /explicit loader contract/)
  await assert.rejects(localDependencyGraph(root, ['../external.mjs']), /escaped repository/)
  const outside = await mkdtemp(join(tmpdir(), 'pal-producer-external-'))
  t.after(() => rm(outside, { recursive: true, force: true }))
  await writeFile(join(outside, 'private.mjs'), 'export const secret = 1')
  await symlink(outside, join(root, 'external'))
  await assert.rejects(localDependencyGraph(root, ['external/private.mjs']), /symlink escaped/)
})

test('actual RF entry includes boot, compiler configuration and independently required non-code inputs', async () => {
  const root = fileURLToPath(new URL('../../', import.meta.url)),
    contract = await readStoryContract('001', root),
    definition = {
      ...STORY_PRODUCERS['001']('reforge'),
      packageName: 'reforge',
      declared: [...Object.keys(contract.hashes), ...producerExtraInputs('001', 'reforge')],
    },
    recorded = await recordingDependencies(root, definition)
  assertDeclaredInputs(recorded, Object.keys(contract.hashes), '001', 'reforge')
  for (const file of [
    'packages/reforge/index.html',
    'packages/reforge/src/boot.ts',
    'packages/reforge/src/runnable-project-loader.ts',
  ])
    assert(recorded.groups.runtime.includes(file), `actual browser entry omitted ${file}`)
  for (const file of [
    'tsconfig.base.json',
    'packages/reforge/tsconfig.json',
    'packages/reforge/package.json',
    'pnpm-workspace.yaml',
  ])
    assert(recorded.groups.inputs.includes(file), `actual compiler input omitted ${file}`)
  const omitted = structuredClone(recorded),
    path = 'projects/pal/manifest.json'
  omitted.definition.declared = omitted.definition.declared.filter((file) => file !== path)
  for (const group of Object.keys(omitted.groups))
    omitted.groups[group] = omitted.groups[group].filter((file) => file !== path)
  delete omitted.hashes[path]
  // Rebuilding from a forged declaration alone is insufficient; the real caller's
  // required non-code contract must still reject it before comparison/launch.
  assertDependencyClosure(omitted, await recordingDependencies(root, omitted.definition))
  assert.throws(
    () => assertDeclaredInputs(omitted, Object.keys(contract.hashes), '001', 'reforge'),
    /missing required producer input projects\/pal\/manifest.json/,
  )
})
