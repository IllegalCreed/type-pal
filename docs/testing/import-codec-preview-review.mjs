// Independent actual-returned-PNG oracle. Does not edit candidate or product files.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(process.argv[2] ?? '/Users/zhangxu/illegal/type-pal-glm-import-codec')
const ts = createRequire(join(root, 'package.json'))('typescript')
const testFile = join(root, 'packages/editor/src/core/image-import.stages.test.ts')
const product = join(root, 'packages/editor/src/core/image-import.ts')
const fixture = join(root, 'packages/editor/src/core/__tests__/glm-import-codec-fixtures.ts')
const hash = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
const hashes = new Map([testFile, product, fixture].map((p) => [p, hash(p)]))
const out = mkdtempSync(join(tmpdir(), 'codex-preview-return-'))
const ast = ts.createSourceFile(
  testFile,
  readFileSync(testFile, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
)
const helpers = ['pngPayload', 'installCanvasHost', 'palette']
  .map((name) => {
    const nodes = ast.statements.filter((n) =>
      ts.isFunctionDeclaration(n)
        ? n.name?.text === name
        : ts.isVariableStatement(n) &&
          n.declarationList.declarations.some((d) => d.name.getText(ast) === name),
    )
    assert.equal(nodes.length, 1, name)
    return nodes[0].getText(ast)
  })
  .join('\n')

// Independent decoder for the candidate's declared RGBA8/filter-0 PNG fixture profile.
// CRC and inflate are checked before trusting dimensions/pixels. Not a general image decoder.
function inspectPng(input) {
  const bytes = Buffer.from(input)
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
  const chunks = []
  let offset = 8
  while (offset < bytes.length) {
    assert(offset + 12 <= bytes.length)
    const length = bytes.readUInt32BE(offset)
    assert(offset + length + 12 <= bytes.length)
    const type = bytes.toString('ascii', offset + 4, offset + 8)
    let crc = 0xffffffff
    for (const byte of bytes.subarray(offset + 4, offset + 8 + length)) {
      crc ^= byte
      for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
    assert.equal((crc ^ 0xffffffff) >>> 0, bytes.readUInt32BE(offset + 8 + length))
    chunks.push({ type, data: bytes.subarray(offset + 8, offset + 8 + length) })
    offset += length + 12
  }
  assert.deepEqual(
    chunks.map((c) => c.type),
    ['IHDR', 'IDAT', 'IEND'],
  )
  const header = chunks[0].data
  assert.equal(header.length, 13)
  const width = header.readUInt32BE(0),
    height = header.readUInt32BE(4)
  assert(width > 0 && height > 0)
  assert.deepEqual([...header.subarray(8)], [8, 6, 0, 0, 0])
  const raw = inflateSync(chunks[1].data)
  const stride = width * 4
  assert.equal(raw.length, height * (1 + stride))
  const pixels = Buffer.alloc(height * stride)
  for (let y = 0; y < height; y++) {
    const at = y * (stride + 1)
    assert.equal(raw[at], 0)
    raw.copy(pixels, y * stride, at + 1, at + 1 + stride)
  }
  return { width, height, pixels }
}

const oracle = join(out, 'actual-preview.test.ts')
writeFileSync(
  oracle,
  [
    'import {test,expect,vi,afterEach} from ' +
      JSON.stringify(join(root, 'node_modules/vitest/dist/index.js')) +
      ';',
    "import assert from 'node:assert/strict'; import {inflateSync} from 'node:zlib'; import {createHash} from 'node:crypto'; import {writeFileSync} from 'node:fs';",
    `import {prepareAuthoredImage} from ${JSON.stringify(product)};`,
    `import {pngFile} from ${JSON.stringify(fixture)};`,
    helpers,
    inspectPng.toString(),
    'afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals()});',
    "test('returned preview PNG matches the actual preview pixels',async()=>{",
    ' const host=installCanvasHost({width:320,height:200});',
    " const result=await prepareAuthoredImage(pngFile('bg.png',320,200),'battle-background',palette());",
    ' const source=inspectPng(result.sourceBytes), main=inspectPng(result.bytes), preview=inspectPng(result.effectPreviewBytes);',
    " const digest=(bytes)=>createHash('sha256').update(Buffer.from(bytes)).digest('hex');",
    ' const info={source:[source.width,source.height],main:[main.width,main.height],preview:[preview.width,preview.height],mainSha:digest(result.bytes),previewSha:digest(result.effectPreviewBytes),mainPixel:[...main.pixels.subarray(0,4)],previewPixel:[...preview.pixels.subarray(0,4)],mainMatches:Buffer.compare(main.pixels,Buffer.from(host.deliveredPixels[0]))===0,previewMatches:Buffer.compare(preview.pixels,Buffer.from(host.deliveredPixels[1]))===0};',
    ' writeFileSync(' +
      JSON.stringify(join(out, 'actual-')) +
      "+process.env.TB03_PREVIEW_PHASE+'.json',JSON.stringify(info,null,2));",
    ' expect([source.width,source.height,main.width,main.height,preview.width,preview.height]).toEqual([320,200,320,200,320,200]);',
    ' expect(host.deliveredPixels).toHaveLength(2);',
    ' expect(info.mainMatches).toBe(true); expect(info.previewMatches).toBe(true);',
    ' expect(info.mainSha).toBe(result.hash); expect(info.mainSha).toBe(result.record.sha256); expect(info.previewSha).not.toBe(info.mainSha);',
    '});',
  ].join('\n'),
)

const needle = '    effectPreviewBytes = await canvasPng(canvas)'
const replacement = '    effectPreviewBytes = (await canvasPng(canvas), bytes.slice(0))'
assert.equal(readFileSync(product, 'utf8').split(needle).length, 2)
const results = []
for (const mutated of [false, true]) {
  const config = join(out, `${String(mutated)}.config.mjs`)
  const report = join(out, `${String(mutated)}.json`)
  writeFileSync(
    config,
    [
      "import {readFileSync} from 'node:fs';",
      'export default {root:' +
        JSON.stringify(join(root, 'packages/editor')) +
        ",plugins:[{name:'replace-returned-preview-only',enforce:'pre',load(id){if(" +
        mutated +
        "&&id.split('?')[0]===" +
        JSON.stringify(product) +
        ")return readFileSync(id,'utf8').replace(" +
        JSON.stringify(needle) +
        ',' +
        JSON.stringify(replacement) +
        ');}}],test:{include:' +
        JSON.stringify([testFile, oracle]) +
        ',maxWorkers:1}};',
    ].join('\n'),
  )
  const run = spawnSync(
    'pnpm',
    ['exec', 'vitest', 'run', '--config', config, '--reporter=json', '--outputFile', report],
    {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, TB03_PREVIEW_PHASE: mutated ? 'mutant' : 'control' },
    },
  )
  writeFileSync(join(out, `${String(mutated)}.log`), run.stdout + run.stderr)
  const data = JSON.parse(readFileSync(report, 'utf8'))
  const candidate = data.testResults.find((r) => r.name === testFile)
  const own = data.testResults.find((r) => r.name === oracle)
  assert(candidate && own)
  const failed = candidate.assertionResults.filter((r) => r.status === 'failed')
  const business = failed.every(
    (r) =>
      r.failureMessages.length > 0 &&
      r.failureMessages.every((m) => /^AssertionError(?:\b|:)|^expect\(/.test(m.split('\n', 1)[0])),
  )
  if (!mutated) assert.equal(run.status, 0)
  else {
    assert.equal(run.status, 1)
    assert(
      own.assertionResults.some(
        (r) => r.status === 'failed' && r.failureMessages.some((m) => /^AssertionError/.test(m)),
      ),
    )
  }
  results.push({
    mutated,
    exit: run.status,
    candidateTests: candidate.assertionResults.length,
    candidateFailures: failed.map((r) => r.title),
    verdict: mutated ? (failed.length ? (business ? 'detected' : 'invalid') : 'MISSED') : 'control',
    report,
  })
}
for (const [p, h] of hashes) assert.equal(hash(p), h)
const control = JSON.parse(readFileSync(join(out, 'actual-control.json'), 'utf8'))
const mutant = JSON.parse(readFileSync(join(out, 'actual-mutant.json'), 'utf8'))
const summary = { root, out, needle, replacement, control, mutant, results }
writeFileSync(join(out, 'summary.json'), JSON.stringify(summary, null, 2))
console.log(JSON.stringify(summary, null, 2))
