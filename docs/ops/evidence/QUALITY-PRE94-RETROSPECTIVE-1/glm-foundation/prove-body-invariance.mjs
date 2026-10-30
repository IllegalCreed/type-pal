// glm-foundation shared body-invariance proof (pattern: RLE copy-fix-r1, hardened
// per Codex c1464acde). Usage, run from worktree root:
//   node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/prove-body-invariance.mjs \
//     --base <sha> [--out <new-report-path>] <repo-relative-file...>
// Method: per file, compare `git show <base>:<file>` against the current worktree
// copy. Both are parsed with the TypeScript parser and printed with
// createPrinter({removeComments:true}); outputs are byte-compared. For *.test.ts
// files the first-arg string literals of it/test/describe calls (titles) are
// replaced with "<TITLE>" in BOTH versions, so title-only edits pass while any
// executable change fails. Read-only by default (report JSON to stdout, exit
// 0/1); --out writes the report exclusively (flag wx — refuses to overwrite).
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const require = createRequire(import.meta.url)
const ts = require('typescript')

const ROOT = process.cwd()
if (!readFileSync(`${ROOT}/package.json`, 'utf8').includes('"type-pal"')) {
  console.error('run from the worktree root (package.json named type-pal)')
  process.exit(2)
}
const args = process.argv.slice(2)
const baseIdx = args.indexOf('--base')
const outIdx = args.indexOf('--out')
const FILES = args.filter(
  (a, i) => a !== '--base' && a !== '--out' && i !== baseIdx + 1 && i !== outIdx + 1,
)
const BASE = baseIdx !== -1 ? args[baseIdx + 1] : undefined
const outPath = outIdx !== -1 ? args[outIdx + 1] : null
if (!BASE || FILES.length === 0) {
  console.error('usage: prove-body-invariance.mjs --base <sha> [--out <new-path>] <file...>')
  process.exit(2)
}

function baseSource(file) {
  return execFileSync('git', ['show', `${BASE}:${file}`], {
    cwd: ROOT,
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
  const cur = readFileSync(`${ROOT}/${file}`, 'utf8')
  const isTest = file.endsWith('.test.ts') || file.endsWith('.test.tsx')
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
  })
}
report.allEqual = allEqual
const reportText = `${JSON.stringify(report, null, 2)}\n`
if (outPath) {
  writeFileSync(resolve(outPath), reportText, { flag: 'wx' })
}
console.log(reportText)
process.exit(allEqual ? 0 : 1)
