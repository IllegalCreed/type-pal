// Isolated mutation verification for WORLD-ASYNC-COMMIT-1. Never writes product files or coverage.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const logs = mkdtempSync(join(tmpdir(), 'world-async-mutants-'))
const sha = (value) => createHash('sha256').update(value).digest('hex')
const cases = [
  { name: 'control', file: null, from: '', to: '', expected: 0 },
  { name: 'editor-control', file: null, from: '', to: '', expected: 0, package: 'editor' },
  {
    name: 'editor-loses-commit-control',
    file: '../../editor/src/core/playback.ts',
    package: 'editor',
    from: '{ currentSceneId: () => runtimeScene.id, ...(commitControl ? { commitControl } : {}) }',
    to: '{ currentSceneId: () => runtimeScene.id }',
    expected: 1,
  },
  {
    name: 'map-early-write',
    file: 'script-project-core.ts',
    from: 'const control: SceneMapCommitControl = {',
    to: 'this.world.mapOverride ??= {}; this.world.mapOverride[sceneId] = command.mapId; const control: SceneMapCommitControl = {',
    expected: 1,
  },
  {
    name: 'selector-no-abort',
    file: 'script-project-core.ts',
    from: "// This check belongs after the leaf's final await, not inside an awaited resolver helper.\n        signal.throwIfAborted()",
    to: '// witness: removed the post-await cancellation check',
    expected: 1,
  },
  {
    name: 'selector-no-session',
    file: 'script-project-core.ts',
    from: "if (\n          this.currentSceneId() !== sourceSceneId ||\n          this.currentSceneSessionId() !== sourceSessionId\n        )\n          throw new DOMException('selection source session changed', 'AbortError')",
    to: '// witness: removed source-session check',
    expected: 1,
  },
  {
    name: 'preflight-no-behavior',
    file: 'scene-switch-transaction.ts',
    from: 'behavior: captureRuntimeSceneBehaviorDependencies(scene, script),',
    to: 'behavior: { onEnter: null, onTeleport: null, entities: [] },',
    expected: 1,
  },
  {
    name: 'preflight-live-script',
    file: 'main.ts',
    from: 'const preparedWorld = structuredClone(worldView)',
    to: 'const preparedWorld = { ...worldView }',
    expected: 1,
  },
  {
    name: 'main-loses-commit-control',
    file: 'main.ts',
    from: '{ currentSceneId: () => scene.id, ...(commitControl ? { commitControl } : {}) }',
    to: '{ currentSceneId: () => scene.id }',
    expected: 1,
  },
  {
    name: 'post-commit-skips-notification',
    file: 'script-project-core.ts',
    from: 'if (committed) await this.options.worldChanged?.(command, context)',
    to: 'if (committed && !signal.aborted) await this.options.worldChanged?.(command, context)',
    expected: 1,
  },
]
const files = [
  ...new Set(
    cases.flatMap((item) => (item.file ? [join(root, 'packages/reforge/src', item.file)] : [])),
  ),
]
const sourceHashes = Object.fromEntries(files.map((file) => [file, sha(readFileSync(file))]))
const results = []
for (const item of cases) {
  const packageId = item.package ?? 'reforge'
  const config = join(logs, `${item.name}.config.mjs`)
  const mutation = {
    ...item,
    file: item.file ? join(root, 'packages/reforge/src', item.file) : null,
  }
  if (mutation.file)
    assert.equal(
      readFileSync(mutation.file, 'utf8').split(item.from).length,
      2,
      `${item.name}: exactly one replacement point required`,
    )
  // Generated temporary Vite configuration: normal loader for every other module, raw TS stays raw.
  writeFileSync(
    config,
    `
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const mutation=${JSON.stringify(mutation)};
export default {
 root:${JSON.stringify(join(root, 'packages', packageId))},
 plugins:[{name:'world-async-single-point',enforce:'pre',load(id){
  if(!mutation.file || id.split('?')[0]!==mutation.file)return;
  const before=readFileSync(mutation.file,'utf8');
  assert.equal(before.split(mutation.from).length,2,'unique source point');
  const after=before.replace(mutation.from,mutation.to);
  console.log('MUTATION_HIT',mutation.name);
  return id.includes('?raw')?'export default '+JSON.stringify(after):after;
 }}],
 test:{include:${JSON.stringify(packageId === 'editor' ? ['src/core/playback.test.ts'] : ['src/world-async-commit.test.ts', 'src/scene-preflight.chain.test.ts'])},maxWorkers:1,fileParallelism:false}
};
`,
  )
  const command = [
    '--filter',
    `@type-pal/${packageId}`,
    'exec',
    'vitest',
    'run',
    '--config',
    config,
  ]
  const run = spawnSync('pnpm', command, {
    cwd: root,
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 16 * 1024 * 1024,
  })
  const output = (run.stdout ?? '') + (run.stderr ?? '')
  const log = join(logs, `${item.name}.log`)
  writeFileSync(log, output)
  assert.equal(run.signal, null, `${item.name}: process interruption; ${log}`)
  assert.equal(run.status, item.expected, `${item.name}: unexpected exit; ${log}`)
  if (item.expected === 1) {
    assert.ok(output.includes(`MUTATION_HIT ${item.name}`), `${item.name}: mutation was not loaded`)
    assert.match(
      output,
      /AssertionError/,
      `${item.name}: expected business regression, not host failure`,
    )
    assert.doesNotMatch(
      output,
      /ReferenceError|Cannot find module|Failed to load url|No test files found/,
      `${item.name}: environment error is not evidence`,
    )
  }
  results.push({
    name: item.name,
    command: ['pnpm', ...command],
    exit: run.status,
    log,
    logSha256: sha(output),
    from: item.from,
    to: item.to,
    file: item.file,
  })
  process.stderr.write(`${item.name}: expected ${item.expected}, actual ${run.status}\n`)
}
for (const [file, hash] of Object.entries(sourceHashes))
  assert.equal(sha(readFileSync(file)), hash, `product changed during verification: ${file}`)
console.log(JSON.stringify({ logs, sourceHashes, results }, null, 2))
