import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'

/** Verify explicit direct-assertion subsumption; input/caller equivalence remains a recorded review. */
export function verifyTestRetirements(root, frozen, current, retirements, registrations) {
  if (!retirements?.length) return []
  const ts = createRequire(new URL('package.json', root))('typescript')
  const sha = (body) => createHash('sha256').update(body).digest('hex')
  const parse = (body) => {
    const source = ts.createSourceFile('case.ts', body, ts.ScriptTarget.Latest, true)
    assert.equal(source.parseDiagnostics.length, 0)
    return source
  }
  const cases = (body) => {
    const source = parse(body)
    const tests = []
    function visit(node) {
      if (ts.isCallExpression(node) && node.expression.getText(source) === 'it') {
        assert.ok(ts.isStringLiteralLike(node.arguments[0]))
        const titles = []
        for (let parent = node.parent; parent; parent = parent.parent)
          if (ts.isCallExpression(parent) && parent.expression.getText(source) === 'describe') {
            assert.ok(ts.isStringLiteralLike(parent.arguments[0]))
            titles.unshift(parent.arguments[0].text)
          }
        tests.push({ node, source, titles, template: node.arguments[0].text })
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
    return tests
  }
  const assertions = ({ node, source }) => {
    const callback = node.arguments[1]
    assert.ok(ts.isArrowFunction(callback) && ts.isBlock(callback.body))
    let allExpectCalls = 0
    function count(child) {
      if (ts.isCallExpression(child) && child.expression.getText(source) === 'expect')
        allExpectCalls++
      ts.forEachChild(child, count)
    }
    count(callback.body)
    const direct = callback.body.statements.filter((statement) => {
      if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression))
        return false
      const method = statement.expression.expression
      return (
        ts.isPropertyAccessExpression(method) &&
        ts.isCallExpression(method.expression) &&
        method.expression.expression.getText(source) === 'expect'
      )
    })
    assert.ok(direct.length > 0)
    assert.equal(
      direct.length,
      allExpectCalls,
      'Nested or conditional assertions need a separate review',
    )
    return direct.map((statement) => statement.getText(source))
  }
  function syntax(body, identifiers = {}) {
    const source = parse(body)
    const edits = []
    function visit(node) {
      if (ts.isIdentifier(node) && Object.hasOwn(identifiers, node.text)) {
        const parent = node.parent
        if (
          !(
            parent.name === node &&
            (ts.isPropertyAccessExpression(parent) || ts.isPropertyAssignment(parent))
          )
        )
          edits.push([node.getStart(source), node.end, identifiers[node.text]])
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
    for (const [start, end, replacement] of edits.sort((a, b) => b[0] - a[0]))
      body = body.slice(0, start) + replacement + body.slice(end)
    function tree(node) {
      const children = []
      ts.forEachChild(node, (child) => {
        children.push(tree(child))
      })
      return [node.kind, node.flags, node.text ?? null, children]
    }
    return JSON.stringify(tree(parse(body)))
  }
  const key = (entry) => `${entry.file}#${JSON.stringify(entry.titles)}#${entry.template}`
  const identities = []
  for (const entry of retirements) {
    const old = cases(frozen[entry.old.file])[entry.old.ordinal]
    assert.ok(old)
    assert.equal(sha(old.node.arguments[1].getText(old.source)), entry.old.callbackSha256)
    assert.equal([...old.titles, old.template].join(' '), entry.old.fullName)
    assert.ok(registrations.some((mapping) => key(mapping.current) === key(entry.current)))
    const survivor = cases(current[entry.current.file]).find(
      (test) => key({ ...test, file: entry.current.file }) === key(entry.current),
    )
    assert.ok(survivor)
    assert.equal([...survivor.titles, survivor.template].join(' '), entry.current.fullName)
    assert.ok(entry.reason.length > 0 && entry.inputEquivalence.length > 0)
    const bindings = (test) =>
      new Set(
        test.node.arguments[1].body.statements
          .filter(ts.isVariableStatement)
          .flatMap((statement) =>
            statement.declarationList.declarations.map((declaration) => declaration.name.getText()),
          ),
      )
    for (const [before, after] of Object.entries(entry.identifierRenames)) {
      assert.ok(bindings(old).has(before) && bindings(survivor).has(after))
      assert.equal(typeof after, 'string')
    }
    const available = assertions(survivor).map((body) => syntax(body))
    const previous = assertions(old)
    assert.equal(previous.length, entry.old.assertionStatements)
    for (const body of previous) {
      const index = available.indexOf(syntax(body, entry.identifierRenames))
      assert.ok(index >= 0, 'A retired assertion is missing or weakened')
      available.splice(index, 1)
    }
    identities.push({ file: entry.old.file, fullName: entry.old.fullName })
  }
  assert.equal(new Set(identities.map((x) => `${x.file}\0${x.fullName}`)).size, identities.length)
  return identities
}
