import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import ts from 'typescript'
import { instrumentKitchenTrace, KITCHEN_TRACE_TARGETS } from './kitchen-trace-plugin.mjs'

export const MEAL_TRACE_TARGETS = [
  ...KITCHEN_TRACE_TARGETS,
  'packages/reforge/src/menu/menu-session.ts',
]

/** Read-only insertions in an owned serve instance. Never replace a production effect or input. */
export function instrumentMealTrace(source, file) {
  assert(MEAL_TRACE_TARGETS.includes(file), 'unexpected meal trace source')
  const result = file.endsWith('/menu-session.ts')
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
    ? ['actualReforgeMenuRender']
    : file.endsWith('/menu-session.ts')
      ? ['actualReforgeItemDispatch']
      : file.endsWith('/game/src/core/event-system.ts')
        ? ['actualGameItemDispatch']
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
