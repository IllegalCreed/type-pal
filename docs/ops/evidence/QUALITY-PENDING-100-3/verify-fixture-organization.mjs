import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { posix } from 'node:path'

/** Check declaration conservation and resolved imports, without executing or writing fixtures. */
export function verifyFixtureOrganization(
  root,
  native,
  manifest,
  readCurrent = (path) => readFileSync(new URL(path, root), 'utf8'),
) {
  const ts = createRequire(new URL('package.json', root))('typescript')
  const sha = (body) => createHash('sha256').update(body).digest('hex')
  const parse = (path, body) => {
    const source = ts.createSourceFile(path, body, ts.ScriptTarget.Latest, true)
    assert.equal(source.parseDiagnostics.length, 0, `Invalid TypeScript: ${path}`)
    return source
  }
  // The TS printer retains array layout. Compare ordered syntax instead, keeping
  // token spelling, const/let flags and type-only intent, but no comments/layout.
  const syntax = (node) => {
    const children = []
    ts.forEachChild(node, (child) => {
      children.push(syntax(child))
    })
    return [
      node.kind,
      node.flags,
      node.isTypeOnly ?? null,
      node.isExportEquals ?? null,
      node.isTypeOf ?? null,
      node.kind >= ts.SyntaxKind.FirstToken && node.kind <= ts.SyntaxKind.LastToken
        ? node.getText()
        : null,
      children,
    ]
  }
  const signature = (node) => JSON.stringify(syntax(node))
  const bridge = (body, changes) => {
    for (const change of changes ?? []) {
      assert.equal(body.split(change.from).length - 1, change.count, change.from)
      body = body.split(change.from).join(change.to)
    }
    return body
  }
  const before = (entry) => {
    assert.equal(sha(native[entry.member]), entry.sha256, entry.path)
    return native[entry.member]
  }
  const current = (entry) => {
    const body = readCurrent(entry.path, entry.currentSha256 ?? entry.sha256)
    assert.equal(sha(body), entry.currentSha256 ?? entry.sha256, entry.path)
    return body
  }
  const declarations = (entries, load) =>
    entries
      .flatMap((entry) =>
        [...parse(entry.path, bridge(load(entry), entry.changes)).statements]
          .filter((node) => !ts.isImportDeclaration(node) && !ts.isExportDeclaration(node))
          .map(signature),
      )
      .sort()
  assert.deepEqual(
    declarations(manifest.providers.current, current),
    declarations(manifest.providers.before, before),
    'No constructor, literal, calculation or parameter may disappear during splitting',
  )
  const imports = (sf) =>
    sf.statements
      .filter(ts.isImportDeclaration)
      .flatMap((node) => {
        assert.ok(node.importClause, 'Side-effect imports require separate review')
        const attributes = node.attributes ? { attributes: signature(node.attributes) } : {}
        const module = node.moduleSpecifier.text
        const target = module.startsWith('.')
          ? posix.normalize(posix.join(posix.dirname(sf.fileName), module.replace(/\.js$/, '.ts')))
          : module
        const bindings = node.importClause.namedBindings
        assert.ok(
          !bindings || ts.isNamedImports(bindings),
          'Namespace import requires explicit review',
        )
        return [
          ...(node.importClause.name
            ? [
                {
                  local: node.importClause.name.text,
                  imported: 'default',
                  target,
                  typeOnly: !!node.importClause.isTypeOnly,
                  ...attributes,
                },
              ]
            : []),
          ...(bindings?.elements ?? []).map((x) => ({
            local: x.name.text,
            imported: x.propertyName?.text ?? x.name.text,
            target,
            typeOnly: !!node.importClause.isTypeOnly || !!x.isTypeOnly,
            ...attributes,
          })),
        ]
      })
      .sort((a, b) => a.local.localeCompare(b.local))
  for (const entry of manifest.providers.current)
    assert.deepEqual(imports(parse(entry.path, current(entry))), entry.imports, entry.path)
  // These explicit reuse deltas need the recorded design judgment; byte checks
  // below certify only the named fixture configurations, never general equivalence.
  for (const helper of manifest.removedHelpers ?? []) {
    const original = manifest.providers.before.find((entry) => entry.path === helper.oldPath)
    assert.ok(original)
    assert.equal(before(original).split(helper.from).length, 2)
    assert.ok(original.changes.some((x) => x.from === helper.from && x.to === '' && x.count === 1))
    const target = manifest.providers.current.find((entry) => entry.path === helper.targetPath)
    assert.ok(target)
    assert.ok(
      parse(target.path, current(target)).statements.some(
        (node) => ts.isFunctionDeclaration(node) && node.name?.text === helper.targetName,
      ),
    )
    assert.ok(
      manifest.providers.current.some((entry) =>
        entry.imports.some(
          (binding) => binding.target === target.path && binding.imported === helper.targetName,
        ),
      ),
    )
  }
  if (manifest.inputConservation) {
    const proof = manifest.inputConservation
    assert.equal(sha(native[proof.before]), proof.sha256)
    assert.equal(native[proof.after], native[proof.before])
    assert.equal(
      JSON.parse(native[proof.before]).globalEntries.length,
      proof.globalHookConfigurations,
    )
  }
  for (const entry of manifest.consumers) {
    const old = parse(entry.path, bridge(before(entry), entry.changes))
    const now = parse(entry.path, current(entry))
    const nonImports = (sf) =>
      [...sf.statements].filter((x) => !ts.isImportDeclaration(x)).map(signature)
    assert.deepEqual(nonImports(now), nonImports(old), `Consumer body: ${entry.path}`)
    const expected = imports(old).map((binding) => {
      const target = manifest.exports.find(
        (x) => x.oldPath === binding.target && x.oldName === binding.imported,
      )
      if (!target) {
        assert.ok(
          !manifest.retiredPaths.includes(binding.target),
          `Missing export bridge: ${binding.target}#${binding.imported}`,
        )
        return binding
      }
      // A provider can retain its other responsibilities while some exports move.
      // The explicit bridge must still name an actual exported destination.
      const provider = manifest.providers.current.find((x) => x.path === target.currentPath)
      assert.ok(provider, target.currentPath)
      const exported = parse(provider.path, current(provider)).statements.flatMap((node) => {
        if (!node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword))
          return []
        return ts.isVariableStatement(node)
          ? node.declarationList.declarations.map((declaration) => declaration.name.getText())
          : node.name
            ? [node.name.text]
            : []
      })
      assert.ok(exported.includes(target.currentName), `${provider.path}#${target.currentName}`)
      return { ...binding, imported: target.currentName, target: target.currentPath }
    })
    assert.deepEqual(imports(now), expected, `Consumer bindings: ${entry.path}`)
  }
  for (const path of manifest.retiredPaths)
    assert.equal(existsSync(new URL(path, root)), false, path)
  for (const entry of manifest.preserved)
    assert.equal(sha(readCurrent(entry.path, entry.sha256)), entry.sha256, entry.path)
  for (const entry of manifest.profiles) {
    assert.deepEqual(Object.keys(entry.axes), [...'ABCDEFGH'])
    assert.ok(manifest.providers.current.some((x) => x.path === entry.path))
  }
  assert.deepEqual(
    manifest.profiles.map((x) => x.path).sort(),
    manifest.providers.current.map((x) => x.path).sort(),
  )
  const receipt = (id) => manifest.receipts?.[id] ?? `${manifest.namespace}/${id}`
  const result = (id) => JSON.parse(native[`${receipt(id)}.native.json`])
  const oldTests = result('before'),
    nowTests = result('neighbors')
  const identity = (report, paths) =>
    report.testResults
      .filter((x) => paths.some((p) => x.name.endsWith(`/${p}`)))
      .flatMap((file) => file.assertionResults.map((t) => `${file.name}\0${t.fullName}`))
      .sort()
  const consumerTests = manifest.consumers.map((x) => x.path).filter((x) => x.endsWith('.test.ts'))
  assert.deepEqual(identity(nowTests, consumerTests), identity(oldTests, consumerTests))
  for (const report of [oldTests, nowTests]) {
    assert.equal(report.numFailedTests, 0)
    assert.equal(report.numPendingTests, 0)
  }
  assert.deepEqual(
    nowTests.testResults
      .map((x) => manifest.neighborPaths.find((p) => x.name.endsWith(`/${p}`)))
      .sort(),
    manifest.neighborPaths.slice().sort(),
  )
  for (const id of manifest.cleanExecutions) {
    const run = JSON.parse(native[`${receipt(id)}.execution.json`])
    assert.equal(run.exit, 0, id)
    assert.equal(run.signal, null, id)
    assert.equal(run.spawnError, null, id)
    assert.equal(native[`${receipt(id)}.stderr.raw`], '', id)
  }
  assert.match(native[`${receipt('lint')}.stdout.raw`], /0 errors \/ 0 warnings \/ 0 infos/)
  assert.match(native[`${receipt('docs')}.stdout.raw`], /PASS \(0 issues\)/)
  assert.match(native[`${receipt('content-review')}.stdout.raw`], /^content review: PASS/)
  return {
    module: manifest.id,
    subjectsResolved: manifest.cohortSubjects.length,
    unchangedConsumerCases: identity(oldTests, consumerTests).length,
    baselineRunCases: oldTests.numPassedTests,
    neighborCases: nowTests.numPassedTests,
  }
}
