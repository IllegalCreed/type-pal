const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  cp = require('node:child_process'),
  crypto = require('node:crypto'),
  ts = require(`${process.cwd()}/node_modules/typescript`)
const base = '2ccbffd0ecce117a5dad957bef85e9fc3dfe5496',
  root = 'packages/game/src/dev/dev-panel.ts',
  paths = [
    root,
    'packages/game/src/dev/dev-scene-panel.ts',
    'packages/game/src/dev/dev-party-panel.ts',
    'packages/game/src/dev/dev-indexed-image.ts',
  ],
  before = cp.execFileSync('git', ['show', `${base}:${root}`], { encoding: 'utf8' }),
  sources = paths.map((p) => fs.readFileSync(p, 'utf8'))
const parse = (s) => ts.createSourceFile('x.ts', s, ts.ScriptTarget.Latest, true),
  ast = sources.map(parse),
  oldAst = parse(before),
  js = (s) =>
    ts.transpileModule(s, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext },
    }).outputText,
  jast = sources.map((s) => parse(js(s))),
  oldJs = parse(js(before))
const fn = (a, name) => {
  const n = a.statements.find((n) => ts.isFunctionDeclaration(n) && n.name?.text === name)
  assert(n, name)
  return n
}
function shape(n, a) {
  if (ts.isParenthesizedExpression(n)) return shape(n.expression, a)
  if (ts.isEmptyStatement(n)) return null
  const children = []
  ts.forEachChild(n, (c) => {
    const s = shape(c, a)
    if (s !== null) children.push(s)
  })
  return children.length ? [n.kind, ...children] : [n.kind, n.getText(a)]
}
const statements = (a, n) => n.statements.map((x) => shape(x, a)).filter(Boolean),
  same = (a, x, b, y, label) => assert.deepEqual(shape(x, a), shape(y, b), label)
// All original model declarations/types and unrelated functions are retained, not just matched names.
const moved = ['togglePartyMembership', 'signedText', 'indexImageToCanvas']
for (const n of oldAst.statements) {
  if (ts.isFunctionDeclaration(n)) {
    const name = n.name.text
    if (name === 'openPicker' || moved.includes(name)) continue
    const narrow = {
      triggerEffectScript: 'EventInjectionDeps',
      triggerDialogStyleTest: 'EventInjectionDeps',
      triggerCaiyiFlyaway: 'CutsceneToolsDeps',
    }
    if (name in narrow) {
      const current = fn(ast[0], name)
      assert(!n.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword))
      assert.equal(current.parameters[0].type.getText(ast[0]), narrow[name])
      assert.equal(current.parameters.length, n.parameters.length)
      same(oldAst, n.body, ast[0], current.body, `${name} unchanged complete body`)
      for (let i = 1; i < n.parameters.length; i++)
        same(oldAst, n.parameters[i], ast[0], current.parameters[i], `${name} other parameter`)
    } else same(oldAst, n, ast[0], fn(ast[0], name), name)
  } else if (ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) {
    const match = ast[0].statements.find((x) => x.name?.text === n.name.text)
    assert(match)
    same(oldAst, n, ast[0], match, n.name.text)
  }
}
for (const [name, i] of [
  ['togglePartyMembership', 2],
  ['signedText', 2],
])
  same(oldAst, fn(oldAst, name), ast[i], fn(ast[i], name), name)
// The image helper only gains an internal module export; signature and whole body remain exact.
const imageOld = fn(oldAst, 'indexImageToCanvas'),
  imageNew = fn(ast[3], 'indexImageToCanvas')
assert.deepEqual(
  imageOld.parameters.map((n) => shape(n, oldAst)),
  imageNew.parameters.map((n) => shape(n, ast[3])),
)
same(oldAst, imageOld.body, ast[3], imageNew.body, 'image whole body')
// Preserve every other root global initializer; no hidden top-level effects may appear in the leaves.
for (const n of oldAst.statements.filter(ts.isVariableStatement)) {
  const names = n.declarationList.declarations.map((d) => d.name.getText(oldAst)).join(',')
  if (names === 'sceneThumbCache') continue
  const next = ast[0].statements.find(
    (x) =>
      ts.isVariableStatement(x) &&
      x.declarationList.declarations.map((d) => d.name.getText(ast[0])).join(',') === names,
  )
  assert(next, names)
  same(oldAst, n, ast[0], next, names)
}
const allowed = (a, names) =>
  a.statements.every(
    (n) =>
      ts.isImportDeclaration(n) ||
      ts.isTypeAliasDeclaration(n) ||
      (ts.isFunctionDeclaration(n) && names.includes(n.name.text)) ||
      (ts.isVariableStatement(n) &&
        n.declarationList.declarations.every((d) => d.name.getText(a) === 'sceneThumbCache')),
  )
