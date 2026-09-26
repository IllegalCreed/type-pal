import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import ts from 'typescript'

// Mechanical source-literal migration, not a mutation of the represented probe source.
const root = resolve(process.argv[2] ?? '.')
const apply = process.argv.includes('--apply')
const inventory = JSON.parse(
  readFileSync(resolve(root, 'docs/testing/quality-zero-inventory.json'), 'utf8'),
)
const files = [
  ...new Set(
    inventory.diagnostics
      .filter((d) => d.category === 'lint/suspicious/noTemplateCurlyInString')
      .map((d) => d.path),
  ),
]
const fileOption = process.argv.indexOf('--file')
const selectedFile = fileOption < 0 ? undefined : process.argv[fileOption + 1]
if (fileOption >= 0)
  assert.ok(files.includes(selectedFile), 'Only inventoried paths may be selected')
const results = []
const hash = (text) => createHash('sha256').update(text).digest('hex')
function literals(file, source) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  assert.equal(tree.parseDiagnostics.length, 0, file)
  const values = []
  function walk(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) values.push(node.text)
    ts.forEachChild(node, walk)
  }
  walk(tree)
  return { tree, values }
}
for (const file of files) {
  if (selectedFile !== undefined && file !== selectedFile) continue
  const path = resolve(root, file)
  if (!existsSync(path)) {
    results.push({ file, skipped: 'not present in this isolated checkout' })
    continue
  }
  const before = readFileSync(path, 'utf8')
  const { tree, values } = literals(file, before)
  const edits = []
  function walk(node) {
    if (ts.isStringLiteral(node) && node.text.includes('${')) {
      assert.ok(!ts.isLiteralTypeNode(node.parent), `${file}: do not rewrite type literals`)
      assert.ok(
        !(ts.isPropertyAssignment(node.parent) && node.parent.name === node),
        `${file}: property key`,
      )
      const value = node.text
      const replacement = `\`${value.replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${')}\``
      assert.equal(literals('value.mjs', replacement).values[0], value)
      edits.push({
        start: node.getStart(tree),
        end: node.end,
        replacement,
        valueSha256: hash(value),
      })
    }
    ts.forEachChild(node, walk)
  }
  walk(tree)
  let after = before
  for (const edit of edits.toReversed())
    after = after.slice(0, edit.start) + edit.replacement + after.slice(edit.end)
  assert.deepEqual(
    literals(file, after).values,
    values,
    `${file}: all static literal values must remain identical`,
  )
  if (apply && after !== before) writeFileSync(path, after)
  results.push({
    file,
    changed: edits.length,
    beforeSha256: hash(before),
    afterSha256: hash(after),
    valueSha256: edits.map((edit) => edit.valueSha256),
    allLiteralValuesIdentical: true,
  })
}
console.log(JSON.stringify({ root, applied: apply, files: results }, null, 2))
