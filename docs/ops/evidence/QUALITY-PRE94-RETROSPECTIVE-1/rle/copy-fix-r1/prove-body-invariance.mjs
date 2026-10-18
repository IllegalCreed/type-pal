// copy-fix-r1 body-invariance proof: TypeScript parse + print(removeComments).
// Method: for each whitelisted file, take base (git show d3f59cadd) and current
// worktree source. For test files, splice a fixed placeholder over the first-arg
// string literals of it/test/describe calls (titles, whose correction is explicitly
// allowed) in BOTH versions. Parse each masked source with the TypeScript parser and
// print with a removeComments printer; byte-compare the printed outputs.
// A rejected earlier variant (raw scanner token stream) mis-lexed `${}` template
// literals when comments contained backticks — the parser-based method is correct.
// Limitation: printed-output equality pins the AST modulo comments/titles; combined
// with the 51-identity fullName mapping it pins per-case bodies.
//
// Read-only by default (rework C2): prints the report JSON to stdout and exits
// 0 (all equal) / 1 (divergence) without writing anywhere in the worktree. The
// frozen body-invariance.json from the r1 batch is never overwritten. Report
// regeneration is opt-in via `--out <new-path>` and must target a NEW file.
// Run from the worktree root: node <this script> [--out <new-path>].
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const ts = require('typescript')

const BASE = 'd3f59cadd3389693e600f06a43d32ccebff68f6c'
const FILES = [
  'packages/shared/src/rle.ts',
  'packages/shared/src/rle.test.ts',
  'packages/shared/src/rle.boundaries.test.ts',
]
const FROZEN_REPORT = fileURLToPath(new URL('./body-invariance.json', import.meta.url))

function baseSource(file) {
  return execFileSync('git', ['show', `${BASE}:${file}`], {
    cwd: fileURLToPath(new URL('../../../../../..', import.meta.url)),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
}

/** Splice a fixed placeholder over first-arg string literals of it/test/describe. */
function maskTitles(source) {
  const sf = ts.createSourceFile('x.ts', source, ts.ScriptTarget.ESNext, true)
  const ranges = []
  const visit = (node) => {
    if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const first = node.arguments[0]
      if (ts.isStringLiteral(first)) {
        const callee = node.expression
        const isItOrTest =
          ts.isIdentifier(callee) && ['it', 'test', 'describe'].includes(callee.text)
        const isEachChain =
          ts.isCallExpression(callee) &&
          ts.isPropertyAccessExpression(callee.expression) &&
          ts.isIdentifier(callee.expression.expression) &&
          ['it', 'describe'].includes(callee.expression.expression.text)
        if (isItOrTest || isEachChain) ranges.push([first.getStart(sf), first.getEnd()])
      }
    }
    node.forEachChild(visit)
  }
  visit(sf)
  let out = ''
  let at = 0
  for (const [start, end] of ranges) {
    out += `${source.slice(at, start)}"<TITLE>"`
    at = end
  }
  out += source.slice(at)
  return { masked: out, titleCount: ranges.length }
}

function printNoComments(source) {
  const sf = ts.createSourceFile('x.ts', source, ts.ScriptTarget.ESNext, true)
  const printer = ts.createPrinter({ removeComments: true })
  return printer.printFile(sf)
}

const outIdx = process.argv.indexOf('--out')
const outPath = outIdx === -1 ? null : process.argv[outIdx + 1]
if (outIdx !== -1 && (typeof outPath !== 'string' || outPath === '')) {
  console.error('--out requires a path argument')
  process.exit(2)
}
if (outPath && resolve(outPath) === FROZEN_REPORT) {
  console.error('--out must target a NEW file; the r1 report is frozen')
  process.exit(2)
}

const report = {
  schemaVersion: 1,
  base: BASE,
  method:
    'typescript@' +
    ts.version +
    ' parse + createPrinter({removeComments:true}); test titles masked with "<TITLE>" in both versions',
  files: [],
}
let allEqual = true
for (const file of FILES) {
  const base = baseSource(file)
  const cur = readFileSync(new URL(`../../../../../../${file}`, import.meta.url), 'utf8')
  const isTest = file.endsWith('.test.ts')
  const mBase = isTest ? maskTitles(base) : { masked: base, titleCount: 0 }
  const mCur = isTest ? maskTitles(cur) : { masked: cur, titleCount: 0 }
  const pb = printNoComments(mBase.masked)
  const pc = printNoComments(mCur.masked)
  const equal = pb === pc
  allEqual = allEqual && equal
  const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex')
  report.files.push({
    file,
    titleCallCount: { base: mBase.titleCount, current: mCur.titleCount },
    printedSha256: { base: sha(pb), current: sha(pc) },
    printedBytes: { base: pb.length, current: pc.length },
    printedEqual: equal,
    firstDifferenceOffset: equal
      ? null
      : (() => {
          const n = Math.min(pb.length, pc.length)
          for (let i = 0; i < n; i++) if (pb[i] !== pc[i]) return i
          return n
        })(),
  })
}
report.allEqual = allEqual
const reportText = `${JSON.stringify(report, null, 2)}\n`
if (outPath) {
  writeFileSync(outPath, reportText)
}
console.log(reportText)
process.exit(allEqual ? 0 : 1)
