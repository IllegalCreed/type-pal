import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import {
  mergeTestFiles,
  onlyLegacyMergeBoundaryCases,
  withoutMergeBoundaryCases,
} from '../../../testing/domains/quality/quality-gates/tools/foundation-migration-selection.mjs'

// Read-only identity/relocation checks; these do not certify the design judgments.
export function verifyOrganization(
  root,
  native,
  organization,
  naming,
  resolutions,
  readNamingBoundary = (path) => readFileSync(new URL(path, root)),
  readLedgerBoundary = () =>
    readFileSync(new URL('docs/ops/audits/code-quality-file-ledger.md', root), 'utf8'),
) {
  const ts = createRequire(new URL('package.json', root))('typescript')
  const sha = (x) => createHash('sha256').update(x).digest('hex')
  const printer = ts.createPrinter({ removeComments: true })
  const syntax = (node) =>
    sha(printer.printNode(ts.EmitHint.Unspecified, node, node.getSourceFile()))
  const extract = (file, source) => {
    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
    assert.equal(sf.parseDiagnostics.length, 0)
    const cases = [],
      helpers = [],
      imports = []
    for (const statement of sf.statements) {
      if (ts.isImportDeclaration(statement)) {
        imports.push(statement.moduleSpecifier.text)
        continue
      }
      if (ts.isVariableStatement(statement)) {
        helpers.push(syntax(statement))
        continue
      }
      assert.ok(ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression))
      const suite = statement.expression
      assert.equal(suite.expression.getText(sf), 'describe')
      const context = []
      for (const node of suite.arguments[1].body.statements) {
        if (ts.isVariableStatement(node)) {
          context.push({
            hash: syntax(node),
            removableLiteral:
              (node.declarationList.flags & ts.NodeFlags.Const) !== 0 &&
              node.declarationList.declarations.every(
                (d) =>
                  ts.isIdentifier(d.name) && d.initializer && ts.isStringLiteral(d.initializer),
              ),
            names: node.declarationList.declarations.map((d) => d.name.getText(sf)),
          })
        } else {
          assert.ok(ts.isExpressionStatement(node) && ts.isCallExpression(node.expression))
          assert.equal(node.expression.expression.getText(sf), 'test')
          const identifiers = new Set()
          const visit = (child) => {
            if (ts.isIdentifier(child)) identifiers.add(child.text)
            ts.forEachChild(child, visit)
          }
          visit(node)
          cases.push({
            fullName: `${suite.arguments[0].text} ${node.expression.arguments[0].text}`,
            statementSyntaxSha256: syntax(node),
            context,
            identifiers,
          })
        }
      }
    }
    return { cases, helpers, imports }
  }
  const inputs = new Map(
    organization.inputs.map(({ file, sha256 }) => {
      const body = native[`naming/${file}.before`]
      assert.equal(sha(body), sha256, file)
      return [file, extract(file, body)]
    }),
  )
  const outputs = new Map(
    organization.outputs.map(({ file, sha256 }) => {
      const body = readFileSync(new URL(`packages/migrate/src/${file}`, root), 'utf8')
      assert.equal(sha(body), sha256, file)
      return [file, extract(file, body)]
    }),
  )
  const key = (x) => `${x.file}\0${x.fullName}`
  const flatten = (map) =>
    [...map].flatMap(([file, data]) => data.cases.map((x) => ({ file, ...x })))
  const oldCases = flatten(inputs),
    currentCases = flatten(outputs)
  assert.equal(oldCases.length, 44)
  assert.equal(currentCases.length, 44)
  assert.deepEqual(organization.cases.map((x) => key(x.old)).sort(), oldCases.map(key).sort())
  assert.deepEqual(
    organization.cases.map((x) => key(x.current)).sort(),
    currentCases.map(key).sort(),
  )
  assert.equal(new Set(currentCases.map(key)).size, 44)
  for (const mapping of organization.cases) {
    for (const [side, available] of [
      ['old', oldCases],
      ['current', currentCases],
    ]) {
      const actual = available.find((x) => key(x) === key(mapping[side]))
      assert.equal(actual.statementSyntaxSha256, mapping.statementSyntaxSha256)
      const expectedContext = mapping.context.map((x) => x.syntaxSha256)
      const retained = actual.context.filter((x) => expectedContext.includes(x.hash))
      for (const omitted of actual.context.filter((x) => !expectedContext.includes(x.hash))) {
        // A split group need not keep an unused const file='...' from its old suite.
        // Only side-effect-free string literals with no identifier use may disappear.
        assert.equal(side, 'old')
        assert.equal(omitted.removableLiteral, true)
        assert.ok(omitted.names.every((name) => !actual.identifiers.has(name)))
      }
      assert.deepEqual(
        retained.map((x) => x.hash),
        expectedContext,
      )
    }
    const isBoundary = mapping.old.file === 'migration-merge.boundaries.test.ts'
    assert.equal(
      new RegExp(onlyLegacyMergeBoundaryCases).test(mapping.current.fullName),
      isBoundary,
    )
    assert.equal(new RegExp(withoutMergeBoundaryCases).test(mapping.current.fullName), !isBoundary)
  }
  assert.ok(new RegExp(onlyLegacyMergeBoundaryCases).test('unrelated test name'))
  assert.ok(new RegExp(withoutMergeBoundaryCases).test('unrelated test name'))
  const helpers = [...outputs.values()].flatMap((x) => x.helpers).sort()
  assert.deepEqual(helpers, organization.helpers.map((x) => x.syntaxSha256).sort())
  assert.deepEqual(helpers, [...inputs.values()].flatMap((x) => x.helpers).sort())
  for (const [file, data] of outputs) {
    const expectedImports = ['vitest', './migration-merge.js']
    if (file.includes('.json.')) expectedImports.push('node:assert/strict')
    else expectedImports.push('@type-pal/content', './migration-files.js')
    assert.deepEqual(data.imports.sort(), expectedImports.sort(), file)
  }
  assert.deepEqual(
    mergeTestFiles,
    organization.outputs.map((x) => `src/${x.file}`),
  )
  for (const entry of organization.preserved) {
    assert.equal(sha(native[entry.member]), entry.sha256)
    assert.equal(readFileSync(new URL(entry.path, root), 'utf8'), native[entry.member])
  }
  const result = JSON.parse(native['naming/neighbors.native.json'])
  assert.equal(result.numPassedTests, 213)
  assert.equal(result.numFailedTests, 0)
  assert.equal(result.numPendingTests, 0)
  const actual = result.testResults.flatMap((file) =>
    organization.outputs.some((x) => file.name.endsWith(`/${x.file}`))
      ? file.assertionResults.map((test) => ({
          file: file.name.split('/').at(-1),
          fullName: test.fullName,
        }))
      : [],
  )
  assert.deepEqual(actual.map(key).sort(), currentCases.map(key).sort())
  for (const [id, boundary, passed] of [
    ['diagnostic-before', false, 33],
    ['diagnostic-mutant-selection', true, 11],
  ]) {
    const report = JSON.parse(native[`naming/${id}.native.json`])
    assert.equal(report.numPassedTests, passed)
    assert.equal(report.numFailedTests, 0)
    assert.equal(report.numPendingTests, 44 - passed) // Explicit diagnostic filtering only.
    const selected = report.testResults.flatMap((file) =>
      file.assertionResults
        .filter((test) => test.status === 'passed')
        .map((test) => ({ file: file.name.split('/').at(-1), fullName: test.fullName })),
    )
    const expected = organization.cases
      .filter((x) => (x.old.file === 'migration-merge.boundaries.test.ts') === boundary)
      .map((x) => x.current)
    assert.deepEqual(selected.map(key).sort(), expected.map(key).sort())
  }
  for (const id of [
    'neighbors',
    'typecheck',
    'diagnostic-before',
    'diagnostic-mutant-selection',
    'scoped-final-r2',
    'lint-r2',
    'docs-r2',
    'content-review-r2',
    'ledger-r2',
    'diff-r2',
    'final-fetch',
  ]) {
    const execution = JSON.parse(native[`naming/${id}.execution.json`])
    assert.equal(execution.exit, 0, id)
    assert.equal(execution.signal, null, id)
    assert.equal(execution.spawnError, null, id)
    assert.equal(native[`naming/${id}.stderr.raw`], '', id)
  }
  assert.match(native['naming/lint-r2.stdout.raw'], /0 errors \/ 0 warnings \/ 0 infos/)
  assert.match(native['naming/docs-r2.stdout.raw'], /PASS \(0 issues\)/)
  assert.match(native['naming/content-review-r2.stdout.raw'], /^content review: PASS/)
  assert.match(native['naming/ledger-r2.stdout.raw'], /617 closed \/ 215 review \/ 2638 pending/)
  assert.equal(JSON.parse(native['naming/docs-first.execution.json']).exit, 1)
  assert.match(
    native['naming/docs-first.stderr.raw'],
    /e2e-001: reviewBy 2026-10-28 is before 2026-10-29/,
  )
  assert.equal(naming.withdrawnClosedCount, 178)
  assert.equal(naming.files.length, 178)
  const ledger = readLedgerBoundary()
  for (const entry of naming.files) {
    const resolution = resolutions.files.find((x) => x.oldPath === entry.path)
    if (resolution) {
      assert.equal(sha(native[resolution.beforeMember]), entry.sha256, entry.path)
      assert.ok(resolution.currentPaths.length > 0)
      for (const path of resolution.currentPaths) {
        const current = ledger.split('\n').find((x) => x.startsWith(`| \`${path}\` |`))
        assert.equal(current.split('|')[3].trim(), 'review', path)
      }
      continue
    }
    assert.equal(sha(readNamingBoundary(entry.path, entry.sha256)), entry.sha256, entry.path)
    const line = ledger.split('\n').find((x) => x.startsWith(`| \`${entry.path}\` |`))
    assert.equal(line.split('|')[3].trim(), 'review', entry.path)
    assert.equal(line.split('|')[4].trim(), entry.preservedEvidence, entry.path)
  }
  assert.equal(resolutions.originalCohort, 178)
  assert.equal(resolutions.completedFG, resolutions.files.length)
  assert.equal(new Set(resolutions.files.map((x) => x.oldPath)).size, resolutions.files.length)
  assert.equal(resolutions.remainingFG, 178 - resolutions.completedFG)
  return {
    relocatedCases: 44,
    oldClosedNamingCohort: 178,
    resolvedFG: resolutions.completedFG,
    remainingFG: resolutions.remainingFG,
    newFullReviewCredit: 0,
  }
}
