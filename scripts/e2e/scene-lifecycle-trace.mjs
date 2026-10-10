import assert from 'node:assert/strict'
import ts from 'typescript'

export const SCENE_LIFECYCLE_TARGETS = [
  'packages/game/src/shell/bootstrap.ts',
  'packages/reforge/src/main.ts',
]

/** The actual successful load tail, before resumed automatic work can change state. */
export function instrumentGameRestore(code, file, hook) {
  const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true),
    functions = []
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'loadGameFromSlot')
      functions.push(node)
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.equal(functions.length, 1, 'actual game restore owner changed')
  const owner = functions[0],
    tail = owner.body.statements.slice(-3).map((s) => s.getText(ast))
  assert.deepEqual(
    tail,
    [
      'await loadSceneCommon(gs.wNumScene, { fromSavedGame: true })',
      'gs.palette = restoredPalette',
      'gs.needToFadeIn = true',
    ],
    'actual game restore successful tail changed',
  )
  const at = owner.body.end - 1
  return `${code.slice(0, at)}\nglobalThis.${hook}?.(gs);\n${code.slice(at)}`
}

/** Add evidence at the real scene/materialization callers, without changing their control flow. */
export function instrumentSceneLifecycle(code, file) {
  assert(SCENE_LIFECYCLE_TARGETS.includes(file), `unexpected scene lifecycle source ${file}`)
  const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
  assert.equal(ast.parseDiagnostics.length, 0)
  const edits = [],
    anchors = {}
  const insert = (at, text) => edits.push({ at, text })
  const count = (key) => {
    anchors[key] = (anchors[key] ?? 0) + 1
  }
  const game = file.endsWith('/shell/bootstrap.ts')
  const visit = (node) => {
    if (!game && ts.isFunctionDeclaration(node) && node.name?.text === 'applyWorldToScene') {
      count('worldProjection')
      insert(
        node.body.getStart(ast) + 1,
        '\n__openingPoint("before:scene-projection"); let __e2eProjectionFailed = false; try {\n',
      )
      // A normal early return still commits. A thrown projection must never publish readiness.
      insert(
        node.body.end - 1,
        '\n} catch (__e2eProjectionError) { __e2eProjectionFailed = true; throw __e2eProjectionError; } finally { __openingPoint(__e2eProjectionFailed ? "failed:scene-projection" : "commit:scene-ready"); }\n',
      )
    }
    if (
      !game &&
      ts.isExpressionStatement(node) &&
      node.expression.getText(ast) === 'activeScene.commit(plan, restoreActions)'
    ) {
      count('sceneMaterialized')
      insert(node.end, ';\n__openingPoint("commit:scene-materialized");\n')
    }
    if (game && ts.isFunctionDeclaration(node) && node.name?.text === 'loadSceneCommon') {
      count('loadSceneCommon')
      const statements = node.body.statements
      const materialized = statements.filter(
        (statement) =>
          ts.isExpressionStatement(statement) &&
          statement.expression.getText(ast) === 'applySceneAssetsToPresent(sceneAssets)',
      )
      const prepared = statements.filter(
        (statement) =>
          ts.isExpressionStatement(statement) &&
          statement.expression.getText(ast) === 'await ensurePlayerSpritesLoaded()',
      )
      assert.equal(materialized.length, 1, 'Game bound scene presentation commit changed')
      assert.equal(prepared.length, 1, 'Game scene resources-ready boundary changed')
      assert(statements.indexOf(materialized[0]) < statements.indexOf(prepared[0]))
      for (const [statement, phase] of [
        [materialized[0], 'materialized'],
        [prepared[0], 'ready'],
      ])
        insert(statement.end, `;\nglobalThis.__openingMatrixGame?.(gs,"commit:scene-${phase}");\n`)
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.deepEqual(
    anchors,
    game ? { loadSceneCommon: 1 } : { sceneMaterialized: 1, worldProjection: 1 },
    `scene lifecycle anchor census changed: ${file}`,
  )
  for (const edit of edits.sort((a, b) => b.at - a.at))
    code = code.slice(0, edit.at) + edit.text + code.slice(edit.at)
  assert.equal(
    ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true).parseDiagnostics.length,
    0,
  )
  return { code, anchors }
}
