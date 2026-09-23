/** Frozen old-fast raw capture and offline counterfactual. No product/dependency/baseline writes. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const installed = args.length === 1 && args[0] === '--installed'
assert(
  args.length === 0 || installed || (args.length === 2 && args[0] === '--replay'),
  'usage: node coverage-initializer-capture.mjs [--installed | --replay <raw-directory>]',
)
const root = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '../..'))
const output =
  args[0] === '--replay'
    ? realpathSync(args[1])
    : mkdtempSync(join(tmpdir(), 'type-pal-initializer-capture-'))
assert(!output.startsWith(`${root}/`), 'outputs must be outside repository')
const baselinePath = resolve(root, 'scripts/coverage/baseline.fast.json')
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
assert.equal(baseline.testCount, 7790, 'frozen scope changed; review diagnostic before reuse')
const providerPath = realpathSync(
  resolve(root, 'node_modules/@vitest/coverage-v8/dist/provider.js'),
)
const require = createRequire(providerPath)
const lib = require('istanbul-lib-coverage')
const { V8CoverageProvider } = await import(pathToFileURL(providerPath).href)
const mergePath = require.resolve('@bcoe/v8-coverage').replace(/index\.js$/, 'merge.js')
const originalMerge = readFileSync(mergePath, 'utf8')
const protectedFiles = [
  baselinePath,
  providerPath,
  mergePath,
  ...Object.values(baseline.packages).flatMap((p) => p.sourceFiles.map((f) => resolve(root, f))),
]
const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
const hashes = protectedFiles.map((file) => [file, sha(file)])

if (args.length === 0 || installed) {
  const modulePath = join(output, 'provider.mjs')
  writeFileSync(
    modulePath,
    `import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import base from ${JSON.stringify(pathToFileURL(resolve(dirname(providerPath), 'index.js')).href)};
import {V8CoverageProvider} from ${JSON.stringify(pathToFileURL(providerPath).href)};
const out=${JSON.stringify(output)};let seq=0;const urls=new Set();
class Capture extends V8CoverageProvider {
 onAfterSuiteRun(meta){
  const entries=meta.coverage?.result?.filter(x=>x.url.includes('/packages/reforge/src/'))??[];
  for(const entry of entries)if(entry.functions.some(a=>a.functionName==='<static_initializer>'&&entry.functions.some(b=>b.functionName==='<instance_members_initializer>'&&a.ranges[0].startOffset===b.ranges[0].startOffset&&a.ranges[0].endOffset===b.ranges[0].endOffset)))urls.add(entry.url);
  if(entries.length)writeFileSync(out+'/raw-'+seq+++'.json',JSON.stringify({testFiles:meta.testFiles,environment:meta.environment,entries}));
  return super.onAfterSuiteRun(meta);
 }
 async convertCoverage(data,project,environment){this.env=environment;return super.convertCoverage(data,project,environment)}
 async remapCoverage(url,offset,source,functions){
  if(urls.has(url))writeFileSync(out+'/remap-'+createHash('sha256').update(url).digest('hex').slice(0,16)+'-'+this.env+'.json',JSON.stringify({url,offset,source,functions,environment:this.env}));
  return super.remapCoverage(url,offset,source,functions);
 }
}
export default {...base,getProvider:()=>new Capture()};
`,
  )
  const { coveragePackages, coverageExcludes } = await import(
    pathToFileURL(resolve(root, 'scripts/coverage/config.mjs')).href
  )
  const pkg = coveragePackages.find((p) => p.id === 'reforge')
  const config = {
    root: resolve(root, pkg.directory),
    test: {
      include: baseline.packages.reforge.fastTests.files.map((f) =>
        f.replace('packages/reforge/', ''),
      ),
      maxWorkers: 2,
      reporters: ['json'],
      outputFile: join(output, 'tests.json'),
      env: { TYPE_PAL_COVERAGE: '1', TYPE_PAL_COVERAGE_PROFILE: 'fast' },
      coverage: {
        enabled: true,
        provider: 'custom',
        customProviderModule: modulePath,
        include: pkg.include,
        exclude: coverageExcludes,
        reporter: ['json', 'json-summary'],
        reportsDirectory: join(output, 'report'),
      },
    },
  }
  const configPath = join(output, 'config.mjs')
  writeFileSync(configPath, `export default ${JSON.stringify(config)};\n`)
  const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', configPath], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  })
  writeFileSync(join(output, 'vitest.log'), `${run.stdout ?? ''}\n${run.stderr ?? ''}`)
  assert.equal(run.status, 0, `capture suite failed; ${output}/vitest.log`)
}
const tests = JSON.parse(readFileSync(join(output, 'tests.json'), 'utf8'))
assert.equal(tests.numPassedTests, baseline.packages.reforge.fastTests.testCount)
assert.equal(tests.numFailedTests, 0)
assert.equal(tests.numPendingTests, 0)
const raw = readdirSync(output)
  .filter((f) => f.startsWith('raw-'))
  .map((f) => JSON.parse(readFileSync(join(output, f), 'utf8')))
const original = lib.createCoverageMap(
  JSON.parse(readFileSync(join(output, 'report/coverage-final.json'), 'utf8')),
)
const before = original.getCoverageSummary().toJSON()
for (const metric of ['lines', 'statements', 'functions', 'branches']) {
  assert.equal(before[metric].total, baseline.packages.reforge.metrics[metric].total)
  if (!installed)
    assert.equal(before[metric].covered, baseline.packages.reforge.metrics[metric].covered)
}
if (installed) {
  const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
  const patchPath = manifest.pnpm.patchedDependencies['@bcoe/v8-coverage@1.0.2']
  const patchHash = sha(resolve(root, patchPath))
  assert(mergePath.includes(`patch_hash=${patchHash}`), 'must execute the actually installed patch')
  for (const [file, hash] of hashes) assert.equal(sha(file), hash)
  const result = {
    mode: 'installed-patch-old-fast',
    tests: tests.numPassedTests,
    patchHash,
    hashes,
    metrics: before,
  }
  writeFileSync(join(output, 'installed-summary.json'), `${JSON.stringify(result, null, 2)}\n`)
  console.log(JSON.stringify({ tests: result.tests, patchHash, metrics: before }, null, 2))
  console.log(`Evidence: ${output}/installed-summary.json`)
  process.exit(0)
}
// In-memory one-key experiment; installed merger remains untouched.
// biome-ignore lint/suspicious/noTemplateCurlyInString: exact dependency source
const needle = 'return `${rootRange.startOffset.toString(10)};${rootRange.endOffset.toString(10)}`;'
assert.equal(originalMerge.split(needle).length, 2)
const module = { exports: {} }
new Function(
  'require',
  'module',
  'exports',
  originalMerge.replace(
    needle,
    // biome-ignore lint/suspicious/noTemplateCurlyInString: experimental source code, not interpolation
    'return `${funcCov.functionName === "<static_initializer>" ? "static;" : funcCov.functionName === "<instance_members_initializer>" ? "instance;" : ""}${rootRange.startOffset.toString(10)};${rootRange.endOffset.toString(10)}`;',
  ),
)(createRequire(mergePath), module, module.exports)
const fixes = lib.createCoverageMap({})
const provider = new V8CoverageProvider()
provider.options = {}
for (const name of readdirSync(output).filter((f) => f.startsWith('remap-'))) {
  const input = JSON.parse(readFileSync(join(output, name), 'utf8'))
  const group = raw
    .filter((r) => r.environment === input.environment)
    .map((r) => ({ result: structuredClone(r.entries.filter((e) => e.url === input.url)) }))
    .filter((r) => r.result.length)
  const merged = module.exports.mergeProcessCovs(group).result[0]
  fixes.merge(
    await provider.remapCoverage(
      input.url,
      input.offset,
      structuredClone(input.source),
      merged.functions,
    ),
  )
}
assert(fixes.files().length > 0, 'no collision was captured')
// Build a replacement map. addFileCoverage on an existing filename MERGES, not replaces.
const corrected = lib.createCoverageMap(
  Object.fromEntries(
    Object.entries(
      JSON.parse(readFileSync(join(output, 'report/coverage-final.json'), 'utf8')),
    ).filter(([file]) => !fixes.files().includes(file)),
  ),
)
const rows = []
for (const file of fixes.files()) {
  const old = original.fileCoverageFor(file)
  const fixed = fixes.fileCoverageFor(file)
  const oldLines = old.getLineCoverage()
  const newLines = fixed.getLineCoverage()
  rows.push({
    file,
    before: old.toSummary().toJSON(),
    after: fixed.toSummary().toJSON(),
    lostLines: Object.keys(oldLines)
      .filter((k) => oldLines[k] > 0 && !newLines[k])
      .map(Number),
  })
  corrected.addFileCoverage(fixed)
}
assert.deepEqual(corrected.files().sort(), original.files().sort())
const after = corrected.getCoverageSummary().toJSON()
for (const metric of ['lines', 'statements', 'functions', 'branches'])
  assert.equal(before[metric].total, after[metric].total)
for (const [file, hash] of hashes) assert.equal(sha(file), hash, `protected file changed: ${file}`)
const result = {
  node: process.version,
  tests: tests.numPassedTests,
  hashes,
  rows,
  before,
  after,
  meaning: 'offline counterfactual, NOT an official baseline or adopted patch',
}
writeFileSync(join(output, 'replay-summary.json'), `${JSON.stringify(result, null, 2)}\n`)
console.log(JSON.stringify({ tests: result.tests, rows, before, after }, null, 2))
console.log(`Evidence: ${output}/replay-summary.json`)