assert(allowed(ast[1], ['mountDevScenePanel']))
assert(allowed(ast[2], ['togglePartyMembership', 'signedText', 'mountDevPartyPanel']))
assert(allowed(ast[3], ['indexImageToCanvas']))
const external = (a) =>
  a.statements
    .filter(ts.isImportDeclaration)
    .filter((n) => !n.importClause?.isTypeOnly && !n.moduleSpecifier.text.startsWith('./dev-'))
    .flatMap(
      (n) =>
        n.importClause.namedBindings?.elements
          .filter((e) => !e.isTypeOnly)
          .map((e) => `${n.moduleSpecifier.text} :: ${e.propertyName?.text ?? e.name.text}`) ?? [],
    )
assert.deepEqual(
  [...new Set(ast.flatMap(external))].sort(),
  [...new Set(external(oldAst))].sort(),
  'same external runtime dependencies, relocated to actual owners',
)
// Original section destination was one mutable local. No deferred closure may retain it.
const noDeferredBody = (node, depth = 0) => {
  if (depth > 0 && ts.isIdentifier(node) && node.text === 'body') {
    assert(
      ts.isPropertyAccessExpression(node.parent) && node.parent.name === node,
      'nested destination alias',
    )
  }
  const nextDepth = depth + (ts.isFunctionLike(node) ? 1 : 0)
  ts.forEachChild(node, (child) => noDeferredBody(child, nextDepth))
}
for (const name of [
  'mountBattleTools',
  'mountStoryTools',
  'mountInventoryTools',
  'mountEffectPlayers',
  'mountMusicTools',
])
  noDeferredBody(fn(jast[0], name).body)
noDeferredBody(fn(jast[1], 'mountDevScenePanel').body)
noDeferredBody(fn(jast[2], 'mountDevPartyPanel').body)
const currentOpen = fn(jast[0], 'openPicker'),
  scene = fn(jast[1], 'mountDevScenePanel'),
  party = fn(jast[2], 'mountDevPartyPanel')
const raw = (n, a) => n.getText(a),
  body = (name) =>
    fn(jast[0], name)
      .body.statements.map((n) => raw(n, jast[0]))
      .join('\n')
const sceneStatements = [...scene.body.statements],
  boundary = sceneStatements.findIndex(
    (n) =>
      ts.isVariableStatement(n) &&
      n.declarationList.declarations[0]?.name.getText(jast[1]) === 'sceneH',
  )
assert(boundary > 0)
assert.equal(sceneStatements.at(-1).getText(jast[1]), 'return cleanupPicker;')
const init = sceneStatements
  .slice(0, boundary)
  .map((n) => raw(n, jast[1]))
  .join('\n')
let sceneBody = sceneStatements
    .slice(boundary, -1)
    .map((n) => raw(n, jast[1]))
    .join('\n'),
  callback
