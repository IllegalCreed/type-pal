import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('../../../../../', import.meta.url))
const ts = createRequire(resolve(root, 'package.json'))('typescript')
const printer = ts.createPrinter({ removeComments: true })
const base = '5ef8b0a8c7dfed8cd4269b99bd926692087fdb13'
const before = (path) =>
  execFileSync('git', ['show', `${base}:${path}`], { cwd: root, encoding: 'utf8' })
const current = (path) => readFileSync(resolve(root, path), 'utf8')
const parse = (text) => ts.createSourceFile('source.ts', text, ts.ScriptTarget.Latest, true)
const sha = (text) => createHash('sha256').update(text).digest('hex')
const removed = new Set([
  'pageUp',
  'pageDown',
  'findNextSelectable',
  'createConfirmMenu',
  'toggleConfirm',
  'createTripleMenu',
  'moveTripleUp',
  'moveTripleDown',
  'createSwitchMenu',
  'switchLeft',
  'switchRight',
  'ConfirmMenuState',
  'TripleMenuState',
  'SwitchMenuState',
  'createItemSelectMenu',
  'sellPrice',
  'ItemDisplayMode',
  'ItemSelectMenuConfig',
  'currentRoleId',
  'makeEquipMenuEntry',
])
const arities = {
  tickMenu: 2,
  dispatchMenuInput: 2,
  dispatchInventoryMenu: 3,
  dispatchEquipMenu: 3,
  dispatchInGameMagicMenu: 3,
  dispatchSaveSlotMenu: 3,
  confirmEquipItem: 2,
  openPick: 2,
}
const callName = (node) =>
  ts.isIdentifier(node)
    ? node.text
    : ts.isPropertyAccessExpression(node)
      ? node.name.text
      : undefined
function normalized(text) {
  const ast = parse(text)
  const result = ts.transform(ast, [
    (context) => {
      const visit = (node) => {
        if (ts.isImportDeclaration(node)) return undefined
        if (
          (ts.isFunctionDeclaration(node) ||
            ts.isInterfaceDeclaration(node) ||
            ts.isTypeAliasDeclaration(node)) &&
          removed.has(node.name?.text)
        )
          return undefined
        node = ts.visitEachChild(node, visit, context)
        if (ts.isCallExpression(node) && arities[callName(node.expression)]) {
          return ts.factory.updateCallExpression(
            node,
            node.expression,
            node.typeArguments,
            node.arguments.slice(0, arities[callName(node.expression)]),
          )
        }
        if (ts.isFunctionDeclaration(node) && arities[node.name?.text]) {
          return ts.factory.updateFunctionDeclaration(
            node,
            node.modifiers,
            node.asteriskToken,
            node.name,
            node.typeParameters,
            node.parameters.slice(0, arities[node.name.text]),
            node.type,
            node.body,
          )
        }
        return node
      }
      return (source) => ts.visitNode(source, visit)
    },
  ])
  const printed = printer.printFile(result.transformed[0])
  result.dispose()
  return printed
}
function imports(text) {
  return parse(text)
    .statements.filter(ts.isImportDeclaration)
    .flatMap((n) => {
      const target = n.moduleSpecifier.text
      const clause = n.importClause
      if (!clause) return [target]
      return [
        clause.name?.text,
        ...(clause.namedBindings && ts.isNamedImports(clause.namedBindings)
          ? clause.namedBindings.elements.map(
              (e) => `${e.propertyName?.text ?? e.name.text}:${e.name.text}`,
            )
          : []),
      ]
        .filter(Boolean)
        .map((name) => `${target}:${name}`)
    })
}
const products = [
  'core/menu/primitives.ts',
  'core/menu/item-select.ts',
  'core/menu/player-status.ts',
  'core/menu/equip-menu.ts',
  'core/menu/menu-driver.ts',
  'core/menu/menu-mode.ts',
  'core/mode.ts',
]
for (const relative of products) {
  const path = `packages/game/src/${relative}`
  for (const node of parse(current(path)).statements) {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node)
    ) {
      assert(!removed.has(node.name?.text), `${path}: retired declaration returned`)
    }
    if (ts.isFunctionDeclaration(node) && arities[node.name?.text]) {
      assert.equal(node.parameters.length, arities[node.name.text], path)
    }
  }
  assert.equal(normalized(before(path)), normalized(current(path)), path)
  const oldImports = new Set(imports(before(path)))
  for (const item of imports(current(path)))
    assert(oldImports.has(item), `${path}: changed import ${item}`)
}
const tests = [
  'core/menu/menu-mode.test.ts',
  'core/menu/shop-menu.test.ts',
  'core/menu/menu-driver.test.ts',
  'core/menu/equip-menu.test.ts',
  'core/menu/equip-menu.boundaries.test.ts',
  'core/menu/equip-menu.glm-phase1-leaves.test.ts',
  'core/menu/menu-save-chain.glm-msio.test.ts',
  'core/battle/__tests__/battle-system.test.ts',
  'core/dependency-ownership.test.ts',
  'localization/presentation.test.ts',
  'present/__tests__/grok-present/p03-equip.test.ts',
  'present/__tests__/grok-present/p05-menu-stack.test.ts',
  'present/menu/draw-equip.glm-phase1-leaves.test.ts',
  'present/menu/equip-role-pixels.grok-r1.test.ts',
  'shell/menu-input-lock.glm-msio.test.ts',
]
function expects(text) {
  const ast = parse(normalized(text)),
    result = []
  function isExpectation(expression) {
    if (ts.isAwaitExpression(expression)) return isExpectation(expression.expression)
    if (ts.isCallExpression(expression))
      return (
        (ts.isIdentifier(expression.expression) && expression.expression.text === 'expect') ||
        isExpectation(expression.expression)
      )
    if (ts.isPropertyAccessExpression(expression)) return isExpectation(expression.expression)
    return false
  }
  function visit(node) {
    if (ts.isExpressionStatement(node) && isExpectation(node.expression)) {
      result.push(printer.printNode(ts.EmitHint.Unspecified, node, ast))
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  return result
}
for (const relative of tests) {
  const path = `packages/game/src/${relative}`
  assert.deepEqual(expects(before(path)), expects(current(path)), `${path}: assertion changed`)
}
const { makeRole } = await import(
  pathToFileURL(resolve(root, 'packages/game/src/__tests__/coverage85-glm-game/harness.ts')).href
)
const fixture = 'packages/game/src/core/menu/__tests__/item-magic-select.test.ts'
function roleValue(text) {
  const ast = parse(text)
  let value
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'playerRoles')
      value = node.initializer.getText(ast)
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert(value)
  const js = ts.transpileModule(`const result = ${value}`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText
  return new Function('makeRole', `${js};return result`)(makeRole)
}
assert.deepEqual(roleValue(before(fixture)), roleValue(current(fixture)))
const policy = 'scripts/coverage/approved-test-retirements.mjs'
function predicate(text) {
  const ast = parse(text)
  const fn = ast.statements.find(
    (s) => ts.isFunctionDeclaration(s) && s.name?.text === 'isApprovedTestRetirement',
  )
  assert(fn)
  return printer.printNode(ts.EmitHint.Unspecified, fn, ast)
}
assert.equal(predicate(before(policy)), predicate(current(policy)))
console.log(
  JSON.stringify({
    state: 'MATCH',
    base,
    products: products.length,
    assertionFiles: tests.length,
    roleFixturePreserved: true,
    retirementPredicateUnchanged: true,
    sourcePins: [...products, ...tests].map((p) => ({
      path: `packages/game/src/${p}`,
      sha256: sha(current(`packages/game/src/${p}`)),
    })),
  }),
)
