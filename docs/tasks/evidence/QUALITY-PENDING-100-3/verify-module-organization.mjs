import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { analyzeOrganization } from './organization-program.mjs'
import { verifyTestRetirements } from './verify-test-retirements.mjs'

/** Auxiliary comment repairs join the same forward-only checkpoint chain. */
export function moduleFrozenInputs(module) {
  return [
    ...(module.kind === 'fixture'
      ? [...module.providers.before, ...module.consumers]
      : module.inputs),
    ...(module.commentRepair ? [module.commentRepair.input] : []),
  ]
}

function verifyCommentRepair(root, native, repair, readPreserved) {
  if (!repair) return
  const { input, output, profile } = repair
  const sha = (s) => createHash('sha256').update(s).digest('hex')
  assert.equal(input.path, output.path)
  const before = native[input.member]
  const after = readPreserved(output.path, output.sha256).toString()
  assert.equal(sha(before), input.sha256)
  assert.equal(sha(after), output.sha256)
  assert.equal(profile.path, output.path)
  assert.deepEqual(Object.keys(profile.axes), [...'ABCDEFGH'])
  const ts = createRequire(new URL('package.json', root))('typescript')
  const tree = (node) => {
    const children = []
    ts.forEachChild(node, (child) => {
      children.push(tree(child))
    })
    return [
      node.kind,
      ts.isSourceFile(node) ? null : (node.text ?? null),
      ts.isVariableDeclarationList(node) ? node.flags : null,
      children,
    ]
  }
  const parse = (body) => {
    const source = ts.createSourceFile(input.path, body, ts.ScriptTarget.Latest, true)
    assert.equal(source.parseDiagnostics.length, 0)
    return tree(source)
  }
  // Includes re-exports, declaration kinds and every last field/assertion;
  // this does not make the test-registration analyzer skip unknown statements.
  assert.deepEqual(parse(after), parse(before), `Comment-only repair: ${input.path}`)
}

function verifyFormattingBridges(root, bridges) {
  if (!bridges?.length) return
  const ts = createRequire(new URL('package.json', root))('typescript')
  const tokens = (source, kind) => {
    const sf = ts.createSourceFile('literal.ts', source, ts.ScriptTarget.Latest, true)
    assert.equal(sf.parseDiagnostics.length, 0)
    assert.equal(sf.statements.length, 1)
    const statement = sf.statements[0]
    if (kind === 'object-assertion') {
      assert.ok(ts.isExpressionStatement(statement))
      const call = statement.expression
      assert.ok(ts.isCallExpression(call))
      assert.ok(ts.isPropertyAccessExpression(call.expression))
      assert.equal(call.expression.name.text, 'toEqual')
      assert.equal(call.arguments.length, 1)
      assert.ok(ts.isObjectLiteralExpression(call.arguments[0]))
      const check = (node) => {
        // These bridges only wrap straight-line object assertions, never functions
        // where newline-sensitive return/throw or a regex/template can alter meaning.
        assert.ok(!ts.isFunctionLike(node))
        assert.ok(!ts.isRegularExpressionLiteral(node))
        assert.ok(!ts.isTemplateExpression(node))
        ts.forEachChild(node, check)
      }
      check(statement)
    } else {
      assert.ok(kind === undefined || kind === 'numeric-vector')
      assert.ok(ts.isVariableStatement(statement))
      assert.equal(statement.declarationList.declarations.length, 1)
      const value = statement.declarationList.declarations[0].initializer
      assert.ok(ts.isArrowFunction(value))
      assert.equal(value.parameters.length, 0)
      assert.ok(ts.isCallExpression(value.body))
      assert.equal(value.body.expression.getText(sf), 'Uint8Array.from')
      assert.equal(value.body.arguments.length, 1)
      const array = value.body.arguments[0]
      assert.ok(ts.isArrayLiteralExpression(array))
      assert.ok(array.elements.every(ts.isNumericLiteral))
    }
    const scanner = ts.createScanner(
      ts.ScriptTarget.Latest,
      true,
      ts.LanguageVariant.Standard,
      source,
    )
    const result = []
    for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan())
      result.push([kind, scanner.getTokenText()])
    return result.filter(
      ([token], i) =>
        token !== ts.SyntaxKind.CommaToken ||
        ![
          ts.SyntaxKind.CloseBraceToken,
          ts.SyntaxKind.CloseBracketToken,
          ts.SyntaxKind.CloseParenToken,
        ].includes(result[i + 1]?.[0]),
    )
  }
  for (const bridge of bridges)
    assert.deepEqual(tokens(bridge.from, bridge.kind), tokens(bridge.to, bridge.kind), bridge.name)
}

