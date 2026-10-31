import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { analyzeOrganization } from './organization-program.mjs'

export function verifySharedOrganization(root, native, manifest) {
  const sha = (x) => createHash('sha256').update(x).digest('hex')
  const input = Object.fromEntries(
    manifest.inputs.map((x) => {
      assert.equal(sha(native[x.member]), x.sha256, x.path)
      return [x.path, native[x.member]]
    }),
  )
  const output = Object.fromEntries(
    manifest.outputs.map((x) => {
      const body = readFileSync(new URL(x.path, root), 'utf8')
      assert.equal(sha(body), x.sha256, x.path)
      return [x.path, body]
    }),
  )
  const old = analyzeOrganization(fileURLToPath(root), input, [], manifest.sourceBridges)
  const current = analyzeOrganization(fileURLToPath(root), output)
  const sig = (t) => ({
    statement: t.statementSyntaxSha256,
    declarations: t.declarations.map((x) => x.syntaxSha256).sort(),
    imports: t.imports,
    hooks: t.hooks,
  })
  assert.equal(manifest.registrations.length, 32)
  assert.equal(
    new Set(manifest.registrations.map((x) => `${x.old.file}#${x.old.ordinal}`)).size,
    32,
  )
  assert.equal(
    new Set(
      manifest.registrations.map(
        (x) => `${x.current.file}#${JSON.stringify(x.current.titles)}#${x.current.template}`,
      ),
    ).size,
    32,
  )
  for (const m of manifest.registrations) {
    const a = old[m.old.file].tests[m.old.ordinal],
      b = current[m.current.file].tests.find(
        (x) =>
          x.template === m.current.template &&
          JSON.stringify(x.titles) === JSON.stringify(m.current.titles),
      )
    assert.ok(b, JSON.stringify(m.current))
    assert.deepEqual(sig(b), sig(a), m.old.file)
  }
  assert.equal(
    Object.values(current).reduce((n, x) => n + x.tests.length, 0),
    32,
  )
  const ts = createRequire(new URL('package.json', root))('typescript'),
    printer = ts.createPrinter({ removeComments: true })
  const parse = (file, body) => ts.createSourceFile(file, body, ts.ScriptTarget.Latest, true)
  const printed = (node) => printer.printNode(ts.EmitHint.Unspecified, node, node.getSourceFile())
  const beforeFixture = native[manifest.fixture.old.member]
  assert.equal(sha(beforeFixture), manifest.fixture.old.sha256)
  const original = parse(manifest.fixture.old.path, beforeFixture).statements.map(printed).sort()
  const replacements = manifest.fixture.new
    .flatMap((x) => {
      const body = readFileSync(new URL(x.path, root), 'utf8')
      assert.equal(sha(body), x.sha256, x.path)
      return [...parse(x.path, body).statements].map(printed)
    })
    .sort()
  assert.deepEqual(
    replacements,
    original,
    'MKF constructor and five YJ2 vectors stay exact and distinct',
  )
  for (const c of manifest.fixture.consumers) {
    let body = native[c.beforeMember]
    for (const [from, to] of c.replacements) {
      assert.equal(body.split(from).length, 2)
      body = body.replace(from, to)
    }
    const currentBody = readFileSync(new URL(c.path, root), 'utf8')
    assert.equal(sha(currentBody), c.sha256)
    const expected = parse(c.path, body),
      actual = parse(c.path, currentBody)
    const nonImports = (sf) =>
      [...sf.statements].filter((x) => !ts.isImportDeclaration(x)).map(printed)
    const imports = (sf) =>
      [...sf.statements]
        .filter(ts.isImportDeclaration)
        .map((x) => ({
          module: x.moduleSpecifier.text,
          default: x.importClause?.name?.text,
          typeOnly: !!x.importClause?.isTypeOnly,
          bindings: x.importClause?.namedBindings
            ? ts.isNamespaceImport(x.importClause.namedBindings)
              ? ['*', x.importClause.namedBindings.name.text]
              : x.importClause.namedBindings.elements
                  .map((e) => [e.propertyName?.text ?? e.name.text, e.name.text, !!e.isTypeOnly])
                  .sort()
            : [],
          attributes: x.attributes ? printed(x.attributes) : undefined,
        }))
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
    assert.deepEqual(nonImports(actual), nonImports(expected), c.path)
    // The fixture providers are unchanged pure data/builders. Biome may sort
    // their import declarations/specifiers; preserve bindings/attributes, not commas/order.
    assert.deepEqual(imports(actual), imports(expected), c.path)
  }
  const before = JSON.parse(native['organization-shared/before.native.json']),
    after = JSON.parse(native['organization-shared-oracle/neighbors.native.json'])
  assert.equal(before.numPassedTests, 76)
  assert.equal(after.numPassedTests, 106)
  for (const report of [before, after]) {
    assert.equal(report.numFailedTests, 0)
    assert.equal(report.numPendingTests, 0)
  }
  const ids = (report, paths) =>
    report.testResults
      .filter((x) => paths.some((path) => x.name.endsWith(`/${path}`)))
      .flatMap((file) =>
        file.assertionResults.map((t) => ({
          file: `packages/shared/src/${file.name.split('/').at(-1)}`,
          fullName: t.fullName,
        })),
      )
  const key = (x) => `${x.file}\0${x.fullName}`
  assert.deepEqual(
    ids(
      before,
      manifest.inputs.map((x) => x.path),
    )
      .map(key)
      .sort(),
    manifest.identities.map((x) => key(x.old)).sort(),
  )
  assert.deepEqual(
    ids(
      after,
      manifest.outputs.map((x) => x.path),
    )
      .map(key)
      .sort(),
    manifest.identities.map((x) => key(x.current)).sort(),
  )
  const consumers = manifest.fixture.consumers.map((x) => x.path)
  assert.deepEqual(ids(before, consumers).map(key).sort(), ids(after, consumers).map(key).sort())
  for (const e of manifest.preserved)
    assert.equal(sha(readFileSync(new URL(e.path, root))), e.sha256, e.path)
  for (const id of ['before', 'neighbors', 'typecheck', 'scoped']) {
    const e = JSON.parse(native[`organization-shared/${id}.execution.json`])
    assert.equal(e.exit, 0, id)
    assert.equal(e.signal, null, id)
    assert.equal(e.spawnError, null, id)
    assert.equal(native[`organization-shared/${id}.stderr.raw`], '', id)
  }
  const counter = JSON.parse(native['organization-shared-oracle/counter.json'])
  const encoder = readFileSync(new URL(counter.sourcePath, root), 'utf8')
  assert.equal(sha(encoder), counter.sourceSha256)
  assert.equal(sha(readFileSync(new URL(counter.testPath, root))), counter.finalTestSha256)
  assert.equal(encoder.split(counter.from).length, 2)
  assert.equal(sha(encoder.replace(counter.from, counter.to)), counter.mutantSha256)
  assert.deepEqual(counter.restored, { sourceExact: true, currentTestExact: true })
  assert.equal(
    sha(native['organization-shared-oracle/rle-encode.bytes.test.ts.before']),
    counter.beforeTestSha256,
  )
  for (const [index, entry] of counter.reports.entries()) {
    const report = JSON.parse(native[`organization-shared-oracle/${entry.id}.native.json`])
    const executed = report.testResults
      .flatMap((x) => x.assertionResults)
      .filter((x) => ['passed', 'failed'].includes(x.status))
    assert.equal(executed.length, 1)
    assert.equal(report.numFailedTests, index === 0 ? 0 : 1)
    assert.equal(executed[0].fullName, entry.fullName)
    if (index === 1) assert.match(executed[0].failureMessages[0], /^AssertionError:/)
    const run = JSON.parse(native[`organization-shared-oracle/${entry.id}.execution.json`])
    assert.equal(run.exit, index === 0 ? 0 : 1)
    assert.equal(run.signal, null)
    assert.equal(run.spawnError, null)
  }
  const execution = JSON.parse(native['organization-shared-oracle/neighbors.execution.json'])
  assert.equal(execution.exit, 0)
  assert.equal(execution.signal, null)
  assert.equal(execution.spawnError, null)
  assert.equal(native['organization-shared-oracle/neighbors.stderr.raw'], '')
  for (const id of ['docs', 'content-review', 'lint', 'ledger', 'diff', 'final-fetch']) {
    const run = JSON.parse(native[`organization-shared-oracle/${id}.execution.json`])
    assert.equal(run.exit, 0, id)
    assert.equal(run.signal, null, id)
    assert.equal(run.spawnError, null, id)
    assert.equal(native[`organization-shared-oracle/${id}.stderr.raw`], '', id)
  }
  assert.match(
    native['organization-shared-oracle/lint.stdout.raw'],
    /0 errors \/ 0 warnings \/ 0 infos/,
  )
  assert.match(native['organization-shared-oracle/docs.stdout.raw'], /PASS \(0 issues\)/)
  assert.match(
    native['organization-shared-oracle/content-review.stdout.raw'],
    /^content review: PASS/,
  )
  assert.match(
    native['organization-shared-oracle/ledger.stdout.raw'],
    /615 closed \/ 211 review \/ 2638 pending/,
  )
  assert.equal(JSON.parse(native['organization-current/testing-docs.execution.json']).exit, 1)
  assert.match(
    native['organization-current/testing-docs.stderr.raw'],
    /e2e-001: reviewBy 2026-10-28 is before 2026-10-30/,
  )
  return {
    oldClosedNamingSubjectsResolved: 4,
    remainingAtSharedCheckpoint: 174,
    relocatedCases: 39,
    neighborCases: 106,
    newClosed: 0,
  }
}
