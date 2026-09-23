/** Read-only STAT-1 diagnosis. Experimental merge runs in memory, never patches dependencies. */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '../..'))
const output = mkdtempSync(join(tmpdir(), 'type-pal-initializer-probe-'))
const providerPath = realpathSync(
  resolve(root, 'node_modules/@vitest/coverage-v8/dist/provider.js'),
)
const require = createRequire(providerPath)
const mergePath = require.resolve('@bcoe/v8-coverage').replace(/index\.js$/, 'merge.js')
const mergeSource = readFileSync(mergePath, 'utf8')
// biome-ignore lint/suspicious/noTemplateCurlyInString: exact dependency source, not interpolation
const needle = 'return `${rootRange.startOffset.toString(10)};${rootRange.endOffset.toString(10)}`;'
assert.equal(
  mergeSource.split(needle).length,
  2,
  'frozen merge implementation changed; review anew',
)
const baselinePath = resolve(root, 'scripts/coverage/baseline.fast.json')
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
const protectedFiles = [
  mergePath,
  providerPath,
  baselinePath,
  ...Object.values(baseline.packages).flatMap((pkg) =>
    pkg.sourceFiles.map((f) => resolve(root, f)),
  ),
]
const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
const hashes = protectedFiles.map((file) => [file, sha(file)])
const { mergeProcessCovs } = require('@bcoe/v8-coverage')
const { V8CoverageProvider } = await import(pathToFileURL(providerPath).href)
const provider = new V8CoverageProvider()
provider.options = {}

// A counterfactual only: same merger source, one identity-key change, no disk dependency edits.
const experimentalSource = mergeSource.replace(
  needle,
  // biome-ignore lint/suspicious/noTemplateCurlyInString: experimental dependency source literal
  'return `${funcCov.functionName === "<static_initializer>" ? "static;" : funcCov.functionName === "<instance_members_initializer>" ? "instance;" : ""}${rootRange.startOffset.toString(10)};${rootRange.endOffset.toString(10)}`;',
)
const experimentalModule = { exports: {} }
new Function('require', 'module', 'exports', experimentalSource)(
  createRequire(mergePath),
  experimentalModule,
  experimentalModule.exports,
)
const experimentalMerge = experimentalModule.exports.mergeProcessCovs
const capture = join(output, 'capture.mjs')
writeFileSync(
  capture,
  `import assert from 'node:assert/strict';
import {Session} from 'node:inspector/promises';
import {writeFileSync,realpathSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const [file,output,mode]=process.argv.slice(2);
globalThis.__stat1Calls=0;
const session=new Session();session.connect();
await session.post('Profiler.enable');
await session.post('Profiler.startPreciseCoverage',{callCount:true,detailed:true});
const url=pathToFileURL(realpathSync(file)).href;
const {Example}=await import(url);
if(mode==='construct')new Example();
if(mode==='valid')assert.equal(new Example().run(1),'accepted');
if(mode==='reject')assert.throws(()=>new Example().run(2),/version rejected/);
const {result}=await session.post('Profiler.takePreciseCoverage');
const coverage=result.find(x=>x.url===url);assert(coverage,'target was not collected');
writeFileSync(output,JSON.stringify({calls:globalThis.__stat1Calls,coverage}));
session.disconnect();
`,
)