const sections = new Map([
  ['mountBattleTools', 'tabBattle'],
  ['mountStoryTools', 'tabEffect'],
  ['mountInventoryTools', 'tabSystem'],
  ['mountEffectPlayers', 'tabEffect'],
  ['mountMusicTools', 'tabSystem'],
])
const expanded = []
for (const [i, n] of currentOpen.body.statements.entries()) {
  if (i === 1) expanded.push(init)
  if (
    ts.isVariableStatement(n) &&
    n.declarationList.declarations[0]?.name.getText(jast[0]) === 'cleanupPicker'
  ) {
    const call = n.declarationList.declarations[0].initializer
    assert(ts.isCallExpression(call))
    assert.equal(call.expression.getText(jast[0]), 'mountDevScenePanel')
    assert.deepEqual(
      call.arguments.slice(0, 2).map((n) => raw(n, jast[0])),
      ['tabScene', 'deps'],
    )
    callback = call.arguments[2]
    assert(ts.isArrowFunction(callback))
    assert.equal(callback.parameters.length, 1)
    assert.equal(callback.parameters[0].name.getText(jast[0]), 'jump')
    const a = parse(sceneBody),
      edits = []
    const visit = (x) => {
      if (
        ts.isCallExpression(x) &&
        ts.isPropertyAccessExpression(x.expression) &&
        x.expression.name.text === 'addEventListener' &&
        x.expression.expression.getText(a) === 'card' &&
        x.arguments[0]?.text === 'click'
      ) {
        const arrow = x.arguments[1]
        assert(ts.isArrowFunction(arrow) && ts.isCallExpression(arrow.body))
        assert.equal(arrow.body.expression.getText(a), 'onSelect')
        edits.push({
          a: arrow.getStart(a),
          b: arrow.end,
          text: `() => ${raw(callback.body, jast[0])}`,
        })
      }
      ts.forEachChild(x, visit)
    }
    visit(a)
    assert.equal(edits.length, 1)
    for (const e of edits.sort((a, b) => b.a - a.a))
      sceneBody = sceneBody.slice(0, e.a) + e.text + sceneBody.slice(e.b)
    expanded.push('body = tabScene;', sceneBody)
    continue
  }
  if (ts.isExpressionStatement(n) && ts.isCallExpression(n.expression)) {
    const call = n.expression,
      name = call.expression.getText(jast[0])
    if (sections.has(name)) {
      assert.deepEqual(
        call.arguments.map((n) => raw(n, jast[0])),
        [sections.get(name), 'deps'],
      )
      expanded.push(
        name === 'mountBattleTools' ? 'let body = tabBattle;' : `body = ${sections.get(name)};`,
        body(name),
      )
      continue
    }
    if (name === 'mountDevPartyPanel') {
      assert.deepEqual(
        call.arguments.map((n) => raw(n, jast[0])),
        ['tabParty', 'deps'],
      )
      expanded.push(
        'body = tabParty;',
        party.body.statements.map((n) => raw(n, jast[2])).join('\n'),
      )
      continue
    }
  }
  expanded.push(raw(n, jast[0]))
}
const reconstructed = parse(`function openPicker(deps) {\n${expanded.join('\n')}\n}`)
assert.deepEqual(
  statements(oldJs, fn(oldJs, 'openPicker').body),
  statements(reconstructed, fn(reconstructed, 'openPicker').body),
  'all openPicker executable statements after inverse responsibility expansion',
)
const exported = (a) =>
  a.statements
    .flatMap((n) =>
      ts.isExportDeclaration(n)
        ? (n.exportClause?.elements.map((e) => e.name.text) ?? [])
        : n.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
          ? n.name
            ? [n.name.text]
            : (n.declarationList?.declarations.map((d) => d.name.getText(a)) ?? [])
          : [],
    )
    .sort()
assert.deepEqual(exported(oldAst), exported(ast[0]), 'root public value/type names preserved')
const cache = (a) =>
  a.statements.find(
    (n) =>
      ts.isVariableStatement(n) &&
      n.declarationList.declarations[0].name.getText(a) === 'sceneThumbCache',
  )
same(oldAst, cache(oldAst), ast[1], cache(ast[1]), 'shared page-lifetime cache declaration')
for (const i of [1, 2, 3])
  for (const n of ast[i].statements.filter(ts.isImportDeclaration))
    if (n.moduleSpecifier.text === './dev-panel.js')
      assert(n.importClause.isTypeOnly, 'no runtime reverse dependency')
console.log(
  JSON.stringify(
    {
      base,
      rootUnrelatedFunctionsAndPublicTypesEqual: true,
      rootPublicNamesEqual: true,
      wholePickerAfterResponsibilityExpansionEqual: true,
      imageWholeBodyAndTypesEqual: true,
      sharedCacheDeclarationEqual: true,
      leafRuntimeReverseDependencies: 0,
      files: paths.map((path) => ({
        path,
        sha256: crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex'),
      })),
      limits:
        'AST/types/export equality proves bounded movement, not automatic A-H/quality. Scene init allocation moves later before first use; all initializers are local values/functions. Side-effect creation order, callback ownership and page lifecycle reviewed separately.',
    },
    null,
    2,
  ),
)
