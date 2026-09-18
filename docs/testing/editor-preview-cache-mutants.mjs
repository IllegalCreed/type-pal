// Real component regressions: one control + seven isolated private-cache mutations.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const fire = join(root, 'packages/editor/src/ui/FireEffectPreview.tsx')
const thumb = join(root, 'packages/editor/src/ui/SpriteThumb.tsx')
const hash = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
const hashes = [hash(fire), hash(thumb)]
const logs = mkdtempSync(join(tmpdir(), 'editor-preview-cache-mutants-'))
const sharedIdentity = `new (class extends WeakMap {
  scope = {};
  get(_key) { WITNESS; return super.get(this.scope); }
  set(_key, value) { return super.set(this.scope, value); }
})()`
const cases = [
  { name: 'control' },
  {
    name: 'fire-shared-identity',
    file: fire,
    from: 'new WeakMap<AssetBase, Map<string, Promise<HTMLCanvasElement[] | null>>>()',
    to: sharedIdentity,
    redTest: 'fire same metadata in another reader must not hide that readers IO failure',
  },
  {
    name: 'thumb-shared-base',
    file: thumb,
    from: `new WeakMap<
  AssetBase,
  WeakMap<EditorAssetReader, Map<string, Promise<HTMLCanvasElement | null>>>
>()`,
    to: sharedIdentity,
    redTest: 'thumbnail isolates the base identity independently of identical metadata',
  },
  {
    name: 'thumb-shared-reader',
    file: thumb,
    from: 'readers = new WeakMap()',
    to: `readers = ${sharedIdentity}`,
    redTest: 'thumbnail isolates the reader identity independently of identical metadata',
  },
  {
    name: 'fire-retain-null',
    file: fire,
    from: 'if (frames === null && cache.get(key) === p) cache.delete(key)',
    to: 'if (frames === null && cache.get(key) === p) { WITNESS; }',
    redTest: 'FIRE transient failure is not a permanent cached null for the same revision',
  },
  {
    name: 'thumb-retain-null',
    file: thumb,
    from: 'if (baked === null && cache.get(cacheKey) === p) cache.delete(cacheKey)',
    to: 'if (baked === null && cache.get(cacheKey) === p) { WITNESS; }',
    redTest: 'thumbnail retries after failure even when its lower decoder was already warmed',
  },
  {
    name: 'fire-ignore-revision',
    file: fire,
    from: `return JSON.stringify([
      resolver.record(palMagicEffectSpriteAssetId(chunk), 'effect-sprite'),
      colorAsset,
      resolver.record(colorAsset, 'color-table'),
    ])`,
    to: "return (WITNESS, 'fixed')",
    redTest: 'FIRE same base and chunk invalidate on source SHA and on palette revision',
  },
  {
    name: 'thumb-ignore-revision',
    file: thumb,
    from: `return JSON.stringify([
      assetReader.record(asset, 'sprite'),
      colorAsset,
      resolver.record(colorAsset, 'color-table'),
    ])`,
    to: "return (WITNESS, 'fixed')",
    redTest:
      'thumbnail same reader and sprite SHA invalidate when the standard color table changes',
  },
]
const environmentalError =
  /TypeError|ReferenceError|SyntaxError|No test files found|Failed to load url|Cannot find module|Test timed out|Unhandled Errors/
const businessFailure = (text) => /AssertionError/.test(text) && !environmentalError.test(text)
assert.equal(businessFailure('AssertionError: expected blue pixels'), true)
assert.equal(businessFailure('AssertionError: expected blue; TypeError; Test timed out'), false)
const results = []
try {
  for (const item of cases) {
    if (item.from)
      assert.equal(readFileSync(item.file, 'utf8').split(item.from).length, 2, 'unique patch site')
    const marker = `PREVIEW_CACHE_MUTANT_EXECUTED:${item.name}`
    const replacement = item.to?.replace('WITNESS', `console.info(${JSON.stringify(marker)})`)
    const config = join(logs, `${item.name}.config.mjs`)
    const json = join(logs, `${item.name}.json`)
    writeFileSync(
      config,
      `import {readFileSync} from 'node:fs';
export default {
 root:${JSON.stringify(join(root, 'packages/editor'))},
 plugins:[{name:'preview-cache-single-point-mutant',enforce:'pre',load(id){
   if(id.split('?')[0]!==${JSON.stringify(item.file ?? '')})return;
   return ${item.from ? `readFileSync(${JSON.stringify(item.file)},'utf8').replace(${JSON.stringify(item.from)},${JSON.stringify(replacement)})` : 'undefined'};
 }}],
 test:{include:['src/ui/preview-cache-boundaries.test.tsx'],maxWorkers:1,fileParallelism:false}
};`,
    )
    const run = spawnSync(
      'pnpm',
      [
        '--filter',
        '@type-pal/editor',
        'exec',
        'vitest',
        'run',
        '--config',
        config,
        '--reporter=default',
        '--reporter=json',
        '--outputFile.json',
        json,
      ],
      { cwd: root, encoding: 'utf8', timeout: 60_000, maxBuffer: 16 * 1024 * 1024 },
    )
    const output = (run.stdout ?? '') + (run.stderr ?? '')
    const log = join(logs, `${item.name}.log`)
    writeFileSync(log, output)
    assert.equal(run.error, undefined, log)
    assert.equal(run.signal, null, log)
    assert.equal(run.status, item.from ? 1 : 0, log)
    const report = JSON.parse(readFileSync(json, 'utf8'))
    const assertions = report.testResults.flatMap((suite) => suite.assertionResults)
    assert.equal(assertions.length, 15, 'all regressions must execute')
    assert.doesNotMatch(output + JSON.stringify(report), environmentalError, log)
    if (item.from) {
      assert.ok(businessFailure(output + JSON.stringify(report)), log)
      assert.match(output, new RegExp(`stdout \\|[^\\n]*\\n${marker}(?:\\n|$)`), log)
      const failed = assertions.find((result) => result.title === item.redTest)
      assert.equal(failed?.status, 'failed', `named business regression: ${item.redTest}`)
      assert.match(failed.failureMessages.join('\n'), /AssertionError/)
    } else
      assert.ok(
        assertions.every((result) => result.status === 'passed'),
        log,
      )
    results.push({ name: item.name, exit: run.status, redTest: item.redTest, log, json })
    console.log(`${item.name}: exit ${run.status}, ${assertions.length} executed`)
  }
} finally {
  assert.deepEqual([hash(fire), hash(thumb)], hashes, 'product files changed during isolation')
}
console.log(JSON.stringify({ logs, hashes, results }, null, 2))
