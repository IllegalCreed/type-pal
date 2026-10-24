import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { tsImport } from 'tsx/esm/api'
import ts from 'typescript'
import { instrumentMealTrace } from './meal-trace-plugin.mjs'

const file = 'packages/game/src/core/event-system.ts'
const source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')

// Execute the actual transformed declaration. Every called service and fixture is production
// code or the existing typed factory; no replacement interpreter or fake GS is supplied.
function dispatchFrom(code, services, host) {
  const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
  const declarations = ast.statements.filter(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'startOverworldItemScript',
  )
  assert.equal(declarations.length, 1)
  const original = declarations[0]
  const fn = ts.factory.updateFunctionDeclaration(
    original,
    original.modifiers?.filter((modifier) => modifier.kind !== ts.SyntaxKind.ExportKeyword),
    original.asteriskToken,
    original.name,
    original.typeParameters,
    original.parameters,
    original.type,
    original.body,
  )
  const declaration = ts.createPrinter().printNode(ts.EmitHint.Unspecified, fn, ast)
  const js = ts.transpileModule(declaration, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText
  return new Function(
    'getItemScriptEntry',
    'getItemObjectState',
    'resolveScriptLabel',
    'globalThis',
    `${js}\nreturn startOverworldItemScript;`,
  )(services.getItemScriptEntry, services.getItemObjectState, services.resolveScriptLabel, host)
}

test('004 Game dispatch observer executes with current Item input and effective OBJECT entry', async () => {
  // tsImport registers loader state; load these related modules sequentially.
  const { createInitialGameState, loadDefaultGame } = await tsImport(
    '../../packages/game/src/core/game-state.ts',
    import.meta.url,
  )
  const catalog = await tsImport('../../packages/game/src/core/script-catalog.ts', import.meta.url)
  const objects = await tsImport(
    '../../packages/game/src/core/object-script-state.ts',
    import.meta.url,
  )
  const fixtures = await tsImport(
    '../../packages/game/src/core/__tests__/stats/stats-test-fixtures.ts',
    import.meta.url,
  )
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  loadDefaultGame(gs, fixtures.makePlayerRoles())
  const item = fixtures.makeItem({
    id: 272,
    _name: '测试消耗品',
    scriptOnUse: 1,
    flags: fixtures.makeItemFlags({
      usable: true,
      equipable: false,
      consuming: true,
      applyToAll: true,
      equipableBy: [false, false, false, false, false, false],
    }),
  })
  gs.inventory = [{ itemId: 272, count: 1 }]
  gs.fScriptSuccess = false
  objects.setItemScriptEntry(gs, item, 'scriptOnUse', 2)
  try {
    catalog.setGlobalEvents([
      { op: 'end' },
      { op: 'end', label: 'L_1' },
      { op: 'end', label: 'L_2' },
    ])
    const observations = []
    const dispatch = dispatchFrom(
      instrumentMealTrace(source, file).code,
      {
        ...objects,
        resolveScriptLabel: catalog.resolveScriptLabel,
      },
      {
        __mealDispatch: (engine, payload) => observations.push({ engine, payload, mode: gs.mode }),
      },
    )
    let accepted
    assert.doesNotThrow(() => {
      accepted = dispatch(gs, item, 0xffff)
    }, '合法物品的观察器不得中断真实分派')
    assert.equal(accepted, true)
    assert.deepEqual(observations, [
      {
        engine: 'game',
        mode: 'explore',
        payload: {
          itemId: '272',
          scriptOnUse: 2,
          targetRoleIdOrAll: 0xffff,
          consuming: true,
        },
      },
    ])
    assert.equal(gs.eventCursor.ip, 2)
    assert.equal(gs.eventCursor.currentEventObjectId, 0xffff)
    assert.equal(gs.pendingItemConsume, 272)
    assert.equal(gs.fScriptSuccess, true)
    assert.equal(gs.mode, 'event')
    assert.equal(item.scriptOnUse, 1)
  } finally {
    catalog.setGlobalEvents([])
  }
})

test('004 Game dispatch instrumentation rejects changed input or effective-entry anchors', () => {
  for (const [before, after] of [
    ['item: Item,', 'changedItem: Item,'],
    ["getItemScriptEntry(gs, item, 'scriptOnUse')", 'item.scriptOnUse'],
    ['const itemId = item.id', 'const itemId = item.bitmap'],
  ]) {
    assert(source.includes(before))
    assert.throws(
      () => instrumentMealTrace(source.replace(before, after), file),
      assert.AssertionError,
    )
  }
})
