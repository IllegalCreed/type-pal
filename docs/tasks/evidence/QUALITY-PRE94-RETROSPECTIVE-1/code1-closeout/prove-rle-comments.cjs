const assert = require('node:assert/strict')
const cp = require('node:child_process')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const root = cp
  .execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: __dirname, encoding: 'utf8' })
  .trim()
const ts = require(`${root}/node_modules/typescript`)
const record = JSON.parse(fs.readFileSync(path.join(__dirname, 'rle-comments.json')))
const hash = (b) => crypto.createHash('sha256').update(b).digest('hex')
const printer = ts.createPrinter({ removeComments: true })
for (const f of record.files) {
  const before = cp.execFileSync('git', ['show', `${record.base}:${f.path}`], {
    cwd: root,
    encoding: 'utf8',
  })
  const after = fs.readFileSync(path.join(root, f.path), 'utf8')
  assert.equal(hash(before), f.beforeSha256, `STALE base ${f.path}`)
  assert.equal(hash(after), f.afterSha256, `STALE current ${f.path}`)
  const normalized = (s) =>
    printer.printFile(
      ts.createSourceFile(f.path, s, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS),
    )
  assert.equal(normalized(after), normalized(before), `NON-COMMENT change ${f.path}`)
  assert.equal(hash(normalized(after)), f.normalizedSha256)
}
console.log(
  'PASS:two RLE module comment deltas only; complete import/type/executable ASTs unchanged; source-format decisions remain open. Read-only.',
)