const rows = []
for (const kind of ['both', 'static', 'instance']) {
  const source = `export class Example {
${kind !== 'instance' ? '  static ceiling = 128' : ''}
${kind !== 'static' ? '  running = false' : ''}
  run(value) {
    globalThis.__stat1Calls++
    if (value !== 1) throw new Error('version rejected')
    return 'accepted'
  }
}
`
  const file = join(output, `${kind}.mjs`)
  writeFileSync(file, source)
  for (const mode of ['import', 'construct', 'valid', 'reject']) {
    const raw = []
    for (let n = 0; n < 2; n++) {
      const dest = join(output, `${kind}-${mode}-${n}.json`)
      const run = spawnSync(process.execPath, [capture, file, dest, mode], { encoding: 'utf8' })
      assert.equal(run.status, 0, run.stderr)
      raw.push(JSON.parse(readFileSync(dest, 'utf8')))
    }
    const entries = raw.map((r) => r.coverage)
    const totalCalls = raw.reduce((n, r) => n + r.calls, 0)
    const merge = (fn) => fn(entries.map((e) => ({ result: [structuredClone(e)] }))).result[0]
    const stock = merge(mergeProcessCovs)
    const experimental = merge(experimentalMerge)
    const reported = []
    for (const entry of [...entries, stock, experimental]) {
      const mapped = Object.values(
        await provider.remapCoverage(entry.url, 0, { code: source }, entry.functions),
      )[0]
      const fn = Object.keys(mapped.fnMap).find((k) => mapped.fnMap[k].name === 'run')
      assert(fn !== undefined, 'run function was omitted by remapper')
      reported.push(mapped.f[fn])
    }
    assert.deepEqual(
      reported.slice(0, 2),
      raw.map((r) => r.calls),
    )
    assert.equal(reported[3], totalCalls, 'experimental merge lost real method calls')
    const isCounterexample = kind === 'both' && mode === 'import'
    assert.equal(reported[2], isCounterexample ? 2 : totalCalls)
    const initializers = entries[0].functions.filter((f) => /initializer/.test(f.functionName))
    if (isCounterexample) {
      assert.equal(initializers.length, 2)
      assert.deepEqual(
        initializers.map((f) => f.ranges[0].count),
        [1, 0],
      )
      assert.equal(initializers[0].ranges[0].startOffset, initializers[1].ranges[0].startOffset)
      assert.equal(initializers[0].ranges[0].endOffset, initializers[1].ranges[0].endOffset)
      assert.equal(stock.functions.filter((f) => /initializer/.test(f.functionName)).length, 1)
      assert.equal(
        experimental.functions.filter((f) => /initializer/.test(f.functionName)).length,
        2,
      )
    }
    rows.push({ kind, mode, actualCalls: raw.map((r) => r.calls), reported, initializers })
    console.log(
      `${kind}/${mode}: calls=${raw.map((r) => r.calls)}; raw/raw/merged/experiment=${reported}`,
    )
  }
}

// Conservative source-shape census; this is not proof of all possible coverage defects.
const ts = createRequire(resolve(root, 'package.json'))('typescript')
const shapeCandidates = []
for (const [pkg, data] of Object.entries(baseline.packages)) {
  for (const file of data.sourceFiles) {
    const source = ts.createSourceFile(
      file,
      readFileSync(resolve(root, file), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    )
    const isStatic = (n) => n.modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword)
    const erased = (n) =>
      n.modifiers?.some((m) =>
        [ts.SyntaxKind.DeclareKeyword, ts.SyntaxKind.AbstractKeyword].includes(m.kind),
      )
    const visit = (node) => {
      if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
        const props = node.members.filter(ts.isPropertyDeclaration).filter((p) => !erased(p))
        if (
          (props.some(isStatic) || node.members.some(ts.isClassStaticBlockDeclaration)) &&
          props.some((p) => !isStatic(p))
        ) {
          shapeCandidates.push({
            pkg,
            file,
            name: node.name?.text ?? '<anonymous>',
            line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
          })
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
}
for (const [file, hash] of hashes) assert.equal(sha(file), hash, `protected input changed: ${file}`)
writeFileSync(
  join(output, 'summary.json'),
  `${JSON.stringify({ node: process.version, baselineTestCount: baseline.testCount, protectedFileCount: hashes.length, hashes, rows, shapeCandidates, meaning: 'read-only diagnosis, not production patch acceptance' }, null, 2)}\n`,
)
console.log(`Evidence: ${output}/summary.json`)
