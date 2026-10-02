import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import ts from 'typescript'
import { instrumentKitchenTrace, KITCHEN_TRACE_TARGETS } from './kitchen-trace-plugin.mjs'

export const MEAL_TRACE_TARGETS = [
  ...KITCHEN_TRACE_TARGETS,
  'packages/reforge/src/menu/menu-session.ts',
  'packages/game/src/core/save/api.ts',
]

/** Read-only insertions in an owned serve instance. Never replace a production effect or input. */
export function instrumentMealTrace(source, file) {
  assert(MEAL_TRACE_TARGETS.includes(file), 'unexpected meal trace source')
  const result =
    file.endsWith('/menu-session.ts') || file.endsWith('/game/src/core/save/api.ts')
      ? { code: source, anchors: {} }
      : instrumentKitchenTrace(source, file)
  result.code = result.code.replaceAll('__kitchen', '__meal')
  result.code = result.code
    .replaceAll("['e19','e20','e24','e25','e26']", "['e15','e16','e19','e20','e24','e25','e26']")
    .replaceAll("['e19','e20']", "['e15','e16','e19','e20','e24','e25','e26']")
    .replace(
      'sprite:e.sprite??e.actor??null',
      'sprite:e.sprite??e.actor??null,frame:worldPresentation.entityFrame(id)??entityActions.frame(id)??0',
    )
  const ast = ts.createSourceFile(file, result.code, ts.ScriptTarget.Latest, true)
  const edits = [],
    anchors = []
  const walk = (node) => {
    if (
      file.endsWith('/reforge/src/main.ts') &&
      ts.isIfStatement(node) &&
      node.expression.getText(ast) === 'dither.output'
    ) {
      assert.equal(
        node.thenStatement.getText(ast),
        'ctx.putImageData(dither.output, 0, 0)',
        'meal dither actual output anchor changed',
      )
      const block = node.parent
      assert(
        ts.isBlock(block) &&
          ts.isIfStatement(block.parent) &&
          block.parent.expression.getText(ast) === 'dither',
        'meal dither render owner changed',
      )
      // The inherited isolated renderer hook wraps its body in try/finally. Resolve the
      // lexical function, not a guessed number of parent blocks from transformed source.
      let owner = block.parent
      while (owner && !ts.isFunctionLike(owner)) owner = owner.parent
      assert(
        ts.isFunctionDeclaration(owner) &&
          owner.name?.text === 'render' &&
          !owner.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword),
        'meal dither synchronous render owner changed',
      )
      const step = block.statements.filter(
        (s) =>
          ts.isVariableStatement(s) &&
          s.declarationList.declarations.some(
            (d) =>
              d.name.getText(ast) === 'step' &&
              d.initializer?.getText(ast) === 'Math.floor(pr * DITHER_TOTAL_STEPS)',
          ),
      )
      assert.equal(step.length, 1, 'meal dither step anchor changed')
      assert(step[0].end < node.getStart(ast), 'dither sampled before output step')
      anchors.push('actualReforgeDitherOutput')
      edits.push({
        at: node.end,
        text: '\nif(dither.output) globalThis.__mealDither?.({pr,step,prepareMs:dither.prepareMs,startedAt:dither.startedAt,durationMs:dither.durationMs,isZeroFrame});\n',
      })
    }
    if (
      file.endsWith('/game/src/core/save/api.ts') &&
      ts.isMethodDeclaration(node) &&
      node.name.getText(ast) === 'saveSlot'
    ) {
      assert(
        ts.isObjectLiteralExpression(node.parent) &&
          ts.isVariableDeclaration(node.parent.parent) &&
          node.parent.parent.name.getText(ast) === 'Save',
        'meal save input owner changed',
      )
      assert.deepEqual(
        node.parameters.map((p) => p.name.getText(ast)),
        ['slot', 'gs'],
        'meal save input parameters changed',
      )
      const statements = node.body.statements
      const meta = statements.filter(
        (s) =>
          ts.isVariableStatement(s) &&
          s.declarationList.declarations.some(
            (d) =>
              d.name.getText(ast) === 'meta' && d.initializer?.getText(ast) === 'extractMeta(gs)',
          ),
      )
      assert.equal(meta.length, 1, 'meal save input meta anchor changed')
      const metaIndex = statements.indexOf(meta[0])
      assert(
        metaIndex > 0 && statements[0].getText(ast).includes('slot < 1 || slot > MAX_SAVE_SLOTS'),
        'meal save slot validation moved',
      )
      const clones = []
      const census = (child) => {
        assert(!ts.isReturnStatement(child), 'meal save method gained an early return')
        if (ts.isCallExpression(child) && child.expression.getText(ast) === 'deepClone') {
          assert.deepEqual(
            child.arguments.map((argument) => argument.getText(ast)),
            ['gs'],
            'meal save cloned another source',
          )
          clones.push(child)
        }
        ts.forEachChild(child, census)
      }
      census(node.body)
      assert.equal(clones.length, 2, 'meal save deepClone census changed')
      const noAwait = (child) => {
        assert(!ts.isAwaitExpression(child), 'meal save pre-clone capture became asynchronous')
        ts.forEachChild(child, noAwait)
      }
      for (const statement of statements.slice(0, metaIndex + 1)) noAwait(statement)
      assert(
        clones.every((clone) => clone.getStart(ast) > meta[0].end),
        'meal save clone preceded observation anchor',
      )
      anchors.push('actualGameSaveInput')
      edits.push({
        at: meta[0].getStart(ast),
        text: 'const __mealSaveCapture = globalThis.__mealGameSaving?.(slot,gs);\n',
      })
      edits.push({
        at: node.body.end - 1,
        text: '\nglobalThis.__mealGameSaved?.(__mealSaveCapture);\n',
      })
    }
    if (
      file.endsWith('/reforge/src/main.ts') &&
      ts.isCallExpression(node) &&
      node.expression.getText(ast) === 'activeScene.commit'
    ) {
      assert.equal(node.arguments.length, 1, 'meal scene materialization arguments changed')
      assert.equal(
        node.arguments[0].getText(ast),
        'plan',
        'meal scene materialization plan changed',
      )
      const statement = node.parent
      assert(
        ts.isExpressionStatement(statement),
        'meal scene materialization is not a direct statement',
      )
      const block = statement.parent,
        owner = block.parent
      assert(
        ts.isBlock(block) &&
          ts.isFunctionDeclaration(owner) &&
          owner.name?.text === 'commitSceneSwitch' &&
          owner.body === block,
        'meal scene materialization owner changed',
      )
      const noAwait = (child) => {
        assert(
          !ts.isAwaitExpression(child),
          'meal scene materialization commit became asynchronous',
        )
        ts.forEachChild(child, noAwait)
      }
      noAwait(owner.body)
      anchors.push('actualSceneMaterialization')
      // Successful synchronous scene replacement is a real placement commit. Do not move this
      // into finally: a throwing engine commit must remain a failed run, not a successful sample.
      edits.push({ at: statement.end, text: '\n__openingPoint("commit:scene-materialization");\n' })
    }
    if (
      file.endsWith('/reforge/src/main.ts') &&
      ts.isIfStatement(node) &&
      node.expression.getText(ast) === 'menus.active'
    ) {
      assert(ts.isBlock(node.thenStatement), 'meal menu rendering body changed')
      const body = node.thenStatement.getText(ast)
      if (body.includes('drawUseMenu(') && body.includes('menus.view')) {
        anchors.push('actualReforgeMenuRender')
        edits.push({
          at: node.getStart(ast),
          text: `globalThis.__mealMenu?.('reforge', {
          active: menus.active, panel: menus.view.menu.openPanel??null,
          levels: menus.view.menu.stack.map(level=>({ids:level.nodes.map(n=>n.id),labels:level.nodes.map(n=>n.label),cursor:level.cursor})),
          phase:menus.view.useMenu.phase, cursor:menus.view.useMenu.cursor,
          itemIds:menus.view.useMenu.items.map(item=>item.id), selectedItemId:menus.view.useMenu.selectedItemId??null
        });\n`,
        })
      }
    }
    if (
      file.endsWith('/menu-session.ts') &&
      ts.isMethodDeclaration(node) &&
      node.name.getText(ast) === 'dispatchItemUse'
    ) {
      assert(ts.isBlock(node.body), 'meal dispatch body changed')
      anchors.push('actualReforgeItemDispatch')
      edits.push({
        at: node.body.getStart(ast) + 1,
        text: "\nglobalThis.__mealDispatch?.('reforge',{itemId:request.itemId,targetCharId:request.targetCharId,origin:request.origin});\n",
      })
    }
    if (
      file.endsWith('/game/src/core/event-system.ts') &&
      ts.isFunctionDeclaration(node) &&
      node.name?.text === 'startOverworldItemScript'
    ) {
      assert(ts.isBlock(node.body), 'meal game use body changed')
      anchors.push('actualGameItemDispatch')
      edits.push({
        at: node.body.getStart(ast) + 1,
        text: "\nglobalThis.__mealDispatch?.('game',{itemId:String(itemId),scriptOnUse,targetRoleIdOrAll,consuming});\n",
      })
    }
    ts.forEachChild(node, walk)
  }
  walk(ast)
  const expected = file.endsWith('/reforge/src/main.ts')
    ? ['actualSceneMaterialization', 'actualReforgeMenuRender', 'actualReforgeDitherOutput']
    : file.endsWith('/menu-session.ts')
      ? ['actualReforgeItemDispatch']
      : file.endsWith('/game/src/core/event-system.ts')
        ? ['actualGameItemDispatch']
        : file.endsWith('/game/src/core/save/api.ts')
          ? ['actualGameSaveInput']
          : []
  assert.deepEqual(anchors, expected, 'meal actual menu/dispatch census changed')
  for (const edit of edits.sort((a, b) => b.at - a.at))
    result.code = result.code.slice(0, edit.at) + edit.text + result.code.slice(edit.at)
  for (const name of anchors) result.anchors[name] = 1
  assert.equal(
    ts.createSourceFile(file, result.code, ts.ScriptTarget.Latest, true).parseDiagnostics.length,
    0,
  )
  return result
}

export function mealTracePlugin() {
  return {
    name: 'isolated-meal-commit-trace',
    enforce: 'pre',
    apply: 'serve',
    transform(code, id) {
      const file = MEAL_TRACE_TARGETS.find((file) => id.endsWith(`/${file}`))
      if (!file) return null
      const result = instrumentMealTrace(code, file)
      console.log(
        '[meal-trace]',
        JSON.stringify({
          file,
          sha256: createHash('sha256').update(code).digest('hex'),
          anchors: result.anchors,
        }),
      )
      return { code: result.code, map: null }
    },
  }
}