/** Read-only case/dependency/receipt validation; the per-file judgments are separate evidence. */
export function verifyModuleOrganization(
  root,
  native,
  module,
  readPreserved = (path) => readFileSync(new URL(path, root)),
) {
  const sha = (x) => createHash('sha256').update(x).digest('hex')
  verifyCommentRepair(root, native, module.commentRepair, readPreserved)
  verifyFormattingBridges(root, module.formattingBridges)
  const frozen = Object.fromEntries(
    module.inputs.map((x) => {
      assert.equal(sha(native[x.member]), x.sha256, x.path)
      assert.equal(
        existsSync(new URL(x.path, root)),
        module.outputs.some((output) => output.path === x.path),
        `Unexpected retired or in-place source presence:${x.path}`,
      )
      return [x.path, native[x.member]]
    }),
  )
  const current = Object.fromEntries(
    module.outputs.map((x) => {
      // Later verified import-only consumers can bind an exact intermediate output.
      const bytes = readPreserved(x.path, x.sha256)
      const body = typeof bytes === 'string' ? bytes : bytes.toString('utf8')
      assert.equal(sha(body), x.sha256, x.path)
      return [x.path, body]
    }),
  )
  // Moving a helper out of a suite must conserve its body as well as its callers.
  if (module.helperTransplants?.length) {
    const ts = createRequire(new URL('package.json', root))('typescript')
    const printer = ts.createPrinter({ removeComments: true })
    const parse = (path, body) => {
      const sf = ts.createSourceFile(path, body, ts.ScriptTarget.Latest, true)
      assert.equal(sf.parseDiagnostics.length, 0, path)
      return sf
    }
    for (const entry of module.helperTransplants) {
      const source = parse(entry.oldPath, frozen[entry.oldPath])
      const original = source.statements.find(
        (node) => ts.isFunctionDeclaration(node) && node.name?.text === entry.oldName,
      )
      assert.ok(original, entry.oldName)
      let expected = original.getText(source)
      for (const change of entry.changes) {
        assert.equal(expected.split(change.from).length - 1, change.count)
        expected = expected.split(change.from).join(change.to)
      }
      const wanted = parse('expected.ts', expected)
      assert.equal(wanted.statements.length, 1)
      const destination = parse(entry.currentPath, current[entry.currentPath])
      const actual = destination.statements.find(
        (node) => ts.isFunctionDeclaration(node) && node.name?.text === entry.currentName,
      )
      assert.ok(actual, entry.currentName)
      assert.equal(
        printer.printNode(ts.EmitHint.Unspecified, actual, destination),
        printer.printNode(ts.EmitHint.Unspecified, wanted.statements[0], wanted),
        entry.currentName,
      )
    }
  }
  const old = analyzeOrganization(
    fileURLToPath(root),
    frozen,
    module.replacements,
    module.sourceBridges,
  )
  const now = analyzeOrganization(fileURLToPath(root), current, module.replacements)
  const retiredIdentities = verifyTestRetirements(
    root,
    frozen,
    current,
    module.retirements,
    module.registrations,
  )
  const oldKey = (x) => `${x.file}#${x.ordinal}`
  const newKey = (x) => `${x.file}#${JSON.stringify(x.titles)}#${x.template}`
  const actualOld = Object.entries(old).flatMap(([file, data]) =>
    data.tests.map((x) => oldKey({ file, ...x })),
  )
  const actualNew = Object.entries(now).flatMap(([file, data]) =>
    data.tests.map((x) => newKey({ file, ...x })),
  )
  assert.deepEqual(module.registrations.map((x) => oldKey(x.old)).sort(), actualOld.sort())
  assert.deepEqual(module.registrations.map((x) => newKey(x.current)).sort(), actualNew.sort())
  assert.equal(new Set(actualNew).size, actualNew.length)
  const signature = (x) => ({
    statement: x.statementSyntaxSha256,
    declarations: x.declarations.map((x) => x.syntaxSha256).sort(),
    imports: x.imports,
    hooks: x.hooks.map((x) => x.syntaxSha256).sort(),
  })
  for (const mapping of module.registrations) {
    const before = old[mapping.old.file].tests[mapping.old.ordinal]
    const after = now[mapping.current.file].tests.find(
      (x) => newKey({ ...x, file: mapping.current.file }) === newKey(mapping.current),
    )
    assert.deepEqual(signature(after), signature(before), JSON.stringify(mapping.old))
  }
  const identity = (x) => `${x.file}\0${x.fullName}`
  const receipt = (name) => module.receipts?.[name] ?? `${module.namespace}/${name}`
  const result = (name) => JSON.parse(native[`${receipt(name)}.native.json`])
  const baseline = result('before'),
    neighbors = result('neighbors')
  const identities = (report, paths) =>
    report.testResults
      .filter((x) => paths.some((path) => x.name.endsWith(`/${path}`)))
      .flatMap((file) =>
        file.assertionResults.map((test) => ({
          file: paths.find((path) => file.name.endsWith(`/${path}`)),
          fullName: test.fullName,
        })),
      )
  for (const [report, paths, side] of [
    [baseline, module.inputs.map((x) => x.path), 'old'],
    [neighbors, module.outputs.map((x) => x.path), 'current'],
  ]) {
    assert.equal(report.numFailedTests, 0)
    assert.equal(report.numPendingTests, 0)
    const expected = module.identities.map((x) => x[side])
    if (side === 'old') expected.push(...retiredIdentities)
    assert.deepEqual(identities(report, paths).map(identity).sort(), expected.map(identity).sort())
  }
  const expectedNeighbors = new Set(module.neighborPaths)
  const actualNeighbors = new Set(
    neighbors.testResults.map((x) =>
      module.neighborPaths.find((path) => x.name.endsWith(`/${path}`)),
    ),
  )
  assert.deepEqual(actualNeighbors, expectedNeighbors)
  for (const entry of module.preserved)
    assert.equal(sha(readPreserved(entry.path, entry.sha256)), entry.sha256, entry.path)
  if (module.routing) {
    const route = module.routing
    const beforeConfig = native[route.beforeConfigMember]
    assert.equal(sha(beforeConfig), route.beforeConfigSha256)
    const config = readPreserved(route.configPath, route.configSha256)
    assert.equal(sha(config), route.configSha256)
    assert.equal(beforeConfig.split(route.removedLine).length, 2)
    assert.equal(beforeConfig.replace(route.removedLine, ''), config)
    const packageRoot = fileURLToPath(new URL(`${route.packageDirectory}/`, root))
    const files = (id) =>
      JSON.parse(native[`${module.namespace}/${id}.native.json`]).map((entry) => {
        assert.ok(entry.file.startsWith(packageRoot))
        return entry.file.slice(packageRoot.length)
      })
    for (const profile of ['fast', 'full']) {
      const oldFiles = files(`before-${profile}-files`)
      const newFiles = files(`after-${profile}-files`)
      assert.deepEqual(
        [...new Set(oldFiles.map((path) => route.pathMap[path] ?? path))].sort(),
        newFiles.slice().sort(),
        `Actual Vitest ${profile} file routing`,
      )
      assert.equal(oldFiles.includes(route.oldArtifactPath), profile === 'full')
      assert.equal(newFiles.includes(route.artifactPath), profile === 'full')
      assert.ok(newFiles.includes(route.pngPath))
    }
    assert.match(native[`${module.namespace}/coverage-config-tests.stdout.raw`], /# fail 0/)
  }
  for (const profile of module.profiles) {
    assert.deepEqual(Object.keys(profile.axes), [...'ABCDEFGH'])
    assert.ok(Object.hasOwn(current, profile.path))
    assert.ok(profile.subjects.length > 0)
  }
  for (const id of module.cleanExecutions) {
    const run = JSON.parse(native[`${receipt(id)}.execution.json`])
    assert.equal(run.exit, 0, id)
    assert.equal(run.signal, null, id)
    assert.equal(run.spawnError, null, id)
    assert.equal(native[`${receipt(id)}.stderr.raw`], '', id)
  }
  if (module.lightweightGates) {
    assert.match(native[`${receipt('lint')}.stdout.raw`], /0 errors \/ 0 warnings \/ 0 infos/)
    assert.match(native[`${receipt('docs')}.stdout.raw`], /PASS \(0 issues\)/)
    assert.match(native[`${receipt('content-review')}.stdout.raw`], /^content review: PASS/)
  }
  for (const member of module.counters ?? (module.counter ? [module.counter] : [])) {
    const counter = JSON.parse(native[`${module.namespace}/${member}`])
    const source = readFileSync(new URL(counter.sourcePath, root), 'utf8')
    assert.equal(sha(source), counter.sourceSha256)
    // Test snapshots use the same verified successor boundary as outputs; its
    // owning module separately validates the live contract. Product source stays live.
    assert.equal(
      sha(readPreserved(counter.testPath, counter.finalTestSha256)),
      counter.finalTestSha256,
    )
    if (counter.beforeTestMember)
      assert.equal(sha(native[counter.beforeTestMember]), counter.beforeTestSha256)
    assert.equal(source.split(counter.from).length, 2)
    assert.equal(sha(source.replace(counter.from, counter.to)), counter.mutantSha256)
    assert.deepEqual(counter.restored, { sourceExact: true, currentTestExact: true })
    for (const [index, entry] of counter.reports.entries()) {
      const report = result(entry.id),
        assertions = report.testResults.flatMap((x) => x.assertionResults)
      assert.ok(assertions.every((x) => ['passed', 'failed', 'skipped'].includes(x.status)))
      const skipped = assertions.filter((x) => x.status === 'skipped')
      const executed = assertions.filter((x) => x.status !== 'skipped')
      // A -t counter intentionally excludes other cases; reconcile every record,
      // rather than interpreting excluded cases as executed or silently dropping them.
      assert.equal(report.numPendingTests, skipped.length)
      assert.equal(report.numTotalTests, assertions.length)
      assert.equal(report.numTodoTests, 0)
      assert.equal(report.numPassedTests, index === 0 ? 1 : 0)
      assert.equal(executed.length, 1)
      assert.equal(executed[0].status, index === 0 ? 'passed' : 'failed')
      assert.equal(executed[0].fullName, entry.fullName)
      assert.equal(report.numFailedTests, index === 0 ? 0 : 1)
      const run = JSON.parse(native[`${module.namespace}/${entry.id}.execution.json`])
      assert.equal(run.exit, index === 0 ? 0 : 1)
      assert.equal(run.signal, null)
      assert.equal(run.spawnError, null)
      if (index === 1) assert.match(executed[0].failureMessages[0], /^AssertionError:/)
    }
  }
  return {
    module: module.id,
    subjectsResolved: module.cohortSubjects.length,
    oldCases: module.identities.length + retiredIdentities.length,
    ...(retiredIdentities.length ? { retiredCases: retiredIdentities.length } : {}),
    baselineRunCases: baseline.numPassedTests,
    neighborCases: neighbors.numPassedTests,
    currentFiles: module.outputs.length,
  }
}
