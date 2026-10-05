/** Verify the untouched shell, not gameplay parity of the extracted battle body. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const removedOwners = new Set([
  'ScriptBattleOptions',
  'DebugBattleOptions',
  'activeBattle',
  'battleLaunchIntent',
  'reportedBattleReadiness',
  'reportBattleReadiness',
  'battleFieldsPromise',
  'startBattleBody',
  'battlePreparation',
  'battleHost',
])
function canonical(source, after) {
  if (after)
    source = source
      .replaceAll('battleHost.active', 'activeBattle')
      .replaceAll('battleHost.start(', 'startBattleBody(')
      .replace('battleHost.cancel()', 'battleLaunchIntent.invalidate(); activeBattle?.cancel()')
  const ast = ts.createSourceFile('main.ts', source, ts.ScriptTarget.Latest, true)
  assert.equal(ast.parseDiagnostics.length, 0)
  const ranges = []
  function visit(node) {
    if (
      ts.isImportDeclaration(node) ||
      (ts.isTypeAliasDeclaration(node) && removedOwners.has(node.name.text)) ||
      (ts.isVariableStatement(node) &&
        node.declarationList.declarations.every((d) => removedOwners.has(d.name.getText(ast))))
    ) {
      ranges.push([node.pos, node.end])
    } else ts.forEachChild(node, visit)
  }
  visit(ast)
  for (const [start, end] of ranges.sort((a, b) => b[0] - a[0]))
    source = `${source.slice(0, start)}\n${source.slice(end)}`
  const stripped = ts.createSourceFile('main.ts', source, ts.ScriptTarget.Latest, true)
  assert.equal(stripped.parseDiagnostics.length, 0)
  return ts.createPrinter({ removeComments: true }).printFile(stripped)
}
const before = canonical(
  execFileSync('git', ['show', '7f3840e6:packages/reforge/src/main.ts'], { encoding: 'utf8' }),
  false,
)
const after = canonical(readFileSync('packages/reforge/src/main.ts', 'utf8'), true)
assert.equal(after, before, 'unrelated shell behavior changed')
console.log(
  JSON.stringify({
    unchangedCharacters: before.length,
    sha256: createHash('sha256').update(before).digest('hex'),
  }),
)
