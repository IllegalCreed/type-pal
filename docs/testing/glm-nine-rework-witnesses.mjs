// Codex independent residual review; node --import tsx docs/testing/glm-nine-rework-witnesses.mjs
// Does not modify candidate sources/tests. PNG validation is binary validation, not visual review.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { inflateSync } from 'node:zlib'

const pngRoot = '/Users/zhangxu/illegal/type-pal-glm-import-codec'
const sessionRoot = '/Users/zhangxu/illegal/type-pal-glm-script-helpers'
const ts = createRequire(join(pngRoot, 'package.json'))('typescript')
const output = realpathSync(mkdtempSync(join(tmpdir(), 'codex-nine-residual-')))
const pngTest = join(pngRoot, 'packages/editor/src/core/image-import.stages.test.ts')
const sessionTest = join(
  sessionRoot,
  'packages/editor/src/core/script-editor.hooks-session.test.ts',
)
const sourcePath = join(sessionRoot, 'packages/editor/src/core/script-editor.ts')
const hash = (p) => createHash('sha256').update(readFileSync(p)).digest('hex')
const hashes = new Map([pngTest, sessionTest, sourcePath].map((p) => [p, hash(p)]))

// Reuse each actual runtime block, not a second handwritten acceptance predicate.
const reviewRoot = '/Users/zhangxu/illegal/type-pal'
const batches = JSON.parse(
  readFileSync(join(reviewRoot, 'docs/testing/glm-nine-intake-evidence.json'), 'utf8'),
).decisions
const criterion = []
for (const batch of batches) {
  const tool = join(
    batch.worktree,
    batch.trackedChanges.find((f) => f.path.endsWith('-mutants.mjs')).path,
  )
  const ast = ts.createSourceFile(tool, readFileSync(tool, 'utf8'), ts.ScriptTarget.Latest, true)
  const blocks = new Map()
  function visit(node) {
    if (
      ts.isIfStatement(node) &&
      ['item.expected === 1', 'item.redTest !== undefined'].includes(node.expression.getText(ast))
    )
      blocks.set(node.expression.getText(ast), node.thenStatement.getText(ast))
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.equal(blocks.size, 2)
  const check = new Function(
    'assert',
    'item',
    'output',
    'assertions',
    'log',
    [...blocks.values()].join('\n'),
  )
  const entry = (title) => ({
    title,
    status: 'failed',
    failureMessages: ['AssertionError: expected 1 to equal 2'],
  })
  const accepts = (entries) => {
    try {
      check(
        assert,
        { name: 'review', expected: 1, redTest: 'target' },
        'MUTATION_HIT review\nAssertionError: expected 1 to equal 2',
        entries,
        'review-only',
      )
      return true
    } catch (error) {
      assert(error instanceof assert.AssertionError)
      return false
    }
  }
  assert.equal(accepts([entry('target')]), true)
  criterion.push({
    batch: batch.batch,
    suffixOnlyAccepted: accepts([entry('other target')]),
    duplicateTargetAccepted: accepts([entry('target'), entry('target')]),
  })
}
console.log(JSON.stringify({ criterion }))

function declarations(path, names) {
  const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true)
  const selected = source.statements.filter((n) =>
    ts.isFunctionDeclaration(n)
      ? names.includes(n.name?.text)
      : ts.isVariableStatement(n) &&
        n.declarationList.declarations.some(
          (d) => ts.isIdentifier(d.name) && names.includes(d.name.text),
        ),
  )
  assert.equal(selected.length, names.length)
  return ts
    .transpileModule(selected.map((n) => n.getText(source)).join('\n'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    })
    .outputText.replaceAll('export ', '')
}
function inspectPng(input) {
  const bytes = Buffer.from(input),
    chunks = [],
    errors = []
  let pos = 8
  const compressed = []
  while (pos < bytes.length) {
    if (pos + 12 > bytes.length) {
      errors.push('truncated chunk header')
      break
    }
    const length = bytes.readUInt32BE(pos),
      type = bytes.toString('ascii', pos + 4, pos + 8)
    if (pos + 12 + length > bytes.length) {
      errors.push(`chunk length ${length} exceeds file length ${bytes.length}`)
      break
    }
    let crc = 0xffffffff
    for (const byte of bytes.subarray(pos + 4, pos + 8 + length)) {
      crc ^= byte
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
    const expectedCrc = (crc ^ 0xffffffff) >>> 0,
      recordedCrc = bytes.readUInt32BE(pos + 8 + length)
    if (recordedCrc !== expectedCrc)
      errors.push(`${type}: CRC mismatch ${recordedCrc}/${expectedCrc}`)
    chunks.push({ type, length })
    if (type === 'IDAT') compressed.push(bytes.subarray(pos + 8, pos + 8 + length))
    pos += length + 12
  }
  if (chunks[0]?.type !== 'IHDR') errors.push('missing IHDR')
  if (chunks.at(-1)?.type !== 'IEND') errors.push('missing IEND')
  try {
    inflateSync(Buffer.concat(compressed))
  } catch (error) {
    errors.push(`IDAT: ${error.message}`)
  }
  return { bytes: bytes.length, chunks, errors, valid: errors.length === 0 }
}

const { minimalPng } = await import(
  pathToFileURL(join(pngRoot, 'packages/editor/src/core/__tests__/glm-import-codec-fixtures.ts'))
    .href
)
const payload = new Function(`${declarations(pngTest, ['pngPayload'])}; return pngPayload;`)()
const png = {
  source: inspectPng(minimalPng(4, 4)),
  main: inspectPng(payload(24)),
  preview: inspectPng(payload(32)),
}
const validPng = inspectPng(
  readFileSync(
    join(pngRoot, 'packages/reforge/src/engine-chrome/assets/ui/battle/icon-attack.png'),
  ),
)
assert.equal(
  validPng.valid,
  true,
  'PNG inspector positive control must accept an actual valid repository image',
)
console.log(JSON.stringify({ png }))

const original = readFileSync(sourcePath, 'utf8')
const needle =
  "    const next = direction === 'undo' ? command.invert(before) : command.apply(before)"
assert.equal(original.split(needle).length - 1, 1)
const probes = [
  {
    id: 'rejected-session-state-alias',
    effect: 'before.scenes[0]!.entry.pos.col += 1',
    setup: '',
    expectation: 'expect(session.getState()).toEqual(before)',
  },
  {
    id: 'rejected-session-clears-redo',
    effect: 'this.future = []',
    setup:
      "session.dispatch(new SaveSceneHookDetailsCommand('s1','onEnter','hook-b','B changed',false)); session.undo(); expect(session.canRedo()).toBe(true);",
    expectation: 'expect(session.canRedo()).toBe(true)',
  },
]
const results = []
for (const probe of probes) {
  const oracle = join(output, `${probe.id}.test.ts`)
  writeFileSync(
    oracle,
    `import {test,expect} from ${JSON.stringify(join(sessionRoot, 'node_modules/vitest/dist/index.js'))};
import {ScriptEditSession,SaveSceneHookDetailsCommand} from ${JSON.stringify(sourcePath)};
${declarations(sessionTest, ['emptyFlow', 'sessionState'])}
test('oracle ${probe.id}',()=>{
 const session=new ScriptEditSession(sessionState());
 session.dispatch(new SaveSceneHookDetailsCommand('s1','onEnter','hook-a','changed',false));
 ${probe.setup}
 const before=structuredClone(session.getState());
 expect(()=>session.dispatch(new SaveSceneHookDetailsCommand('s1','onEnter','ghost','bad',false))).toThrow('hook 不存在');
 ${probe.expectation}
});`,
  )
  for (const mutated of [false, true]) {
    const config = join(output, `${probe.id}-${mutated}.config.mjs`),
      report = join(output, `${probe.id}-${mutated}.json`)
    const replacement = `    const next = (() => { try { return direction === 'undo' ? command.invert(before) : command.apply(before) } catch (error) { ${probe.effect}; throw error } })()`
    writeFileSync(
      config,
      `import {defineConfig} from ${JSON.stringify(join(sessionRoot, 'node_modules/vitest/dist/config.js'))};
export default defineConfig({root:${JSON.stringify(join(sessionRoot, 'packages/editor'))}, plugins:[{name:'single-point-review',enforce:'pre', transform(code,id){if(${mutated}&&id.split('?')[0]===${JSON.stringify(sourcePath)})return code.replace(${JSON.stringify(needle)},${JSON.stringify(replacement)})}}],test:{include:[${JSON.stringify(sessionTest)},${JSON.stringify(oracle)}],maxWorkers:1}});`,
    )
    const run = spawnSync(
      'pnpm',
      ['exec', 'vitest', 'run', '--config', config, '--reporter=json', '--outputFile', report],
      { cwd: sessionRoot, encoding: 'utf8' },
    )
    writeFileSync(join(output, `${probe.id}-${mutated}.log`), run.stdout + run.stderr)
    const data = JSON.parse(readFileSync(report, 'utf8'))
    const candidate = data.testResults.find((f) => f.name === sessionTest),
      check = data.testResults.find((f) => f.name === oracle)
    assert(candidate && check)
    const candidateFailures = candidate.assertionResults.filter((t) => t.status === 'failed')
    if (!mutated) assert.equal(run.status, 0)
    else {
      assert.equal(run.status, 1)
      assert.equal(check.assertionResults[0].status, 'failed')
      assert.match(check.assertionResults[0].failureMessages[0], /^AssertionError:/)
    }
    results.push({
      id: probe.id,
      mutated,
      exit: run.status,
      candidateTests: candidate.assertionResults.length,
      candidateFailures: candidateFailures.map((t) => t.title),
      verdict: mutated ? (candidateFailures.length ? 'detected' : 'MISSED') : 'control',
      report,
    })
  }
}
const mapRoot = '/Users/zhangxu/illegal/type-pal-glm-editor-map-data'
const mapSource = join(mapRoot, 'packages/editor/src/core/map-transform.ts')
const mapTest = join(mapRoot, 'packages/editor/src/core/map-transform.boundaries.test.ts')
hashes.set(mapSource, hash(mapSource))
hashes.set(mapTest, hash(mapTest))
const mapText = readFileSync(mapSource, 'utf8'),
  mapStart = mapText.indexOf('export function planMapPaste(')
const mapAnchor = "  const conflictPolicy = options.conflictPolicy ?? 'reject'"
const mapHead = mapText.slice(mapStart, mapText.indexOf(mapAnchor, mapStart))
assert.equal(mapText.split(mapHead).length - 1, 1)
const mapOracle = join(output, 'map-metadata.test.ts')
writeFileSync(
  mapOracle,
  `import {test,expect} from ${JSON.stringify(join(mapRoot, 'node_modules/vitest/dist/index.js'))};
import {buildBlankProjectMap,paintProjectMapCollision,paintProjectMapTiles} from ${JSON.stringify(join(mapRoot, 'packages/reforge/src/index.ts'))};
import {captureMapClipboard,planMapPaste} from ${JSON.stringify(mapSource)};
${declarations(mapTest, ['TILESET', 'point', 'painted', 'clipboardOf'])}
test('oracle paste preserves complete map',()=>{
 const map=painted(), clipboard=clipboardOf(map), before=structuredClone(map);
 planMapPaste(map,clipboard,point(2,2),{conflictPolicy:'reject',collisionAuthorityLayerId:'floor'});
 expect(map).toEqual(before);
});`,
)
for (const mutated of [false, true]) {
  const config = join(output, `map-metadata-${mutated}.config.mjs`),
    report = join(output, `map-metadata-${mutated}.json`)
  writeFileSync(
    config,
    `import {defineConfig} from ${JSON.stringify(join(mapRoot, 'node_modules/vitest/dist/config.js'))};
export default defineConfig({root:${JSON.stringify(join(mapRoot, 'packages/editor'))},plugins:[{name:'map-input-mutation',enforce:'pre',transform(code,id){if(${mutated}&&id.split('?')[0]===${JSON.stringify(mapSource)})return code.replace(${JSON.stringify(mapHead)},${JSON.stringify(`${mapHead}  map.layers[0]!.name = 'corrupted by paste'\n`)})}}],test:{include:[${JSON.stringify(mapTest)},${JSON.stringify(mapOracle)}],maxWorkers:1}});`,
  )
  const run = spawnSync(
    'pnpm',
    ['exec', 'vitest', 'run', '--config', config, '--reporter=json', '--outputFile', report],
    { cwd: mapRoot, encoding: 'utf8' },
  )
  writeFileSync(join(output, `map-metadata-${mutated}.log`), run.stdout + run.stderr)
  const json = JSON.parse(readFileSync(report, 'utf8'))
  const candidate = json.testResults.find((f) => f.name === mapTest),
    oracle = json.testResults.find((f) => f.name === mapOracle)
  assert(candidate && oracle)
  if (mutated) {
    assert.equal(run.status, 1)
    assert.match(oracle.assertionResults[0].failureMessages[0], /^AssertionError:/)
  } else assert.equal(run.status, 0)
  const failed = candidate.assertionResults.filter((t) => t.status === 'failed').map((t) => t.title)
  results.push({
    id: 'paste-mutates-layer-metadata',
    mutated,
    exit: run.status,
    candidateTests: candidate.assertionResults.length,
    candidateFailures: failed,
    verdict: mutated ? (failed.length ? 'detected' : 'MISSED') : 'control',
    report,
  })
}
for (const [path, value] of hashes) assert.equal(hash(path), value, `candidate modified: ${path}`)
writeFileSync(
  join(output, 'summary.json'),
  JSON.stringify({ criterion, validPng, png, results }, null, 2),
)
console.log(JSON.stringify({ output, results }))
