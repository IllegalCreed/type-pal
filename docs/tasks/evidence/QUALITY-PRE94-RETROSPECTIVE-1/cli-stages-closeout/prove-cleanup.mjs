import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const ts = createRequire(path.join(process.cwd(), 'package.json'))('typescript'),
  base = '653e3656d4968eb80dd99a76e2b2d74500db70b6',
  cliPath = 'packages/pal-extract/src/cli.ts'
const target = process.argv[2],
  read = (p, old = false) =>
    old || target
      ? execFileSync('git', ['show', `${old ? base : target}:${p}`], { encoding: 'utf8' })
      : fs.readFileSync(p, 'utf8')
function tokens(text) {
  const js = ts.transpileModule(text, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        removeComments: true,
      },
    }).outputText,
    scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, js),
    out = []
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan())
    out.push([token, scanner.getTokenText()])
  return out
}
const old = read(cliPath, true),
  sf = ts.createSourceFile('cli.ts', old, ts.ScriptTarget.Latest, true),
  fn = sf.statements.find((n) => ts.isFunctionDeclaration(n) && n.name.text === 'loadMkfChunk')
assert(fn)
assert.deepEqual(
  tokens(fn.getText(sf)),
  tokens(
    `function loadMkfChunk(file:string,chunkIndex:number,decompress=false):Uint8Array {const mkf=openMkf(loadFile(file));const chunk=readChunk(mkf,chunkIndex);return decompress?decompressYj2(chunk):chunk}`,
  ),
)
const calls = []
function visit(n) {
  if (ts.isCallExpression(n) && n.expression.getText(sf) === 'loadMkfChunk') calls.push(n)
  ts.forEachChild(n, visit)
}
visit(sf)
assert.equal(calls.length, 1)
assert.equal(calls[0].getText(sf), "loadMkfChunk('SSS.MKF', 2)")
let expanded = old
for (const e of [
  { start: fn.getStart(sf), end: fn.end, text: '' },
  {
    start: calls[0].getStart(sf),
    end: calls[0].end,
    text: "readChunk(openMkf(loadFile('SSS.MKF')), 2)",
  },
].sort((a, b) => b.start - a.start))
  expanded = expanded.slice(0, e.start) + e.text + expanded.slice(e.end)
expanded = expanded.replace("import { decompressYj2 } from './io/yj2.js'\n", '')
assert.deepEqual(
  tokens(expanded),
  tokens(read(cliPath)),
  'only private false-by-default sole call inlined',
)
const dataPath = 'packages/pal-extract/src/resources/data-assets.ts'
assert.deepEqual(tokens(read(dataPath, true)), tokens(read(dataPath)), 'DATA comments only')
console.log(
  JSON.stringify({
    state: 'MATCH',
    base,
    deadPrivateCallCount: 1,
    decompressArgumentOmitted: true,
    dataRuntimeUnchanged: true,
    scope:
      'CLI private wrapper substitution and DATA comments only; sprite container equivalence is separate source reasoning + raw output comparison + native CLI regression',
  }),
)
